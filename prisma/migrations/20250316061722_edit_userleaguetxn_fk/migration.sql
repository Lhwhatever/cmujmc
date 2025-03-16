-- DropForeignKey
ALTER TABLE "UserLeagueTransaction" DROP CONSTRAINT "UserLeagueTransaction_userId_leagueId_fkey";

-- AlterTable
ALTER TABLE "UserLeagueTransaction" ADD COLUMN     "userLeagueLeagueId" INTEGER,
ADD COLUMN     "userLeagueUserId" TEXT;

-- AddForeignKey
ALTER TABLE "UserLeagueTransaction" ADD CONSTRAINT "UserLeagueTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLeagueTransaction" ADD CONSTRAINT "UserLeagueTransaction_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLeagueTransaction" ADD CONSTRAINT "UserLeagueTransaction_userLeagueLeagueId_userLeagueUserId_fkey" FOREIGN KEY ("userLeagueLeagueId", "userLeagueUserId") REFERENCES "UserLeague"("leagueId", "userId") ON DELETE SET NULL ON UPDATE CASCADE;
