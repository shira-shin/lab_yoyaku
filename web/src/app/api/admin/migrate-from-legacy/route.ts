export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

import { auth, normalizeEmail } from "@/lib/auth-legacy";
import { prisma } from "@/server/db/prisma";

async function isAdminUser(userId: string, email: string | null | undefined) {
  const membership = await prisma.groupMember.findFirst({
    where: { userId, role: { in: ["OWNER", "ADMIN"] } },
    select: { id: true },
  });
  if (membership) return true;

  const normalizedViewer = normalizeEmail(email);
  const smtpUser = normalizeEmail(process.env.SMTP_USER ?? null);
  return Boolean(normalizedViewer && smtpUser && normalizedViewer === smtpUser);
}

function extractNormalizedEmail(email: string | null | undefined) {
  const normalized = normalizeEmail(email);
  return normalized;
}

export async function POST() {
  const session = await auth();
  const viewer = session?.user;

  if (!viewer?.email || !viewer.id) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const allowed = await isAdminUser(viewer.id, viewer.email);
  if (!allowed) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  const legacyUrl = process.env.LEGACY_DATABASE_URL;
  if (!legacyUrl) {
    return NextResponse.json(
      { ok: false, reason: "LEGACY_DATABASE_URL_NOT_CONFIGURED" },
      { status: 400 },
    );
  }

  const legacy = new PrismaClient({ datasourceUrl: legacyUrl });

  try {
    const legacyUsers = await legacy.user.findMany({
      select: {
        id: true,
        email: true,
        normalizedEmail: true,
        name: true,
        passwordHash: true,
        emailVerified: true,
      },
    });

    const userIdMap = new Map<string, string>();
    let usersCreated = 0;
    let usersUpdated = 0;

    for (const legacyUser of legacyUsers) {
      const normalized =
        extractNormalizedEmail(legacyUser.normalizedEmail) ||
        extractNormalizedEmail(legacyUser.email);
      if (!normalized) continue;

      const existingUser = await prisma.user.findUnique({
        where: { normalizedEmail: normalized },
        select: { id: true },
      });

      const result = await prisma.user.upsert({
        where: { normalizedEmail: normalized },
        update: {
          email: legacyUser.email ?? undefined,
          name: legacyUser.name ?? undefined,
          passwordHash: legacyUser.passwordHash ?? undefined,
          emailVerified: legacyUser.emailVerified ?? undefined,
        },
        create: {
          email: legacyUser.email ?? normalized,
          normalizedEmail: normalized,
          name: legacyUser.name ?? null,
          passwordHash: legacyUser.passwordHash ?? null,
          emailVerified: legacyUser.emailVerified ?? undefined,
        },
        select: { id: true },
      });

      if (existingUser) {
        usersUpdated += 1;
      } else {
        usersCreated += 1;
      }
      userIdMap.set(normalized, result.id);
    }

    const legacyGroups = await legacy.group.findMany({
      include: { members: true },
    });

    let groupsCreated = 0;
    let groupsUpdated = 0;
    let membershipsUpserted = 0;

    for (const legacyGroup of legacyGroups) {
      const existingGroup = await prisma.group.findUnique({
        where: { slug: legacyGroup.slug },
        select: { id: true },
      });

      const target = await prisma.group.upsert({
        where: { slug: legacyGroup.slug },
        update: {
          name: legacyGroup.name ?? undefined,
          hostEmail: legacyGroup.hostEmail ?? undefined,
          passcode: legacyGroup.passcode ?? undefined,
          reserveFrom: legacyGroup.reserveFrom ?? undefined,
          reserveTo: legacyGroup.reserveTo ?? undefined,
          memo: legacyGroup.memo ?? undefined,
          deviceManagePolicy: legacyGroup.deviceManagePolicy ?? undefined,
          dutyManagePolicy: legacyGroup.dutyManagePolicy ?? undefined,
        },
        create: {
          slug: legacyGroup.slug,
          name: legacyGroup.name,
          hostEmail: legacyGroup.hostEmail,
          passcode: legacyGroup.passcode,
          reserveFrom: legacyGroup.reserveFrom,
          reserveTo: legacyGroup.reserveTo,
          memo: legacyGroup.memo,
          deviceManagePolicy: legacyGroup.deviceManagePolicy,
          dutyManagePolicy: legacyGroup.dutyManagePolicy,
        },
        select: { id: true, slug: true },
      });

      if (existingGroup) {
        groupsUpdated += 1;
      } else {
        groupsCreated += 1;
      }

      const normalizedHost = extractNormalizedEmail(legacyGroup.hostEmail);
      if (normalizedHost) {
        const hostUserId =
          userIdMap.get(normalizedHost) ||
          (await prisma.user.findUnique({
            where: { normalizedEmail: normalizedHost },
            select: { id: true },
          }))?.id;

        await prisma.groupMember.upsert({
          where: { groupId_email: { groupId: target.id, email: normalizedHost } },
          update: {
            role: "OWNER",
            ...(hostUserId ? { userId: hostUserId } : {}),
          },
          create: {
            groupId: target.id,
            email: normalizedHost,
            role: "OWNER",
            ...(hostUserId ? { userId: hostUserId } : {}),
          },
        });
        membershipsUpserted += 1;
      }

      for (const member of legacyGroup.members) {
        const normalizedMember = extractNormalizedEmail(member.email);
        if (!normalizedMember) continue;
        const memberUserId =
          userIdMap.get(normalizedMember) ||
          (await prisma.user.findUnique({
            where: { normalizedEmail: normalizedMember },
            select: { id: true },
          }))?.id;

        await prisma.groupMember.upsert({
          where: { groupId_email: { groupId: target.id, email: normalizedMember } },
          update: {
            role: member.role ?? undefined,
            ...(memberUserId ? { userId: memberUserId } : {}),
          },
          create: {
            groupId: target.id,
            email: normalizedMember,
            role: member.role ?? "MEMBER",
            ...(memberUserId ? { userId: memberUserId } : {}),
          },
        });
        membershipsUpserted += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      summary: {
        users: {
          processed: legacyUsers.length,
          mapped: userIdMap.size,
          created: usersCreated,
          updated: usersUpdated,
        },
        groups: {
          processed: legacyGroups.length,
          created: groupsCreated,
          updated: groupsUpdated,
        },
        memberships: membershipsUpserted,
      },
    });
  } catch (error: any) {
    console.error("[admin/migrate-from-legacy] failed", error);
    return NextResponse.json(
      { ok: false, reason: "migration_failed", error: error?.message ?? String(error) },
      { status: 500 },
    );
  } finally {
    await legacy.$disconnect().catch(() => undefined);
  }
}
