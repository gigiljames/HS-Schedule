import { app } from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { bootstrapAdmin } from './scripts/bootstrapAdmin.js';
import { initNotificationScheduler } from './jobs/notificationScheduler.js';

async function startServer(): Promise<void> {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Auto-bootstrap initial admin if none exists
    await bootstrapAdmin();

    // 3. Initialize background notification scheduler worker
    initNotificationScheduler();

    // 4. Start HTTP Server
    app.listen(env.PORT, () => {
      console.log(`[Server] House Surgeon Schedule Planner API listening on http://localhost:${env.PORT}`);
      console.log(`[Server] Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('[Server] Fatal startup error:', error);
    process.exit(1);
  }
}

startServer();
