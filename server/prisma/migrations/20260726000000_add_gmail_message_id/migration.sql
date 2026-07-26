-- AlterTable
ALTER TABLE "client" DROP COLUMN "rate";

-- AlterTable
ALTER TABLE "reply" ADD COLUMN     "gmailMessageId" TEXT;

-- AlterTable
ALTER TABLE "ticket" ADD COLUMN     "gmailMessageId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "reply_gmailMessageId_key" ON "reply"("gmailMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_gmailMessageId_key" ON "ticket"("gmailMessageId");
