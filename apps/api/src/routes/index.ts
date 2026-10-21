import { Router } from 'express';
import { authRouter } from './authRoutes.js';
import { institutionRouter } from './institutionRoutes.js';
import { departmentRouter } from './departmentRoutes.js';
import { batchRouter } from './batchRoutes.js';
import { rosterRouter } from './rosterRoutes.js';
import { scheduleRouter } from './scheduleRoutes.js';
import { hsRouter } from './hsRoutes.js';
import { notificationRouter } from './notificationRoutes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/institutions', institutionRouter);
apiRouter.use('/departments', departmentRouter);
apiRouter.use('/batches', batchRouter);
apiRouter.use('/roster', rosterRouter);
apiRouter.use('/schedules', scheduleRouter);
apiRouter.use('/hs', hsRouter);
apiRouter.use('/notifications', notificationRouter);
