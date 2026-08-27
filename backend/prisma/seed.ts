import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@ferreteria.local';
  const name = process.env.SEED_ADMIN_NAME ?? 'Administrador';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'admin1234';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Seed: el usuario ADMIN "${email}" ya existe, no se crea de nuevo.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, name, passwordHash, role: Role.ADMIN },
  });
  console.log(`Seed: usuario ADMIN "${email}" creado.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
