const { PrismaClient } = require("../src/generated/prisma");

const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('Convrse@123', 12);

    await prisma.admin.upsert({
        where: { email: 'techconvrse@gmail.com' },
        update: {},
        create: {
            email: 'techconvrse@gmail.com',
            password: hashedPassword,
            name: 'Tech Convrse'
        },

    })
    console.log('Admin seeded successfully');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());