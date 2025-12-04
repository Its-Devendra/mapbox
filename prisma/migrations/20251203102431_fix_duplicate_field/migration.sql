-- AlterTable
ALTER TABLE "public"."Project" ADD COLUMN     "logo" TEXT,
ADD COLUMN     "logoHeight" INTEGER DEFAULT 40,
ADD COLUMN     "logoWidth" INTEGER DEFAULT 120;
