import 'dotenv/config';
import { PrismaClient, UserRole, Language } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const BRANDS = [
  'KTM',
  'Yamaha',
  'Honda',
  'Husqvarna',
  'Kawasaki',
  'Suzuki',
  'GasGas',
  'Beta',
  'Sherco',
  'TM Racing',
];

const PART_CATEGORIES = [
  'Engine',
  'Suspension',
  'Brakes',
  'Drive Train',
  'Electrical',
  'Tyres & Wheels',
  'Body & Plastics',
  'Exhaust',
  'Controls',
  'Fluids & Consumables',
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function seedBrands() {
  for (const name of BRANDS) {
    await prisma.brand.upsert({
      where: { name },
      update: {},
      create: { name, slug: slugify(name) },
    });
  }
  console.log(`✓ Seeded ${BRANDS.length} brands`);
}

async function seedCategories() {
  for (const name of PART_CATEGORIES) {
    await prisma.partCategory.upsert({
      where: { name },
      update: {},
      create: { name, slug: slugify(name) },
    });
  }
  console.log(`✓ Seeded ${PART_CATEGORIES.length} part categories`);
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@oldtrailbikes.lk';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!2026';
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: UserRole.ADMIN,
      fullName: 'Platform Admin',
      preferredLanguage: Language.EN,
      emailVerifiedAt: new Date(),
    },
    create: {
      email,
      passwordHash,
      fullName: 'Platform Admin',
      role: UserRole.ADMIN,
      preferredLanguage: Language.EN,
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`✓ Seeded admin user (${email}) — password matches SEED_ADMIN_PASSWORD`);
}

async function main() {
  console.log('Seeding OldTrailBikes database…');
  await seedBrands();
  await seedCategories();
  await seedAdmin();
  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
