-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Reward" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL DEFAULT 'legacy',
    "amount" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'eligible',
    "txHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Reward" ("amount", "createdAt", "id", "status", "txHash", "userId") SELECT "amount", "createdAt", "id", "status", "txHash", "userId" FROM "Reward";
DROP TABLE "Reward";
ALTER TABLE "new_Reward" RENAME TO "Reward";
CREATE UNIQUE INDEX "Reward_userId_missionId_key" ON "Reward"("userId", "missionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
