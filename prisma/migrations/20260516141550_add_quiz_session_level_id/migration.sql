-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_QuizSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "levelId" TEXT NOT NULL DEFAULT 'visitor',
    "status" TEXT NOT NULL DEFAULT 'active',
    "score" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 20,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "QuizSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_QuizSession" ("completedAt", "id", "score", "startedAt", "status", "total", "userId") SELECT "completedAt", "id", "score", "startedAt", "status", "total", "userId" FROM "QuizSession";
DROP TABLE "QuizSession";
ALTER TABLE "new_QuizSession" RENAME TO "QuizSession";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
