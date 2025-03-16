-- DropForeignKey
ALTER TABLE "UserLeagueTransaction" DROP CONSTRAINT "UserLeagueTransaction_userId_fkey";

-- AlterTable
ALTER TABLE "UserLeagueTransaction" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "UserLeagueTransaction" ADD CONSTRAINT "UserLeagueTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
