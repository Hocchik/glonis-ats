require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error('SEED_ADMIN_PASSWORD no está configurada en .env');
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.usuario.upsert({
    where: { email: 'admin@glonis.pe' },
    update: {},
    create: {
      nombre: 'Admin Glonis',
      email: 'admin@glonis.pe',
      passwordHash,
      rol: 'ADMIN',
    },
  });

  console.log('Seed OK — admin@glonis.pe');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
