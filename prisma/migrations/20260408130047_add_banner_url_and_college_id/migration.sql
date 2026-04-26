/*
  Warnings:

  - Added the required column `collegeId` to the `registrations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "registrations" ADD COLUMN     "collegeId" TEXT NOT NULL;
