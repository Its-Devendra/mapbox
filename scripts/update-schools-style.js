/**
 * Script to update Schools & Colleges nearby places with color and size
 * Project ID: cmizsovkf0007enzksouduqjb
 * 
 * Run with: node scripts/update-schools-style.js
 */

const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

const PROJECT_ID = 'cmizsovkf0007enzksouduqjb';
const CATEGORY_NAME = 'Schools & Colleges';

// Style settings
const COLOR = '#133478';
const ICON_WIDTH = 60;
const ICON_HEIGHT = 60;

async function main() {
  console.log('Updating schools & colleges styling...\n');

  // Find the category
  const category = await prisma.category.findFirst({
    where: {
      projectId: PROJECT_ID,
      name: CATEGORY_NAME,
    },
  });

  if (!category) {
    console.error('Category not found!');
    return;
  }

  console.log(`Found category: ${category.id}\n`);

  // Update all nearby places in this category
  const result = await prisma.nearBy.updateMany({
    where: {
      projectId: PROJECT_ID,
      categoryId: category.id,
    },
    data: {
      color: COLOR,
      iconWidth: ICON_WIDTH,
      iconHeight: ICON_HEIGHT,
    },
  });

  console.log(`✅ Updated ${result.count} nearby places with:`);
  console.log(`   Color: ${COLOR}`);
  console.log(`   Icon Size: ${ICON_WIDTH}x${ICON_HEIGHT}`);
  console.log('\n✨ Done!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
