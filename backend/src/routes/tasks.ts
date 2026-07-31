import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

const taskInclude = {
  subtasks: { orderBy: { id: 'asc' } },
  workLog: { orderBy: { loggedAt: 'asc' } }
} satisfies Prisma.PlannerTaskInclude;

function toDecimal(n: number): Prisma.Decimal {
  return new Prisma.Decimal(n);
}

router.get('/', requireAuth, async (_req, res) => {
  const tasks = await prisma.plannerTask.findMany({
    include: taskInclude,
    orderBy: { id: 'asc' }
  });
  res.json({ tasks });
});

const createSchema = z.object({
  client: z.string().default(''),
  title: z.string().min(1),
  kind: z.enum(['TASK', 'MEETING']).default('TASK'),
  budgetHours: z.number().min(0).default(0),
  dueDate: z.string().nullable().optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  assignedTo: z.enum(['STEPHAN', 'CHANEL']).default('STEPHAN'),
  colour: z.string().default('#1f7a4d'),
  scheduledDate: z.string().nullable().optional(),
  startTime: z.string().nullable().optional(),
  durationSlots: z.number().nullable().optional(),
  location: z.string().nullable().optional(),
  agenda: z.string().nullable().optional(),
  isBillingItem: z.boolean().default(false)
});

// Mirrors findConflict() in the single-file app: any of Stephan's other
// scheduled, not-yet-completed items whose slots overlap the requested one.
async function findConflict(dateIso: string, startTime: string, durationSlots: number, excludeId?: number) {
  const candidates = await prisma.plannerTask.findMany({
    where: {
      assignedTo: 'STEPHAN',
      completed: false,
      scheduledDate: new Date(dateIso),
      startTime: { not: null },
      ...(excludeId ? { id: { not: excludeId } } : {})
    }
  });

  const TIME_SLOTS = buildTimeSlots();
  const startIdx = TIME_SLOTS.indexOf(startTime);
  if (startIdx === -1) return null;
  const wanted = TIME_SLOTS.slice(startIdx, startIdx + durationSlots);

  for (const c of candidates) {
    const slots = occupiedSlots(c.startTime!, c.durationSlots || 1, TIME_SLOTS);
    if (slots.some((s) => wanted.includes(s))) return c;
  }
  return null;
}

function occupiedSlots(startTime: string, durationSlots: number, timeSlots: string[]) {
  const idx = timeSlots.indexOf(startTime);
  if (idx === -1) return [startTime];
  return timeSlots.slice(idx, idx + durationSlots);
}

function buildTimeSlots() {
  const slots: string[] = [];
  const startMin = 6 * 60 + 30;
  const endMin = 19 * 60;
  for (let m = startMin; m < endMin; m += 30) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    slots.push(`${h < 10 ? '0' + h : h}:${mm < 10 ? '0' + mm : mm}`);
  }
  return slots;
}

router.post('/conflict-check', requireAuth, async (req, res) => {
  const schema = z.object({
    scheduledDate: z.string(),
    startTime: z.string(),
    durationSlots: z.number().default(1),
    excludeId: z.number().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid conflict-check request' });
    return;
  }
  const conflict = await findConflict(
    parsed.data.scheduledDate,
    parsed.data.startTime,
    parsed.data.durationSlots,
    parsed.data.excludeId
  );
  res.json({ conflict });
});

router.post('/', requireAuth, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid task data', details: parsed.error.flatten() });
    return;
  }
  const data = parsed.data;

  const task = await prisma.plannerTask.create({
    data: {
      client: data.client,
      title: data.title,
      kind: data.kind,
      budgetHours: toDecimal(data.budgetHours),
      actualHours: toDecimal(0),
      remainingHours: toDecimal(data.budgetHours),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      priority: data.priority,
      assignedTo: data.assignedTo,
      colour: data.colour,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
      startTime: data.startTime ?? null,
      durationSlots: data.durationSlots ?? null,
      location: data.location ?? null,
      agenda: data.agenda ?? null,
      chanelStatus: data.assignedTo === 'CHANEL' && !data.isBillingItem ? 'TO_DO' : null,
      isBillingItem: data.isBillingItem
    },
    include: taskInclude
  });

  res.status(201).json({ task });
});

