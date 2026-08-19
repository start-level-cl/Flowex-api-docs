import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');
const generatedDir = path.join(root, 'generated');

async function main() {
  const openapiPath = path.join(generatedDir, 'openapi.json');
  const sourceRoutesPath = path.join(generatedDir, 'source-routes.json');

  const [openapiRaw, sourceRaw] = await Promise.all([
    fs.readFile(openapiPath, 'utf8'),
    fs.readFile(sourceRoutesPath, 'utf8').catch(() => '[]')
  ]);

  const openapi = JSON.parse(openapiRaw);
  const sourceRoutes = JSON.parse(sourceRaw);

  const sourceMap = new Map();
  for (const r of sourceRoutes) {
    const k = `${(r.method||'').toLowerCase()} ${r.path}`;
    sourceMap.set(k, r);
  }

  const grouped = {};
  const newRoutes = [];
  const changedRoutes = [];

  for (const [p, methods] of Object.entries(openapi.paths || {})) {
    for (const [method, op] of Object.entries(methods)) {
      const svc = op['x-service'] || (op.tags && op.tags[0]) || 'unknown';
      if (!grouped[svc]) grouped[svc] = [];

      const params = (op.parameters || []).filter(x => x.in === 'query').map(q => ({
        name: q.name,
        description: q.description || null,
        schema: q.schema || null,
        required: !!q.required
      }));

      const responses = {};
      for (const [status, resp] of Object.entries(op.responses || {})) {
        const content = resp.content || {};
        const media = Object.values(content)[0] || {};
        responses[status] = {
          description: resp.description || null,
          schema: media.schema || null,
          example: media.example || null
        };
      }

      const route = {
        path: p,
        method: method.toLowerCase(),
        operationId: op.operationId || null,
        summary: op.summary || null,
        tags: op.tags || [],
        parameters: params,
        responses
      };

      grouped[svc].push(route);

      const k = `${route.method} ${route.path}`;
      const src = sourceMap.get(k);
      if (!src) {
        newRoutes.push({ service: svc, ...route });
      }
    }
  }

  const outSplit = path.join(generatedDir, 'routes-by-service.json');
  const outDiff = path.join(generatedDir, 'routes-diff.json');

  await Promise.all([
    fs.writeFile(outSplit, JSON.stringify(grouped, null, 2), 'utf8'),
    fs.writeFile(outDiff, JSON.stringify({ newRoutes, changedRoutes }, null, 2), 'utf8')
  ]);

  console.log('Wrote:', outSplit, outDiff);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
