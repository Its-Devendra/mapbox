-- AlterTable
ALTER TABLE "public"."Project" ADD COLUMN     "clientBuildingDescription" TEXT,
ADD COLUMN     "clientBuildingLat" DOUBLE PRECISION,
ADD COLUMN     "clientBuildingLng" DOUBLE PRECISION,
ADD COLUMN     "clientBuildingName" TEXT DEFAULT 'Client Building';
