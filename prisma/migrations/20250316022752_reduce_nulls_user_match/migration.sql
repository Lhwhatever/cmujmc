/*
  Warnings:

  - Made the column `rawScore` on table `UserMatch` required. This step will fail if there are existing NULL values in that column.
  - Made the column `placementMin` on table `UserMatch` required. This step will fail if there are existing NULL values in that column.
  - Made the column `placementMax` on table `UserMatch` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "UserMatch" ALTER COLUMN "rawScore" SET NOT NULL,
ALTER COLUMN "placementMin" SET NOT NULL,
ALTER COLUMN "placementMax" SET NOT NULL;
