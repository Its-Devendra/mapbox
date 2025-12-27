/**
 * Script to add Schools & Colleges to Nearby Places
 * Project ID: cmizsovkf0007enzksouduqjb
 * 
 * Run with: node scripts/add-schools-nearby.js
 */

const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

const PROJECT_ID = 'cmizsovkf0007enzksouduqjb';
const CATEGORY_NAME = 'Schools & Colleges';

// Schools and Colleges data
const schoolsData = [
  { title: 'Samashti International School', latitude: 17.453538271908588, longitude: 78.25030862124956 },
  { title: 'Gaudium International School', latitude: 17.493122991818545, longitude: 78.24605484092855 },
  { title: 'Birla Open Minds International School', latitude: 17.435309350378322, longitude: 78.26825940667666 },
  { title: 'Sancta Maria International School', latitude: 17.482463949122643, longitude: 78.31943562310042 },
  { title: 'Rockwell International School', latitude: 17.386787392549458, longitude: 78.3348836691265 },
  { title: 'Delhi Public School, Kollur', latitude: 17.44861802198345, longitude: 78.24101189796386 },
  { title: 'Epistemo Vikas Leadership School, Nallagandla', latitude: 17.46838169646295, longitude: 78.30475464399306 },
  { title: 'Kairos International School, Financial District', latitude: 17.435193333052645, longitude: 78.31986159557093 },
  { title: 'Indian School of Business (ISB)', latitude: 17.435638685286854, longitude: 78.34088325077059 },
  { title: 'University of Hyderabad', latitude: 17.45700308560898, longitude: 78.32694549372147 },
];

async function main() {
  console.log('Starting to add schools and colleges...\n');

  // Step 1: Find or create the "Schools & Colleges" category
  let category = await prisma.category.findFirst({
    where: {
      projectId: PROJECT_ID,
      name: CATEGORY_NAME,
    },
  });

  if (!category) {
    console.log(`Creating category "${CATEGORY_NAME}"...`);
    category = await prisma.category.create({
      data: {
        name: CATEGORY_NAME,
        projectId: PROJECT_ID,
        isActive: true,
      },
    });
    console.log(`✅ Created category: ${category.id}\n`);
  } else {
    console.log(`✅ Found existing category: ${category.id}\n`);
  }

  // Step 2: Add all schools as nearby places
  console.log('Adding nearby places...\n');

  for (const school of schoolsData) {
    // Check if already exists
    const existing = await prisma.nearBy.findFirst({
      where: {
        projectId: PROJECT_ID,
        title: school.title,
      },
    });

    if (existing) {
      console.log(`⏭️  Skipped (already exists): ${school.title}`);
      continue;
    }

    await prisma.nearBy.create({
      data: {
        projectId: PROJECT_ID,
        categoryId: category.id,
        title: school.title,
        latitude: school.latitude,
        longitude: school.longitude,
      },
    });

    console.log(`✅ Added: ${school.title}`);
  }

  console.log('\n✨ Done! All schools and colleges have been added.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
