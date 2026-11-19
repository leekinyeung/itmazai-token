import { timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { CaptureError } from './capture.js';

const tasksPath = '/internal/v1/tasks';
const taskPath = /^\/internal\/v1\/tasks\/(task_[A-Za-z0-9_-]{1,128})(\/screenshot)?$/;
const taskID = /^task_[A-Za-z0-9_-]{1,128}$/;
const workerToken = /^[A-Za-z0-9_-]{43}$/;
const retentionMs = 60 * 60 * 1000;

class RequestError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
  }
}

function sendJSON(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(value));
}

async function readSubmission(request) {
  const mediaType = request.headers['content-type']?.split(';')[0].trim().toLowerCase();
  if (mediaType !== 'application/json') throw new RequestError(415, 'json_required');

  const chunks = [];
  let size = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > 32 * 1024) throw new RequestError(413, 'body_too_large');
    chunks.push(chunk);
  }

  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new RequestError(400, 'invalid_json');
  }

  const question = typeof body?.question === 'string' ? body.question.trim() : '';
  if (typeof body?.task_id !== 'string' || !taskID.test(body.task_id) || body.platform !== 'deepseek'
      || !question || Buffer.byteLength(question) > 4096) {
    throw new RequestError(400, 'invalid_task');
  }
  return { id: body.task_id, question };
}

export function createGeoServer({ token, capture, log = console.info }) {
  if (typeof token !== 'string' || !workerToken.test(token)) {
    throw new Error('GEO_WORKER_TOKEN must be a 32-byte random value encoded as unpadded base64url');
  }
  const authorization = Buffer.from(`Bearer ${token}`);
  const tasks = new Map();
  const queue = [];
  let running = false;

  function expireTasks() {
    const now = Date.now();
    for (const [id, task] of tasks) {
      if (task.expiresAt <= now) tasks.delete(id);
    }
  }

  async function processQueue() {
    if (running) return;
    running = true;
    try {
      while (queue.length) {
        const task = queue.shift();
        task.status = 'running';
        log({ task_id: task.id, status: task.status });
        try {
          const { result, screenshot } = await capture(task.question);
          task.result = result;
          task.screenshot = screenshot;
          task.status = 'completed';
        } catch (error) {
          task.status = 'failed';
          task.errorCode = error instanceof CaptureError ? error.code : 'capture_failed';
        }
        task.expiresAt = Date.now() + retentionMs;
        log({ task_id: task.id, status: task.status, error_code: task.errorCode });
      }
    } finally {
      running = false;
    }
  }

  const server = createServer({ requestTimeout: 15_000 }, async (request, response) => {
    try {
      const supplied = Buffer.from(request.headers.authorization ?? '');
      if (supplied.length !== authorization.length || !timingSafeEqual(supplied, authorization)) {
        throw new RequestError(401, 'unauthorized');
      }

      expireTasks();
      if (request.method === 'POST' && request.url === tasksPath) {
        const { id, question } = await readSubmission(request);
        let task = tasks.get(id);
        if (task && task.question !== question) throw new RequestError(409, 'task_id_conflict');
        if (!task) {
          if (queue.length + Number(running) >= 8 || tasks.size >= 32) {
            throw new RequestError(429, 'capacity_reached');
          }
          task = { id, question, status: 'queued', expiresAt: Infinity };
          tasks.set(id, task);
          queue.push(task);
        }
        sendJSON(response, 202, { task_id: id, status: task.status });
        void processQueue();
        return;
      }

      const path = taskPath.exec(request.url);
      const isScreenshot = Boolean(path?.[2]);
      if (!path || (request.method !== 'GET' && !(isScreenshot && request.method === 'HEAD'))) {
        throw new RequestError(404, 'not_found');
      }
      const task = tasks.get(path[1]);
      if (!task) throw new RequestError(404, 'task_not_found');
      if (!isScreenshot) {
        sendJSON(response, 200, {
          task_id: task.id, status: task.status, result: task.result, error_code: task.errorCode,
        });
        return;
      }
      if (task.status !== 'completed') throw new RequestError(409, 'screenshot_unavailable');
      response.writeHead(200, {
        'Content-Type': 'image/png', 'Content-Length': task.screenshot.length,
        'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
      });
      response.end(request.method === 'HEAD' ? undefined : task.screenshot);
    } catch (error) {
      if (response.destroyed) return;
      if (error instanceof RequestError) {
        if (error.status === 413) response.setHeader('Connection', 'close');
        sendJSON(response, error.status, { error: error.message });
      } else {
        sendJSON(response, 500, { error: 'internal_error' });
      }
    }
  });
  const cleanup = setInterval(expireTasks, 60_000).unref();
  server.on('close', () => clearInterval(cleanup));
  return server;
}
