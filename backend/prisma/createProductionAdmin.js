import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_INIT_USERNAME;
  const password = process.env.ADMIN_INIT_PASSWORD;
  const fullName = process.env.ADMIN_INIT_FULL_NAME || 'Production Administrator';

  if (!username || !password) {
    throw new Error(
      'Set ADMIN_INIT_USERNAME and ADMIN_INIT_PASSWORD environment variables to create a production admin.'
    );
  }
  if (password.length < 12) {
    throw new Error('Production admin password must be at least 12 characters long.');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    throw new Error(`User "${username}" already exists.`);
  }

  const admin = await prisma.user.create({
    data: {
      username,
      passwordHash,
      fullName,
      role: 'ADMIN',
      baseId: null,
      isActive: true,
    },
    select: { id: true, username: true, role: true, createdAt: true },
  });

  console.log('Production administrator created:', admin);
}

main()
  .catch((err) => {
    console.error('Failed to create production admin:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
