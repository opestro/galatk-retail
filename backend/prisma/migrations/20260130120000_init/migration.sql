-- CreateTable
CREATE TABLE "Example" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- AddPrimaryKey
ALTER TABLE "Example" ADD CONSTRAINT "Example_pkey" PRIMARY KEY ("id");
