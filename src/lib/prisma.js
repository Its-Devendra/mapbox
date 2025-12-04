import { PrismaClient } from "@/generated/prisma";

const globalPrisma = global;

// Database URL with fallback
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:Devendra@87@localhost:5432/mapbox_db?schema=public";

// Log the database connection status
if (!process.env.DATABASE_URL) {
    console.warn("⚠️  DATABASE_URL not found in environment variables. Using default connection string.");
}

export const prisma =
globalPrisma.prisma ||
new PrismaClient({
    datasources: {
        db: {
            url: DATABASE_URL
        }
    },
    log: ["query", "error", "warn"]
});

if (process.env.NODE_ENV !== "production") globalPrisma.prisma = prisma;