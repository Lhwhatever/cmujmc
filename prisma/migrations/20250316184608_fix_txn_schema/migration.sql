/*
  Warnings:

  - You are about to drop the column `userLeagueLeagueId` on the `UserLeagueTransaction` table. All the data in the column will be lost.
  - You are about to drop the column `userLeagueUserId` on the `UserLeagueTransaction` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserLeagueTransaction" DROP CONSTRAINT "UserLeagueTransaction_userLeagueLeagueId_userLeagueUserId_fkey";

-- AlterTable
ALTER TABLE "UserLeagueTransaction" DROP COLUMN "userLeagueLeagueId",
DROP COLUMN "userLeagueUserId";
