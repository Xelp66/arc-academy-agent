-- AlterTable
ALTER TABLE "QuestionDraft" ADD COLUMN "difficulty" TEXT;
ALTER TABLE "QuestionDraft" ADD COLUMN "modelUsed" TEXT;
ALTER TABLE "QuestionDraft" ADD COLUMN "questionHash" TEXT;
ALTER TABLE "QuestionDraft" ADD COLUMN "questionNormalized" TEXT;
ALTER TABLE "QuestionDraft" ADD COLUMN "sourceTopic" TEXT;
ALTER TABLE "QuestionDraft" ADD COLUMN "uniquenessReason" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "QuestionDraft_questionHash_key" ON "QuestionDraft"("questionHash");
