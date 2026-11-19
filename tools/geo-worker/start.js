import { once } from 'node:events';
import { chromium } from 'playwright';
import { captureFixture } from './capture.js';
import { createDeepSeekCollector, launchDeepSeekProfile } from './deepseek.js';
import { createGeoServer } from './server.js';

const source = process.env.GEO_CAPTURE_SOURCE ?? 'fixture';
if (source !== 'fixture' && source !== 'deepseek_web') {
  throw new Error('GEO_CAPTURE_SOURCE must be fixture or deepseek_web');
}

const server = createGeoServer({
  token: process.env.GEO_WORKER_TOKEN,
  capture: (question) => capture(question),
});
const browser = source === 'deepseek_web' ? await launchDeepSeekProfile() : await chromium.launch({ channel: 'chromium' });
const capture = source === 'deepseek_web' ? createDeepSeekCollector(browser) : (question) => captureFixture(browser, question);
const host = process.env.GEO_WORKER_HOST || '127.0.0.1';

try {
  await once(server.listen(3031, host), 'listening');
} catch (error) {
  await browser.close();
  throw error;
}
console.info(`GEO worker (${source}) listening on http://${host}:3031`);

function shutdown() {
  server.close();
  void browser.close();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
