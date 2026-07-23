import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const USERS = [
  { name: 'Stephan', email: 'stephan@sraccounting.local' },
  { name: 'Chanel', email: 'chanel@sraccounting.local' }
];

const DEFAULT_PASSWORD = 'Welcome123!';

async function main() {
  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash }
    });
  }

  console.log('Seed complete. Default password for both users:', DEFAULT_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
