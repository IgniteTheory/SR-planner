import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/auth';
import tasksRoutes from './routes/tasks';
import phoneSlipsRoutes from './routes/phoneSlips';
import reportRoutes from './routes/report';
import importRoutes from './routes/import';

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5174', credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/phone-slips', phoneSlipsRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/import', importRoutes);

// In production the frontend is built and served from the same service as
// the API — one URL, no CORS to think about. Locally the frontend runs on
// its own Vite dev server instead, so this build won't exist yet.
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

export default app;
