import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import clientsRoutes from './modules/clients/clients.routes';
import dealsRoutes from './modules/deals/deals.routes';
import stagesRoutes from './modules/stages/stages.routes';
import tasksRoutes from './modules/tasks/tasks.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import integrationsRoutes from './modules/integrations/integrations.routes';
import originsRoutes from './modules/origins/origins.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/stages', stagesRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/origins', originsRoutes);

app.use(errorHandler);

export default app;
