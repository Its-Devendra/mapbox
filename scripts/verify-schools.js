/**
 * Script to verify Schools & Colleges nearby places data
 * Run with: node scripts/verify-schools.js
 */

const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

const PROJECT_ID = 'cmizsovkf0007enzksouduqjb';
const CATEGORY_NAME = 'Schools & Colleges';

async function main() {
  const category = await prisma.category.findFirst({
    where: {
      projectId: PROJECT_ID,
      name: CATEGORY_NAME,
    },
  });

  if (!category) {
    console.log('Category not found!');
    return;
  }

  const schools = await prisma.nearBy.findMany({
    where: {
      projectId: PROJECT_ID,
      categoryId: category.id,
    },
    select: {
      id: true,
      title: true,
      color: true,
      iconWidth: true,
      iconHeight: true,
    },
  });

  console.log('Schools & Colleges in database:\n');
  schools.forEach((s, i) => {
    console.log(`${i + 1}. ${s.title}`);
    console.log(`   Color: ${s.color || 'NOT SET'}`);
    console.log(`   Size: ${s.iconWidth || 'NOT SET'}x${s.iconHeight || 'NOT SET'}`);
    console.log('');
  });
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
