import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractFlowexLambdaRoutes } from './lib/route-extractor.mjs'
import {
  createDefaultOperation,
  info,
  operationOverrides,
  schemas,
  securitySchemes,
  servers,
  tags,
} from './lib/spec-config.mjs'
import { generateTypeDeclarations } from './lib/typegen.mjs'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const docsRoot = path.resolve(currentDir, '..')
const repoRoot = path.resolve(docsRoot, '..')
const generatedDir = path.join(docsRoot, 'generated')
const docsSrcPublicDir = path.join(docsRoot, 'docs-src', 'public')
const sourceRoutesPath = path.join(generatedDir, 'source-routes.json')

function loadSourceRoutes() {
  const routes = extractFlowexLambdaRoutes({ repoRoot })
  return routes
}

function yamlStringify(val, indent = 0) {
  const pad = '  '.repeat(indent)
  if (val === null || val === undefined) return 'null'
  if (typeof val === 'boolean' || typeof val === 'number') return String(val)
  if (typeof val === 'string') {
    if (val.includes('\n')) {
      return `|\n${val.split('\n').map(l => `${pad}  ${l}`).join('\n')}`
    }
    if (/^[a-zA-Z0-9_./@#-]+$/.test(val) && !/^(true|false|null|yes|no)$/i.test(val)) {
      return val
    }
    return JSON.stringify(val)
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]'
    return val.map(item => `${pad}- ${yamlStringify(item, indent + 1).replace(/^\s+/, '')}`).join('\n')
  }
  if (typeof val === 'object') {
    const keys = Object.keys(val)
    if (keys.length === 0) return '{}'
    return keys
      .map(key => {
        const value = val[key]
        if (typeof value === 'object' && value !== null && Object.keys(value).length > 0) {
          return `${pad}${key}:\n${yamlStringify(value, indent + 1)}`
        }
        return `${pad}${key}: ${yamlStringify(value, indent + 1)}`
      })
      .join('\n')
  }
  return String(val)
}

function buildOpenApiSpec(routes) {
  const paths = {}

  for (const route of routes) {
    const routePath = route.path
    if (!paths[routePath]) {
      paths[routePath] = {}
    }

    const defaultOp = createDefaultOperation(route)
    const override = operationOverrides[route.operationId] || {}

    const operation = {
      ...defaultOp,
      ...override,
      tags: override.tags || defaultOp.tags,
      summary: override.summary || defaultOp.summary,
      operationId: route.operationId,
      'x-service': route.service,
      'x-source': route.source,
    }

    if (route.roles && route.roles.length > 0) {
      operation['x-roles'] = route.roles
    }

    if (route.security && !operation.security) {
      if (route.security === 'bearerAuth') {
        operation.security = [{ bearerAuth: [] }]
      } else if (route.security === 'cookieAccessAuth') {
        operation.security = [{ cookieAccessAuth: [] }]
      } else if (route.security === 'cookieRefreshAuth') {
        operation.security = [{ cookieRefreshAuth: [] }]
      }
    }

    paths[routePath][route.method.toLowerCase()] = operation
  }

  return {
    openapi: '3.1.0',
    info,
    servers,
    tags,
    paths,
    components: {
      securitySchemes,
      schemas,
    },
  }
}

async function main() {
  fs.mkdirSync(generatedDir, { recursive: true })
  fs.mkdirSync(docsSrcPublicDir, { recursive: true })

  const routes = loadSourceRoutes()
  fs.writeFileSync(sourceRoutesPath, JSON.stringify(routes, null, 2), 'utf8')
  fs.writeFileSync(path.join(generatedDir, 'duplicate-routes.json'), '[]', 'utf8')

  const spec = buildOpenApiSpec(routes)
  const specJson = JSON.stringify(spec, null, 2)
  const specYaml = yamlStringify(spec)

  fs.writeFileSync(path.join(generatedDir, 'openapi.json'), specJson, 'utf8')
  fs.writeFileSync(path.join(generatedDir, 'openapi.yaml'), specYaml, 'utf8')

  // Copy to docs-src/public for static hosting & Scalar viewer
  fs.writeFileSync(path.join(docsSrcPublicDir, 'openapi.json'), specJson, 'utf8')
  fs.writeFileSync(path.join(docsSrcPublicDir, 'openapi.yaml'), specYaml, 'utf8')

  const types = generateTypeDeclarations(spec)
  fs.writeFileSync(path.join(generatedDir, 'api-types.d.ts'), `${types}\n`, 'utf8')

  console.log(`OpenAPI specification and TypeScript types successfully generated for ${routes.length} operations.`)
}

main().catch(err => {
  console.error('Error generating OpenAPI spec:', err)
  process.exit(1)
})
