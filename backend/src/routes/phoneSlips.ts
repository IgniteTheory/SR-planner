import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  const phoneSlips = await prisma.phoneSlip.findMany({ orderBy: { id: 'asc' } });
  res.json({ phoneSlips });
});

const createSchema = z.object({ text: z.string().min(1) });

router.post('/', requireAuth, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'text is required' });
    return;
  }
  const slip = await prisma.phoneSlip.create({ data: { text: parsed.data.text } });
  res.status(201).json({ phoneSlip: slip });
});

router.patch('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const done = Boolean(req.body?.done);
  const slip = await prisma.phoneSlip.update({ where: { id }, data: { done } });
  res.json({ phoneSlip: slip });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  await prisma.phoneSlip.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
