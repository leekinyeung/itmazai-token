export const meta = {
  apiVersion: 1,
  key: 'geo',
  name: 'GEO Monitor',
  version: '0.2.0',
  author: { name: 'TaoDock' },
  description: {
    en: 'Asynchronous GEO monitoring with DeepSeek web capture',
    zh: '基于 DeepSeek 网页采集的异步 GEO 监测',
  },
  models: ['geo-monitor'],
  baseUrl: 'http://127.0.0.1:3031',
  auth: 'api_key',
  fetchMode: 'per_task',
  protocols: [{ name: 'openai_responses', supports: ['background'] }],
};

const tasksPath = '/internal/v1/tasks';
const taskID = /^task_[A-Za-z0-9_-]{1,128}$/;

export const protocols = {
  openai_responses: {
    decodeRequest(ctx) {
      const body = ctx.body.value;
      const question = typeof body?.input === 'string' ? body.input.trim() : '';
      if (!question || question.length > 4096 || encodeURIComponent(question).replace(/%[\dA-F]{2}/g, '_').length > 4096) {
        throw new Error('Input must be a single text question of at most 4096 UTF-8 bytes');
      }
      if (body.metadata !== undefined && (!body.metadata || typeof body.metadata !== 'object' || Array.isArray(body.metadata))) {
        throw new Error('Metadata must be an object');
      }
      const platform = body.metadata?.platform;
      if (platform !== undefined && platform !== 'deepseek') throw new Error('Only the deepseek platform is supported');

      return { kind: 'submit', model: ctx.model, action: 'capture', requestBody: { question, platform: 'deepseek' } };
    },
    renderFinal(ctx, task) {
      const artifact = ctx.artifacts?.screenshot;
      if (!artifact || !task.data?.result) throw new Error('GEO capture result is unavailable');
      const { platform, source, answer, citations, captured_at } = task.data.result;
      // Expose the existing authenticated content route without its optional capability token.
      const result = { platform, source, answer, citations, captured_at, screenshot_url: artifact.url.split('?')[0] };
      return {
        output: [{
          type: 'message', role: 'assistant',
          content: [{ type: 'output_text', text: JSON.stringify(result), annotations: [], logprobs: [] }],
        }],
      };
    },
  },
};

export function buildSubmitRequest(ctx) {
  if (!taskID.test(ctx.publicTaskId)) throw new Error('GEO task ID is unavailable');
  return {
    url: ctx.baseUrl + tasksPath,
    method: 'POST',
    headers: { Authorization: 'Bearer ' + ctx.apiKey, 'Content-Type': 'application/json' },
    body: { task_id: ctx.publicTaskId, question: ctx.requestBody.question, platform: ctx.requestBody.platform },
  };
}

export function parseSubmitResponse(ctx, response) {
  if (response.statusCode !== 202 || response.body?.task_id !== ctx.publicTaskId) {
    throw new Error('GEO worker returned an invalid task acknowledgement');
  }
  return { taskId: ctx.publicTaskId };
}

export function buildQueryRequest(ctx) {
  if (!taskID.test(ctx.taskId)) throw new Error('GEO task ID is invalid');
  return { url: ctx.baseUrl + tasksPath + '/' + ctx.taskId, method: 'GET', headers: { Authorization: 'Bearer ' + ctx.apiKey } };
}

export function parseTaskResult(ctx, body) {
  if (body?.task_id !== ctx.taskId) return { status: 'UNKNOWN', reason: 'GEO task ID does not match' };
  switch (body.status) {
    case 'queued':
      return { status: 'QUEUED' };
    case 'running':
      return { status: 'IN_PROGRESS' };
    case 'completed':
      if (body.result?.platform === 'deepseek' && ['fixture', 'deepseek_web'].includes(body.result.source)
          && typeof body.result.answer === 'string' && body.result.answer.trim()
          && Array.isArray(body.result.citations) && typeof body.result.captured_at === 'string') {
        return { status: 'SUCCESS' };
      }
      return { status: 'FAILURE', reason: 'GEO worker returned an incomplete capture' };
    case 'failed':
      return { status: 'FAILURE', reason: 'GEO browser capture failed' };
    default:
      return { status: 'UNKNOWN', reason: 'GEO worker returned an unknown status' };
  }
}

export function listArtifacts(task) {
  if (task.status !== 'SUCCESS' || task.data?.status !== 'completed') return [];
  return [{ key: 'screenshot', type: 'image', mimeType: 'image/png' }];
}

export function buildContentRequest(ctx) {
  if (ctx.artifactKey !== 'screenshot' || !taskID.test(ctx.upstreamTaskId)) throw new Error('GEO screenshot is unavailable');
  return {
    url: ctx.baseUrl + tasksPath + '/' + ctx.upstreamTaskId + '/screenshot',
    method: ctx.clientRequest.method,
    headers: { Authorization: 'Bearer ' + ctx.apiKey },
  };
}
