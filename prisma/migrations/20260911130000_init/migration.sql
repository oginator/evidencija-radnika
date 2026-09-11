-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FurnitureType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pointsPerPiece" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FurnitureType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyEntry" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "hoursWorked" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssemblyLine" (
    "id" TEXT NOT NULL,
    "dailyEntryId" TEXT NOT NULL,
    "furnitureTypeId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "AssemblyLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectiveAssembly" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "furnitureTypeId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CollectiveAssembly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "rsdPerPoint" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "workdayHours" DOUBLE PRECISION NOT NULL DEFAULT 8,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "DailyEntry_date_idx" ON "DailyEntry"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyEntry_workerId_date_key" ON "DailyEntry"("workerId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AssemblyLine_dailyEntryId_furnitureTypeId_key" ON "AssemblyLine"("dailyEntryId", "furnitureTypeId");

-- CreateIndex
CREATE INDEX "CollectiveAssembly_date_idx" ON "CollectiveAssembly"("date");

-- CreateIndex
CREATE UNIQUE INDEX "CollectiveAssembly_date_furnitureTypeId_key" ON "CollectiveAssembly"("date", "furnitureTypeId");

-- AddForeignKey
ALTER TABLE "DailyEntry" ADD CONSTRAINT "DailyEntry_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssemblyLine" ADD CONSTRAINT "AssemblyLine_dailyEntryId_fkey" FOREIGN KEY ("dailyEntryId") REFERENCES "DailyEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssemblyLine" ADD CONSTRAINT "AssemblyLine_furnitureTypeId_fkey" FOREIGN KEY ("furnitureTypeId") REFERENCES "FurnitureType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectiveAssembly" ADD CONSTRAINT "CollectiveAssembly_furnitureTypeId_fkey" FOREIGN KEY ("furnitureTypeId") REFERENCES "FurnitureType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
