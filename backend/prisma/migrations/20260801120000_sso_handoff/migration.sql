-- CreateTable
CREATE TABLE "SsoHandoff" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SsoHandoff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SsoHandoff_codeHash_key" ON "SsoHandoff"("codeHash");

-- CreateIndex
CREATE INDEX "SsoHandoff_email_index" ON "SsoHandoff"("email");

-- CreateIndex
CREATE INDEX "SsoHandoff_expiresAt_index" ON "SsoHandoff"("expiresAt");
