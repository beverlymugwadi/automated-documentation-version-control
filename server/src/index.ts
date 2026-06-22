import { createApp } from './app';
import { env } from './config/env';
import { connectDB, disconnectDB } from './config/db';

async function start(): Promise<void> {
  let usingDb = false;
  try {
    usingDb = await connectDB();
  } catch (err) {
    console.error('[adgvc] MongoDB connection failed:', (err as Error).message);
    console.error('[adgvc] Set MOCK_MODE=true to run without a database.');
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`[adgvc] API listening on http://localhost:${env.port} (${env.nodeEnv})`);
    console.log(
      usingDb
        ? '[adgvc] Data source: MongoDB'
        : `[adgvc] Data source: in-memory (MOCK MODE)`,
    );
  });

  const shutdown = (signal: string): void => {
    console.log(`\n[adgvc] ${signal} received, shutting down…`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

void start();