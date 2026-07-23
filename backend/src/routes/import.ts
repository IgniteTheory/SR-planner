import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// One-time migration path: accepts the exact JSON shape produced by the
// single-file app's "Export" button and loads it into the shared database.
// Safe to run more than once — it only ever adds rows, it never deletes.

const legacySubtaskSchema = z.object({ text: z.string(), done: z.boolean().optional() });
const legacyWorkLogSchema = z.object({ timestamp: z.string(), hours: z.number() });

const legacyTaskSchema = z.object({
  client: z.string().optional(),
  title: z.string(),
  budgetHours: z.number().optional(),
  actualHours: z.number().optional(),
  remainingHours: z.number().optional(),
  dueDate: z.string().optional().nullable(),
  priority: z.enum(['High', 'Medium', 'Low']).optional(),
  assignedTo: z.enum(['Stephan', 'Chanel']).optional(),
  colour: z.string().optional(),
  kind: z.enum(['task', 'meeting']).optional(),
  scheduledDate: z.string().optional().nullable(),
  startTime: z.string().optional().nullable(),
  durationSlots: z.number().optional().nullable(),
  location: z.string().optional().nullable(),
  agenda: z.string().optional().nullable(),
  completed: z.boolean().optional(),
  completedAt: z.string().optional().nullable(),
  chanelStatus: z.enum(['To Do', 'Doing', 'Done']).optional(),
  subtasks: z.array(legacySubtaskSchema).optional(),
  workLog: z.array(legacyWorkLogSchema).optional()
});

const legacyPhoneSlipSchema = z.object({ text: z.string(), done: z.boolean().optional() });

const importSchema = z.object({
  tasks: z.array(legacyTaskSchema),
  phoneSlips: z.array(legacyPhoneSlipSchema).optional()
});

const PRIORITY_MAP = { High: 'HIGH', Medium: 'MEDIUM', Low: 'LOW' } as const;
const ASSIGNED_MAP = { Stephan: 'STEPHAN', Chanel: 'CHANEL' } as const;
const KIND_MAP = { task: 'TASK', meeting: 'MEETING' } as const;
const CHANEL_STATUS_MAP = { 'To Do': 'TO_DO', Doing: 'DOING', Done: 'DONE' } as const;

router.post('/', requireAuth, async (req, res) => {
  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'That file doesn\'t look like a valid SR Planner export.', details: parsed.error.flatten() });
    return;
  }
  const { tasks, phoneSlips } = parsed.data;

  let importedTasks = 0;
  let importedSlips = 0;

  for (const t of tasks) {
    const budget = t.budgetHours ?? 0;
    await prisma.plannerTask.create({
      data: {
        client: t.client ?? '',
        title: t.title,
        kind: t.kind ? KIND_MAP[t.kind] : 'TASK',
        budgetHours: new Prisma.Decimal(budget),
        actualHours: new Prisma.Decimal(t.actualHours ?? 0),
        remainingHours: new Prisma.Decimal(t.remainingHours ?? budget),
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
        priority: t.priority ? PRIORITY_MAP[t.priority] : 'MEDIUM',
        assignedTo: t.assignedTo ? ASSIGNED_MAP[t.assignedTo] : 'STEPHAN',
        colour: t.colour ?? '#1f7a4d',
        scheduledDate: t.scheduledDate ? new Date(t.scheduledDate) : null,
        startTime: t.startTime ?? null,
        durationSlots: t.durationSlots ?? null,
        location: t.location ?? null,
        agenda: t.agenda ?? null,
        completed: t.completed ?? false,
        completedAt: t.completedAt ? new Date(t.completedAt) : null,
        chanelStatus: t.chanelStatus ? CHANEL_STATUS_MAP[t.chanelStatus] : null,
        subtasks: { create: (t.subtasks ?? []).map((s) => ({ text: s.text, done: s.done ?? false })) },
        workLog: { create: (t.workLog ?? []).map((w) => ({ hours: new Prisma.Decimal(w.hours), loggedAt: new Date(w.timestamp) })) }
      }
    });
    importedTasks += 1;
  }

  for (const p of phoneSlips ?? []) {
    await prisma.phoneSlip.create({ data: { text: p.text, done: p.done ?? false } });
    importedSlips += 1;
  }

  res.json({ importedTasks, importedSlips });
});

export default router;
