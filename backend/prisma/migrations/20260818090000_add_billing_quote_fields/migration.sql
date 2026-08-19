-- AlterTable
ALTER TABLE "planner_tasks" ADD COLUMN     "billed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "planner_tasks" ADD COLUMN     "billingDescription" TEXT;
ALTER TABLE "planner_tasks" ADD COLUMN     "billingHours" DECIMAL(6,2);
