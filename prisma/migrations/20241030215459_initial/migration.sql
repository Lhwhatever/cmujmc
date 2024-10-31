-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'COMPLETE');

-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('SANMA', 'YONMA');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INITIAL', 'MATCH_RESULT', 'CHOMBO', 'OTHER_MOD');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "displayName" TEXT,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "admin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "andrew" TEXT,
    "discord" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" SERIAL NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "eventId" INTEGER,
    "rulesetId" INTEGER NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMatch" (
    "matchId" INTEGER NOT NULL,
    "playerPosition" INTEGER NOT NULL,
    "playerId" TEXT,
    "unregisteredPlaceholder" TEXT,
    "rawScore" INTEGER,
    "placementMin" INTEGER,
    "placementMax" INTEGER,
    "chombos" INTEGER,

    CONSTRAINT "UserMatch_pkey" PRIMARY KEY ("matchId","playerPosition")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" SERIAL NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "closingDate" TIMESTAMP(3),
    "rulesetId" INTEGER NOT NULL,
    "parentId" INTEGER NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "League" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "invitational" BOOLEAN NOT NULL,
    "defaultRuleId" INTEGER NOT NULL,
    "startingPoints" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "startDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "matchesRequired" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ruleset" (
    "id" SERIAL NOT NULL,
    "gameMode" "GameMode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "payload" JSONB NOT NULL,
    "startPts" INTEGER NOT NULL,
    "returnPts" INTEGER NOT NULL,
    "chomboDelta" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "Ruleset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RulesetUma" (
    "parentId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "RulesetUma_pkey" PRIMARY KEY ("parentId","position")
);

-- CreateTable
CREATE TABLE "UserLeague" (
    "userId" TEXT NOT NULL,
    "leagueId" INTEGER NOT NULL,
    "freeChombos" INTEGER,

    CONSTRAINT "UserLeague_pkey" PRIMARY KEY ("leagueId","userId")
);

-- CreateTable
CREATE TABLE "UserLeagueTransaction" (
    "id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" INTEGER NOT NULL,
    "delta" DECIMAL(65,30) NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "userMatchMatchId" INTEGER,
    "userMatchPlayerPosition" INTEGER,

    CONSTRAINT "UserLeagueTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_displayName_key" ON "User"("displayName");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_rulesetId_fkey" FOREIGN KEY ("rulesetId") REFERENCES "Ruleset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMatch" ADD CONSTRAINT "UserMatch_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMatch" ADD CONSTRAINT "UserMatch_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_rulesetId_fkey" FOREIGN KEY ("rulesetId") REFERENCES "Ruleset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "League" ADD CONSTRAINT "League_defaultRuleId_fkey" FOREIGN KEY ("defaultRuleId") REFERENCES "Ruleset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RulesetUma" ADD CONSTRAINT "RulesetUma_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Ruleset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLeague" ADD CONSTRAINT "UserLeague_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLeague" ADD CONSTRAINT "UserLeague_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLeagueTransaction" ADD CONSTRAINT "UserLeagueTransaction_userId_leagueId_fkey" FOREIGN KEY ("userId", "leagueId") REFERENCES "UserLeague"("userId", "leagueId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLeagueTransaction" ADD CONSTRAINT "UserLeagueTransaction_userMatchMatchId_userMatchPlayerPosi_fkey" FOREIGN KEY ("userMatchMatchId", "userMatchPlayerPosition") REFERENCES "UserMatch"("matchId", "playerPosition") ON DELETE SET NULL ON UPDATE CASCADE;
