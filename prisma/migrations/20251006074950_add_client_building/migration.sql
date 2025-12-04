-- CreateTable
CREATE TABLE "public"."ClientBuilding" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🏢',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientBuilding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientBuilding_projectId_key" ON "public"."ClientBuilding"("projectId");

-- AddForeignKey
ALTER TABLE "public"."ClientBuilding" ADD CONSTRAINT "ClientBuilding_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
