import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateTypeDeclarations } from './lib/typegen.mjs'

const docsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const generatedDir = path.join(docsRoot, 'generated')
const specPath = path.join(generatedDir, 'openapi.json')

if (!fs.existsSync(specPath)) {
  throw new Error('Falta generated/openapi.json. Ejecuta primero npm run build')
}

const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'))
fs.writeFileSync(path.join(generatedDir, 'api-types.d.ts'), `${generateTypeDeclarations(spec)}\n`)

console.log('Tipos TypeScript regenerados')
