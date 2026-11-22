import { createServer } from 'node:http';
import { appendFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest } from './documents.mjs';

const here = fileURLToPath(new URL('./', import.meta.url));
const root = fileURLToPath(new URL('../../output/review/', import.meta.url));
const host = process.env.UNSLICED_REVIEW_HOST || '127.0.0.1';
const port = Number(process.env.UNSLICED_REVIEW_PORT || 4173);
const votesPath = join(root, 'votes.jsonl');
const current = await readFile(join(root, 'current.json'), 'utf8').catch(error => {
  if (error.code === 'ENOENT') throw new Error('请先运行 pnpm review:prepare 生成评审材料。');
  throw error;
});
const { datasetId } = JSON.parse(current);
const folder = join(root, 'datasets', datasetId);
const { documents, pairCount, activeDocuments } = JSON.parse(await readFile(join(folder, 'manifest.json'), 'utf8'));
const votes = new Map();
const queue = new Map();
const images = new Map();
const byDoc = [];
const pairs = new Map();
let writing = Promise.resolve();

for (const doc of documents) {
  const docPairs = [];
  const { variants, rejected, ...source } = doc;
  for (const [i, a] of variants.entries()) {
    for (const name of a.images) images.set('/images/' + a.id + '/' + name, join(folder, 'renders', a.id, name));
    for (const b of variants.slice(i + 1)) {
      const id = digest([datasetId, a.id, b.id].join(' ')).slice(0, 24);
      const pair = { id, document: source, a, b };
      docPairs.push(pair);
      pairs.set(id, pair);
    }
  }
  if (docPairs.length) byDoc.push(docPairs);
}

const old = await readFile(votesPath, 'utf8').catch(error => {
  if (error.code === 'ENOENT') return '';
  throw error;
});
for (const line of old.split('\n').filter(Boolean)) {
  const vote = JSON.parse(line);
  if (vote.datasetId !== datasetId) continue;
  if (!votes.has(vote.reviewer)) votes.set(vote.reviewer, new Map());
  votes.get(vote.reviewer).set(vote.pairId, vote);
}

const page = await readFile(join(here, 'index.html'));
const ui = await readFile(join(here, 'ui.mjs'));
const styles = await readFile(join(here, 'style.css'));
const staticFiles = new Map([
  ['/', [page, 'text/html']],
  ['/ui.mjs', [ui, 'text/javascript']],
  ['/style.css', [styles, 'text/css']]
]);

function reviewerName(value) {
  if (typeof value !== 'string') return '';
  const name = value.normalize('NFC').trim();
  return name.length > 0 && name.length <= 60 && !/[\p{Cc}\p{Cf}]/u.test(name) ? name : '';
}

function orderFor(reviewer) {
  if (queue.has(reviewer)) return queue.get(reviewer);
  const shuffled = (list, key) => list.map(element => [digest(reviewer + '\0' + key(element)), element])
    .sort(([a], [b]) => a.localeCompare(b)).map(([, element]) => element);
  const groups = shuffled(byDoc, group => group[0].document.id)
    .map(group => shuffled(group, pair => pair.id));
  const order = [];
  for (let index = 0; index < Math.max(0, ...groups.map(group => group.length)); index++) {
    for (const group of groups) if (group[index]) order.push(group[index]);
  }
  queue.set(reviewer, order);
  return order;
}

function orientation(pair, reviewer) {
  const reverse = parseInt(digest(datasetId + '\0' + reviewer + '\0' + pair.id)[0], 16) % 2;
  return reverse ? [pair.b, pair.a] : [pair.a, pair.b];
}

function nextPair(reviewer) {
  const done = votes.get(reviewer);
  const pair = orderFor(reviewer).find(item => !done?.has(item.id));
  const preview = variant => ({ images: variant.images.map(name => '/images/' + variant.id + '/' + name) });
  const sides = pair && orientation(pair, reviewer);
  return { completed: done?.size ?? 0, pairCount, activeDocuments, documentCount: documents.length,
    pair: pair ? { id: pair.id, left: preview(sides[0]), right: preview(sides[1]) } : null };
}

