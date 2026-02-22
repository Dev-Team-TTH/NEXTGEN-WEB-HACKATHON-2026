-- CreateTable
CREATE TABLE "Assets" (
    "assetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "assignedTo" TEXT,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Assets_pkey" PRIMARY KEY ("assetId")
);
