import { Router } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Mirrors billableCompleted() + the Chanel Done archive in the single-file app.
router.get('/', requireAuth, async (req, res) => {
  const { from, to } = req.query as Record<string, string | undefined>;

  const completedAtFilter: { gte?: Date; lte?: Date } = {};
  if (from) completedAtFilter.gte = new Date(from + 'T00:00:00');
  if (to) completedAtFilter.lte = new Date(to + 'T23:59:59');

  const billable = await prisma.plannerTask.findMany({
    where: {
      assignedTo: 'STEPHAN',
      kind: 'TASK',
      completed: true,
      completedAt: Object.keys(completedAtFilter).length ? completedAtFilter : { not: null }
    },
    orderBy: { completedAt: 'desc' }
  });

  const chanelDone = await prisma.plannerTask.findMany({
    where: { assignedTo: 'CHANEL', chanelStatus: 'DONE' },
    orderBy: { completedAt: 'desc' }
  });

  const totalHours = billable.reduce((sum, t) => sum + Number(t.actualHours), 0);

  res.json({ billable, chanelDone, totalHours });
});

export default router;