function saveVote(reviewer, pair, choice) {
  const operation = writing.then(async () => {
    if (!votes.has(reviewer)) votes.set(reviewer, new Map());
    const records = votes.get(reviewer);
    // A retry after a lost response must not record a second vote.
    if (records.has(pair.id)) return records.get(pair.id);
    if (nextPair(reviewer).pair?.id !== pair.id) return null;
    const [left, right] = orientation(pair, reviewer);
    const recorded = ({ id, options, visualId, signature, costs }) => ({ id, options, visualId, signature, costs });
    const entry = { schemaVersion: 1, datasetId, pairId: pair.id, reviewer, recordedAt: new Date().toISOString(),
      document: { ...pair.document, archive: `datasets/${datasetId}/sources/${pair.document.path}` },
      left: recorded(left), right: recorded(right), choice, chosenVariant: { left: left.id, right: right.id, tie: null }[choice] };
    await appendFile(votesPath, JSON.stringify(entry) + '\n', { encoding: 'utf8', flush: true });
    records.set(pair.id, entry);
    return entry;
  });
  writing = operation.catch(() => {});
  return operation;
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
    .end(JSON.stringify(data));
}

const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    const url = new URL(req.url, 'http://' + req.headers.host);
    if (host === '127.0.0.1' && !['127.0.0.1', 'localhost'].includes(url.hostname))
      return json(res, 403, { error: '请使用本机评审台地址。' });
    if (req.method === 'GET' && url.pathname === '/api/next') {
      const reviewer = reviewerName(url.searchParams.get('reviewer'));
      return reviewer ? json(res, 200, nextPair(reviewer)) : json(res, 400, { error: '请输入 1 至 60 字的评审人名字。' });
    }
    if (req.method === 'POST' && url.pathname === '/api/vote') {
      if (!/^application\/json(?:;|$)/iu.test(req.headers['content-type'] || '') ||
          (req.headers.origin && req.headers.origin !== url.origin)) {
        return json(res, 403, { error: '请从评审页面提交。' });
      }
      let text = '';
      for await (const chunk of req.setEncoding('utf8')) {
        text += chunk;
        if (text.length > 4096) return json(res, 413, { error: '请求过长。' });
      }
      let body;
      try { body = JSON.parse(text); } catch { return json(res, 400, { error: '请求格式不正确。' }); }
      const reviewer = reviewerName(body?.reviewer);
      const pair = pairs.get(body?.pairId);
      if (!reviewer || !pair || !['left', 'right', 'tie'].includes(body.choice))
        return json(res, 400, { error: '这条评审信息不完整。' });
      const vote = await saveVote(reviewer, pair, body.choice);
      return vote ? json(res, 200, nextPair(reviewer)) : json(res, 409, { error: '此组已过期，请重新进入评审。' });
    }
    if (req.method === 'GET' && staticFiles.has(url.pathname)) {
      const [body, type] = staticFiles.get(url.pathname);
      res.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
      return res.writeHead(200, { 'Content-Type': type + '; charset=utf-8' }).end(body);
    }
    if (req.method === 'GET' && images.has(url.pathname)) {
      const body = await readFile(images.get(url.pathname));
      return res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=3600' }).end(body);
    }
    json(res, 404, { error: '找不到这个页面。' });
  } catch (error) {
    console.error(error);
    if (!res.headersSent) json(res, 500, { error: '本地评审台出错。请检查终端后重试。' });
    else res.end();
  }
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE'
    ? `端口 ${port} 已在使用。可打开现有评审台，或用 UNSLICED_REVIEW_PORT 指定端口。` : error);
  process.exitCode = 1;
});
server.listen(port, host, () => {
  console.log(`分寸评审台 · http://${host}:${server.address().port}/`);
  console.log(`${documents.length} 份文档，${pairCount} 组可评。记录写入 ${votesPath}`);
});
