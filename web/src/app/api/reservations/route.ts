import { NextResponse } from "next/server";
import { cookies, headers as nextHeaders } from "next/headers";
import { decodeJwt } from "jose";
import type { Prisma } from "@prisma/client";
import { z } from "@/lib/zod-shim";
import { prisma } from "@/lib/prisma";
import { readUserFromCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateRangeFromDay(value: string | null): { from: Date; to: Date } | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [yearStr, monthStr, dayStr] = trimmed.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  const day = Number(dayStr);
  if ([year, month, day].some((n) => !Number.isFinite(n))) return null;
  const from = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  return { from, to };
}

const Body = z.object({
  groupSlug: z.string().min(1),
  deviceId: z.string().optional(),
  deviceSlug: z.string().optional(),
  start: z.string().min(1),
  end: z.string().min(1),
});

function parseFlexibleDate(input: string): Date {
  const s = (input ?? "").trim();
  const d = new Date(s);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${input}`);
  }
  return d;
}

/**
 * できるだけ既存の仕組みに寄せて、複数の取り出し口から userEmail を取得
 * - ヘッダ: x-user-email
 * - Cookie: userEmail / email
 * - Cookie の JWT: auth, auth_token, token, session, id_token, access_token, ly_session, lab_session, lab_auth
 */
function getUserEmailFromRequest(): string | null {
  try {
    const h = nextHeaders();
    const fromHeader = h.get("x-user-email") ?? h.get("x-user");
    if (fromHeader) return fromHeader;
  } catch {}

  try {
    const c = cookies();
    const direct =
      c.get("userEmail")?.value ?? c.get("email")?.value ?? null;
    if (direct) return direct;

    const jwtCookieKeys = [
      "auth",
      "auth_token",
      "token",
      "session",
      "id_token",
      "access_token",
      "ly_session",
      "lab_session",
      "lab_auth",
    ];

    for (const key of jwtCookieKeys) {
      const v = c.get(key)?.value;
      if (!v) continue;
      try {
        const payload: any = decodeJwt(v);
        const email =
          typeof payload?.email === "string"
            ? payload.email
            : typeof payload?.sub === "string" && payload.sub.includes("@")
            ? payload.sub
            : null;
        if (email) return email;
      } catch {
        // デコード失敗は無視して次へ
      }
    }
  } catch {}

  return null;
}

export async function GET(req: Request) {
  const me = await readUserFromCookie();
  if (!me?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const groupSlugRaw =
    (url.searchParams.get("groupSlug") ?? url.searchParams.get("group") ?? "").trim();
  if (!groupSlugRaw) {
    return NextResponse.json({ error: "groupSlug is required" }, { status: 400 });
  }
  const groupSlug = groupSlugRaw.toLowerCase();

  const group = await prisma.group.findUnique({
    where: { slug: groupSlug },
    include: { members: { select: { email: true } } },
  });

  if (!group) {
    return NextResponse.json({ error: "group not found" }, { status: 404 });
  }

  const normalizedEmail = me.email.toLowerCase();
  const isMember =
    group.hostEmail.toLowerCase() === normalizedEmail ||
    group.members.some((member) => member.email.toLowerCase() === normalizedEmail);

  if (!isMember) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const deviceSlugRaw =
    (url.searchParams.get("deviceSlug") ?? url.searchParams.get("device") ?? "").trim();
  const deviceSlug = deviceSlugRaw ? deviceSlugRaw.toLowerCase() : null;

  let from = parseDate(url.searchParams.get("from"));
  let to = parseDate(url.searchParams.get("to"));

  if (!from && !to) {
    const dayRange = parseDateRangeFromDay(url.searchParams.get("date"));
    if (dayRange) {
      from = dayRange.from;
      to = dayRange.to;
    }
  }

  if (from && to && from >= to) {
    return NextResponse.json({ error: "invalid range" }, { status: 400 });
  }

  const where: Prisma.ReservationWhereInput = {
    device: {
      groupId: group.id,
      ...(deviceSlug ? { slug: deviceSlug } : {}),
    },
  };

  const andConditions: Prisma.ReservationWhereInput[] = [];
  if (from) {
    andConditions.push({ end: { gt: from } });
  }
  if (to) {
    andConditions.push({ start: { lt: to } });
  }
  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  const reservations = await prisma.reservation.findMany({
    where,
    orderBy: { start: "asc" },
    include: {
      device: {
        select: {
          id: true,
          slug: true,
          name: true,
          group: { select: { slug: true, name: true } },
        },
      },
    },
  });

  const profileEmails = new Set<string>([
    group.hostEmail,
    ...group.members.map((member) => member.email),
    ...reservations.map((reservation) => reservation.userEmail),
  ]);

  const profiles = profileEmails.size
    ? await prisma.userProfile.findMany({
        where: { email: { in: Array.from(profileEmails) } },
      })
    : [];

  const displayNameMap = new Map(
    profiles.map((profile) => [profile.email, profile.displayName || ""])
  );

  const payload = reservations.map((reservation) => ({
    id: reservation.id,
    deviceId: reservation.deviceId,
    deviceSlug: reservation.device.slug,
    deviceName: reservation.device.name,
    groupSlug: reservation.device.group.slug,
    groupName: reservation.device.group.name ?? reservation.device.group.slug,
    start: reservation.start.toISOString(),
    end: reservation.end.toISOString(),
    purpose: reservation.purpose ?? null,
    reminderMinutes: reservation.reminderMinutes ?? null,
    userEmail: reservation.userEmail,
    userName:
      reservation.userName ||
      displayNameMap.get(reservation.userEmail) ||
      reservation.userEmail.split("@")[0],
    userId: reservation.userId ?? null,
  }));

  return NextResponse.json({ reservations: payload });
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const body = Body.parse(raw);

    // 必須: userEmail を取得（ReservationCreateInput で required）
    const userEmail = getUserEmailFromRequest();
    if (!userEmail) {
      return NextResponse.json(
        { error: "ログイン情報を取得できません（userEmail 不在）" },
        { status: 401 }
      );
    }

    // グループ解決
    const group = await prisma.group.findUnique({
      where: { slug: body.groupSlug },
      select: { id: true },
    });
    if (!group) {
      return NextResponse.json({ error: "グループが見つかりません" }, { status: 404 });
    }

    // デバイス特定（id / slug 両対応）＋ グループ所属チェック
    const device = await prisma.device.findFirst({
      where: {
        AND: [
          body.deviceId ? { id: body.deviceId } : {},
          body.deviceSlug ? { slug: body.deviceSlug } : {},
          { groupId: group.id },
        ],
      },
      select: { id: true },
    });
    if (!device) {
      return NextResponse.json(
        { error: "デバイスが見つからないか、指定グループ外です" },
        { status: 400 }
      );
    }

    const startAt = parseFlexibleDate(body.start);
    const endAt = parseFlexibleDate(body.end);
    if (!(startAt < endAt)) {
      return NextResponse.json(
        { error: "開始は終了より前である必要があります" },
        { status: 400 }
      );
    }

    // 同デバイス・時間重複チェック
    const overlap = await prisma.reservation.findFirst({
      where: {
        deviceId: device.id,
        NOT: [{ end: { lte: startAt } }],
        AND: [{ start: { lt: endAt } }],
      },
      select: { id: true },
    });
    if (overlap) {
      return NextResponse.json(
        { error: "同時間帯に既存の予約があります" },
        { status: 409 }
      );
    }

    // 作成: device は connect、必須の userEmail を保存
    const created = await prisma.reservation.create({
      data: {
        start: startAt,
        end: endAt,
        userEmail, // ★ これが必須だった
        device: { connect: { id: device.id } },
      },
      select: { id: true },
    });

    return NextResponse.json({ data: { id: created.id } }, { status: 201 });
  } catch (e: any) {
    const msg = e?.message ?? "予約作成に失敗しました";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
