-- AlterTable
ALTER TABLE "public"."Landmark" ADD COLUMN     "iconHeight" INTEGER DEFAULT 32,
ADD COLUMN     "iconWidth" INTEGER DEFAULT 32;

-- AlterTable
ALTER TABLE "public"."Project" ADD COLUMN     "clientBuildingIconHeight" INTEGER DEFAULT 40,
ADD COLUMN     "clientBuildingIconWidth" INTEGER DEFAULT 40;
