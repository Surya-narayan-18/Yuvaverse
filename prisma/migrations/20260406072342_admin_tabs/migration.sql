-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('NEW', 'SHORTLISTED', 'INTERVIEWED', 'RECRUITED', 'REJECTED');

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "status" "ApplicationStatus" NOT NULL DEFAULT 'NEW';

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "customFields" JSONB;

-- AlterTable
ALTER TABLE "registrations" ADD COLUMN     "customAnswers" JSONB;
