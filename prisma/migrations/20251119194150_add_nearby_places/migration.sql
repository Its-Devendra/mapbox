-- CreateTable
CREATE TABLE "public"."NearBy" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "categoryId" TEXT NOT NULL,
    "icon" TEXT,
    "iconWidth" INTEGER DEFAULT 32,
    "iconHeight" INTEGER DEFAULT 32,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NearBy_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."NearBy" ADD CONSTRAINT "NearBy_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NearBy" ADD CONSTRAINT "NearBy_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
