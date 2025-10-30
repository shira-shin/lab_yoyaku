import bcrypt from "bcryptjs";

import { prisma } from "../src/server/db/prisma";

async function main() {
  const email = process.env.AUTH_BOOTSTRAP_EMAIL;
  const password = process.env.AUTH_BOOTSTRAP_PASSWORD;

  if (!email || !password) {
    console.log("[ensure-admin] skipped, no bootstrap env");
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findFirst({
    where: { normalizedEmail },
  });

  const passwordHash = await bcrypt.hash(password, 10);

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        email,
        normalizedEmail,
        passwordHash,
      },
    });
    console.log("[ensure-admin] updated existing user", existing.id);
    return;
  }

  const created = await prisma.user.create({
    data: {
      email,
      normalizedEmail,
      passwordHash,
      name: "Bootstrap Admin",
    },
  });

  console.log("[ensure-admin] created user", created.id);
}

main()
  .catch((error) => {
    console.error("[ensure-admin] failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
