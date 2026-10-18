-- CreateTable
CREATE TABLE "StaffGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" "StaffPermission"[] DEFAULT ARRAY[]::"StaffPermission"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_StaffGroupToStaffUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_StaffGroupToStaffUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffGroup_name_key" ON "StaffGroup"("name");

-- CreateIndex
CREATE INDEX "_StaffGroupToStaffUser_B_index" ON "_StaffGroupToStaffUser"("B");

-- AddForeignKey
ALTER TABLE "_StaffGroupToStaffUser" ADD CONSTRAINT "_StaffGroupToStaffUser_A_fkey" FOREIGN KEY ("A") REFERENCES "StaffGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StaffGroupToStaffUser" ADD CONSTRAINT "_StaffGroupToStaffUser_B_fkey" FOREIGN KEY ("B") REFERENCES "StaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

