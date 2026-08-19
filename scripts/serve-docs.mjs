import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const docsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const docsDir = path.join(docsRoot, 'docs')
const generatedDir = path.join(docsRoot, 'generated')
const port = Number(process.env.PORT || 4010)

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.yaml': 'application/yaml; charset=utf-8',
  '.yml': 'application/yaml; charset=utf-8',
  '.d.ts': 'text/plain; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
}

const server = http.createServer((req, res) => {
  const pathname = req.url === '/' ? '/index.html' : req.url
  const candidate = pathname.startsWith('/generated/')
    ? path.join(generatedDir, pathname.replace('/generated/', ''))
    : path.join(docsDir, pathname.replace(/^\//, ''))

  if (!candidate.startsWith(docsRoot) || !fs.existsSync(candidate)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Not found')
    return
  }

  const ext = path.extname(candidate)
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' })
  fs.createReadStream(candidate).pipe(res)
})

server.listen(port, () => {
  console.log(`Docs disponibles en http://localhost:${port}`)
})
