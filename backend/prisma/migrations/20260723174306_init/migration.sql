-- CreateEnum
CREATE TYPE "TaskKind" AS ENUM ('TASK', 'MEETING');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "AssignedTo" AS ENUM ('STEPHAN', 'CHANEL');

-- CreateEnum
CREATE TYPE "ChanelStatus" AS ENUM ('TO_DO', 'DOING', 'DONE');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planner_tasks" (
    "id" SERIAL NOT NULL,
    "client" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "TaskKind" NOT NULL DEFAULT 'TASK',
    "budgetHours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "actualHours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "remainingHours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "dueDate" DATE,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "assignedTo" "AssignedTo" NOT NULL DEFAULT 'STEPHAN',
    "colour" TEXT NOT NULL DEFAULT '#1f7a4d',
    "scheduledDate" DATE,
    "startTime" TEXT,
    "durationSlots" INTEGER,
    "location" TEXT,
    "agenda" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "chanelStatus" "ChanelStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planner_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planner_subtasks" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "planner_subtasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planner_worklog" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "hours" DECIMAL(6,2) NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planner_worklog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planner_phone_slips" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planner_phone_slips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_name_key" ON "users"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "planner_subtasks" ADD CONSTRAINT "planner_subtasks_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "planner_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planner_worklog" ADD CONSTRAINT "planner_worklog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "planner_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

