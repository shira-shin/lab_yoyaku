import { NextResponse } from "next/server";
import { cookies, headers as nextHeaders } from "next/headers";
import { decodeJwt } from "jose";
import { z } from "@/lib/zod-shim";
import { prisma } from "@/lib/prisma";

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
