import { getDb } from './db/database';
import { env, logger } from './env';
import { processDuePublishingJobs } from './queue/publishingWorker';

const WORKER_ID = `standalone-worker-${process.pid}`;

async function runStandaloneWorker() {
  const db = getDb();
  logger.info('LIVINGTECH BRAND AGENCY standalone publishing worker started', {
    workerId: WORKER_ID,
    pollIntervalMs: env.WORKER_POLL_INTERVAL_MS,
    redisConfigured: Boolean(env.REDIS_URL),
  });

  const tick = async () => {
    try {
      const summary = await processDuePublishingJobs(db, { workerId: WORKER_ID, limit: 20 });
      if (summary.processedCount > 0) {
        logger.info('Standalone worker processed due jobs', {
          workerId: WORKER_ID,
          processed: summary.processedCount,
          published: summary.publishedCount,
          failed: summary.failedCount,
        });
      }
    } catch (err) {
      logger.error('Standalone worker tick error', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  await tick();
  setInterval(tick, env.WORKER_POLL_INTERVAL_MS);
}

runStandaloneWorker().catch((err) => {
  logger.error('Fatal standalone worker error', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
