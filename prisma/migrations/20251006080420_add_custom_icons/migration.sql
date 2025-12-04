/*
  Warnings:

  - You are about to drop the `ClientBuilding` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."ClientBuilding" DROP CONSTRAINT "ClientBuilding_projectId_fkey";

-- AlterTable
ALTER TABLE "public"."Project" ADD COLUMN     "clientBuildingIcon" TEXT;

-- DropTable
DROP TABLE "public"."ClientBuilding";
