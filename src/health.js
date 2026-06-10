'use strict';

/**
 * Health-check CLI (F-0002).
 * Zero-dependency CommonJS module exporting getHealth(); when run directly,
 * prints the health object as JSON to stdout and exits 0.
 */

const SERVICE_NAME = 'ai-operations-template';

/**
 * @returns {{ status: string, service: string, uptime_s: number, timestamp: string }}
 */
function getHealth() {
  return {
    status: 'ok',
    service: SERVICE_NAME,
    uptime_s: process.uptime(),
    timestamp: new Date().toISOString()
  };
}

module.exports = { getHealth };

if (require.main === module) {
  process.stdout.write(JSON.stringify(getHealth()) + '\n');
  process.exitCode = 0;
}
