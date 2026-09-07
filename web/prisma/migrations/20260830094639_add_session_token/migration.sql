-- AlterTable
ALTER TABLE "Session" ADD COLUMN "token" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