const updateSchema = z.object({
  client: z.string().optional(),
  title: z.string().min(1).optional(),
  budgetHours: z.number().min(0).optional(),
  dueDate: z.string().nullable().optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  assignedTo: z.enum(['STEPHAN', 'CHANEL']).optional(),
  colour: z.string().optional(),
  scheduledDate: z.string().nullable().optional(),
  startTime: z.string().nullable().optional(),
  durationSlots: z.number().nullable().optional(),
  location: z.string().nullable().optional(),
  agenda: z.string().nullable().optional(),
  readyToBill: z.boolean().optional()
});

router.patch('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid update', details: parsed.error.flatten() });
    return;
  }
  const existing = await prisma.plannerTask.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const data = parsed.data;
  const patch: Prisma.PlannerTaskUpdateInput = { ...data } as Prisma.PlannerTaskUpdateInput;

  if ('dueDate' in data) patch.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if ('scheduledDate' in data) patch.scheduledDate = data.scheduledDate ? new Date(data.scheduledDate) : null;
  if (data.budgetHours != null) {
    patch.budgetHours = toDecimal(data.budgetHours);
    const actual = Number(existing.actualHours);
    patch.remainingHours = toDecimal(Math.max(0, data.budgetHours - actual));
  }

  const task = await prisma.plannerTask.update({
    where: { id },
    data: patch,
    include: taskInclude
  });
  res.json({ task });
});

router.post('/:id/complete', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const task = await prisma.plannerTask.update({
    where: { id },
    data: { completed: true, completedAt: new Date() },
    include: taskInclude
  });
  res.json({ task });
});

router.post('/:id/restore', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const task = await prisma.plannerTask.update({
    where: { id },
    data: { completed: false, completedAt: null },
    include: taskInclude
  });
  res.json({ task });
});

const chanelStatusSchema = z.object({ status: z.enum(['TO_DO', 'DOING', 'DONE']) });

router.post('/:id/chanel-status', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const parsed = chanelStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }
  const task = await prisma.plannerTask.update({
    where: { id },
    data: {
      chanelStatus: parsed.data.status,
      completedAt: parsed.data.status === 'DONE' ? new Date() : null
    },
    include: taskInclude
  });
  res.json({ task });
});

router.post('/:id/continue-tomorrow-chanel', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.plannerTask.findUnique({
    where: { id },
    include: { subtasks: true }
  });
  if (!existing) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const [, newTask] = await prisma.$transaction([
    prisma.plannerTask.update({ where: { id }, data: { completed: true } }),
    prisma.plannerTask.create({
      data: {
        client: existing.client,
        title: existing.title,
        kind: 'TASK',
        budgetHours: toDecimal(0),
        actualHours: toDecimal(0),
        remainingHours: toDecimal(0),
        dueDate: existing.dueDate,
        priority: existing.priority,
        assignedTo: 'CHANEL',
        colour: existing.colour,
        chanelStatus: 'TO_DO',
        subtasks: { create: existing.subtasks.map((s) => ({ text: s.text, done: false })) }
      },
      include: taskInclude
    })
  ]);

  res.json({ task: newTask });
});

const duplicateSchema = z.object({
  // One task is created per date given; an empty list creates a single
  // unscheduled copy the user can drag onto the grid themselves.
  dates: z.array(z.string()).default([]),
  startTime: z.string().nullable().optional(),
  durationSlots: z.number().nullable().optional()
});

