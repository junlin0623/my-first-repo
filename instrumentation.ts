// Runs once when the server starts: begin the 07:50 / Sunday 09:50 routines.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { startCron } = await import('./lib/cron');
  startCron();
}
