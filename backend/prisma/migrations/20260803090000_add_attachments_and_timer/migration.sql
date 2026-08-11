-- AlterTable
ALTER TABLE "planner_tasks" ADD COLUMN     "timerStartedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "planner_attachments" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planner_attachments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "planner_attachments" ADD CONSTRAINT "planner_attachments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "planner_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