router.post('/:id/duplicate', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const parsed = duplicateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid duplicate request' });
    return;
  }
  const existing = await prisma.plannerTask.findUnique({ where: { id }, include: { subtasks: true } });
  if (!existing) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const { dates, startTime, durationSlots } = parsed.data;
  const targets: (string | null)[] = dates.length ? dates : [null];

  const created = await prisma.$transaction(
    targets.map((scheduledDate) =>
      prisma.plannerTask.create({
        data: {
          client: existing.client,
          title: existing.title,
          kind: existing.kind,
          budgetHours: existing.budgetHours,
          actualHours: toDecimal(0),
          remainingHours: existing.budgetHours,
          dueDate: existing.dueDate,
          priority: existing.priority,
          assignedTo: existing.assignedTo,
          colour: existing.colour,
          scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
          startTime: scheduledDate ? startTime ?? null : null,
          durationSlots: scheduledDate ? durationSlots ?? null : null,
          location: existing.location,
          agenda: existing.agenda,
          chanelStatus: existing.assignedTo === 'CHANEL' ? 'TO_DO' : null,
          subtasks: { create: existing.subtasks.map((s) => ({ text: s.text, done: false })) }
        },
        include: taskInclude
      })
    )
  );

  res.status(201).json({ tasks: created });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  await prisma.plannerTask.delete({ where: { id } });
  res.json({ ok: true });
});

/* ---------- subtasks ---------- */

const subtaskSchema = z.object({ text: z.string().min(1) });

router.post('/:id/subtasks', requireAuth, async (req, res) => {
  const taskId = Number(req.params.id);
  const parsed = subtaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'text is required' });
    return;
  }
  await prisma.subtask.create({ data: { taskId, text: parsed.data.text } });
  const task = await prisma.plannerTask.findUnique({ where: { id: taskId }, include: taskInclude });
  res.status(201).json({ task });
});

router.patch('/:id/subtasks/:subId', requireAuth, async (req, res) => {
  const taskId = Number(req.params.id);
  const subId = Number(req.params.subId);
  const done = Boolean(req.body?.done);
  await prisma.subtask.update({ where: { id: subId }, data: { done } });
  const task = await prisma.plannerTask.findUnique({ where: { id: taskId }, include: taskInclude });
  res.json({ task });
});

router.delete('/:id/subtasks/:subId', requireAuth, async (req, res) => {
  const taskId = Number(req.params.id);
  const subId = Number(req.params.subId);
  await prisma.subtask.delete({ where: { id: subId } });
  const task = await prisma.plannerTask.findUnique({ where: { id: taskId }, include: taskInclude });
  res.json({ task });
});

/* ---------- work log ---------- */

const workLogSchema = z.object({ hours: z.number().positive() });

router.post('/:id/worklog', requireAuth, async (req, res) => {
  const taskId = Number(req.params.id);
  const parsed = workLogSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'hours must be a positive number' });
    return;
  }

  await prisma.workLogEntry.create({ data: { taskId, hours: toDecimal(parsed.data.hours) } });

  const existing = await prisma.plannerTask.findUnique({ where: { id: taskId }, include: { workLog: true } });
  if (!existing) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  const actualHours = existing.workLog.reduce((sum, e) => sum + Number(e.hours), 0);
  const remainingHours = Math.max(0, Number(existing.budgetHours) - actualHours);
  const autoComplete = remainingHours <= 0;

  const task = await prisma.plannerTask.update({
    where: { id: taskId },
    data: {
      actualHours: toDecimal(actualHours),
      remainingHours: toDecimal(remainingHours),
      ...(autoComplete ? { completed: true, completedAt: new Date() } : {})
    },
    include: taskInclude
  });

  res.status(201).json({ task });
});

router.delete('/:id/worklog/:entryId', requireAuth, async (req, res) => {
  const taskId = Number(req.params.id);
  const entryId = Number(req.params.entryId);
  await prisma.workLogEntry.delete({ where: { id: entryId } });

  const existing = await prisma.plannerTask.findUnique({ where: { id: taskId }, include: { workLog: true } });
  if (!existing) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  const actualHours = existing.workLog.reduce((sum, e) => sum + Number(e.hours), 0);
  const remainingHours = Math.max(0, Number(existing.budgetHours) - actualHours);

  const task = await prisma.plannerTask.update({
    where: { id: taskId },
    data: { actualHours: toDecimal(actualHours), remainingHours: toDecimal(remainingHours) },
    include: taskInclude
  });
  res.json({ task });
});

export default router;
