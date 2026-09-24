import fs from 'node:fs'
import path from 'node:path'
import { catalogMetadata } from './route-metadata.mjs'
import { SUMMARIES } from './route-summaries.mjs'

/**
 * Inventario de rutas leído del código de cada Lambda.
 *
 * Recorre `src/index.ts` de cada servicio y reconoce los manejadores por su condición:
 * `httpMethod === 'GET' && path === '/x'`, `['PUT', 'DELETE'].includes(httpMethod)`,
 * `path.match(/^\/(?:internal\/orders|orders)\/([^/]+)$/)`, `path.includes('/x')`, etc.
 *
 * Solo se documenta lo que API Gateway entrega a esa Lambda (ver GATEWAY): muchas rutas
 * aceptan un alias sin `/internal` que desde afuera no llega a ninguna parte, o llega a
 * otra Lambda. De los alias alcanzables se documenta uno y el resto va en `x-aliases`.
 */

/** Prefijo de primer nivel → Lambda que lo atiende (Flowex-iac/lib/constructs/api-gateway.ts). */
export const GATEWAY = {
  auth: 'auth-api-lambda',
  internal: 'auth-admin-lambda',
  orders: 'auth-admin-lambda',
  routes: 'auth-admin-lambda',
  root: 'auth-admin-lambda',
  coupons: 'auth-admin-lambda',
  users: 'auth-admin-lambda',
  registration: 'registration-public-lambda',
  admin: 'registration-admin-lambda',
  otp: 'otp-service-lambda',
  payments: 'payments-api-lambda',
  webhooks: 'payments-api-lambda',
  notifications: 'notification-lambda',
}

/** Excepción del gateway: `POST /notifications/whatsapp` va a otp-service. */
function gatewayTarget(method, routePath) {
  if (method === 'post' && routePath === '/notifications/whatsapp') return 'otp-service-lambda'
  const first = routePath.split('/')[1]
  return GATEWAY[first] || null
}

export const SERVICES = [
  { service: 'auth-api-lambda', repo: 'Flowex-auth-api-lambda' },
  { service: 'auth-admin-lambda', repo: 'Flowex-auth-admin-lambda' },
  { service: 'registration-public-lambda', repo: 'Flowex-registration-public-lambda' },
  { service: 'registration-admin-lambda', repo: 'Flowex-registration-admin-lambda' },
  { service: 'otp-service-lambda', repo: 'Flowex-otp-service-lambda' },
  { service: 'payments-api-lambda', repo: 'Flowex-payments-api-lambda' },
  { service: 'notification-lambda', repo: 'Flowex-notification-lambda' },
]

const TAGS_BY_SEGMENT = {
  auth: 'Auth',
  users: 'Users',
  orders: 'Orders',
  routes: 'Routes',
  hubs: 'Hubs',
  communes: 'Communes',
  coverage: 'Communes',
  fleet: 'Fleet',
  vehicles: 'Fleet',
  drivers: 'Fleet',
  capacity: 'Fleet',
  coupons: 'Coupons',
  root: 'Root',
  tariffs: 'Tariffs',
  'planner-settings': 'Planner Settings',
  invites: 'Invitations',
  registration: 'Registration',
  admin: 'Registration Admin',
  otp: 'OTP & WhatsApp',
  payments: 'Payments',
  webhooks: 'Payments',
  notifications: 'Notifications',
  contacts: 'Contacts',
  consents: 'Consent',
  assignments: 'Routes',
}

// ─────────────────────────── Lectura del código ───────────────────────────

/** Texto balanceado entre paréntesis a partir de `open` (índice del '('). */
function balanced(src, open) {
  let depth = 0
  let inStr = null
  let inRegex = false
  for (let i = open; i < src.length; i++) {
    const c = src[i]
    const prev = src[i - 1]
    if (inStr) {
      if (c === inStr && prev !== '\\') inStr = null
      continue
    }
    if (inRegex) {
      if (c === '/' && prev !== '\\') inRegex = false
      continue
    }
    if (c === "'" || c === '"' || c === '`') { inStr = c; continue }
    // Un '/' que abre una expresión regular viene después de '(' o de un operador.
    if (c === '/' && /[(,=:&|!]\s*$/.test(src.slice(Math.max(0, i - 3), i)) && src[i + 1] !== '/' && src[i + 1] !== '*') {
      inRegex = true
      continue
    }
    if (c === '(') depth++
    else if (c === ')') {
      depth--
      if (depth === 0) return src.slice(open + 1, i)
    }
  }
  return ''
}

/** Expande una expresión regular de ruta en plantillas: `(?:a|b)` → dos rutas, `([^/]+)` → `{param}`. */
export function expandRegex(re) {
  let s = re.replace(/^\^/, '').replace(/\$$/, '')
  let i = 0

  function parseSeq() {
    // Devuelve lista de alternativas, cada una lista de strings (producto cartesiano).
    let alts = [['']]
    let current = ['']
    const pushAlt = () => { alts.push(current); current = [''] }
    alts = []
    while (i < s.length) {
      const c = s[i]
      if (c === ')') break
      if (c === '|') { i++; pushAlt(); continue }
      if (c === '(') {
        i++
        let capturing = true
        if (s.startsWith('?:', i)) { capturing = false; i += 2 }
        const start = i
        const inner = parseSeq()
        const innerSrc = s.slice(start, i)
        i++ // ')'
        let optional = false
        if (s[i] === '?') { optional = true; i++ }
        let options
        if (capturing && /\[|\\d|\\w|\.|\+|\*/.test(innerSrc)) options = ['{param}']
        else options = inner
        if (optional) options = [...options, '']
        current = current.flatMap(prefix => options.map(o => prefix + o))
        continue
      }
      if (c === '[') {
        const end = s.indexOf(']', i)
        i = end + 1
        if (s[i] === '+' || s[i] === '*') i++
        current = current.map(p => p + '{param}')
        continue
      }
      if (c === '\\') {
        const n = s[i + 1]
        i += 2
        if (n === 'd' || n === 'w') {
          if (s[i] === '+' || s[i] === '*') i++
          current = current.map(p => p + '{param}')
        } else {
          current = current.map(p => p + n)
        }
        continue
      }
      if (c === '?' || c === '+' || c === '*') { i++; continue }
      current = current.map(p => p + c)
      i++
    }
    alts.push(current)
    return alts.flat()
  }

  const out = parseSeq()
  return Array.from(new Set(out.map(p => p.replace(/\/+$/, '') || '/')))
}

/** `{param}` → nombre según el segmento anterior: `/hubs/{param}` → `{hubCode}` / `{hubId}`. */
function nameParams(template) {
  const parts = template.split('/')
  const used = new Set()
  return parts
    .map((seg, idx) => {
      if (seg !== '{param}') return seg
      const prev = (parts[idx - 1] || 'id').replace(/-([a-z])/g, (_, l) => l.toUpperCase()).replace(/[^a-zA-Z]/g, '')
      let base = prev.endsWith('ies')
        ? prev.slice(0, -3) + 'y'
        : prev.endsWith('sses')
          ? prev.slice(0, -2)
          : prev.endsWith('s')
            ? prev.slice(0, -1)
            : prev
      let name = `${base}Id`
      let n = 2
      while (used.has(name)) name = `${base}Id${n++}`
      used.add(name)
      return `{${name}}`
    })
    .join('/')
}

function methodsIn(cond) {
  const out = new Set()
  for (const m of cond.matchAll(/httpMethod\s*===\s*'([A-Z]+)'/g)) out.add(m[1].toLowerCase())
  for (const m of cond.matchAll(/\[([^\]]+)\]\.includes\(\s*httpMethod\s*\)/g)) {
    for (const x of m[1].matchAll(/'([A-Z]+)'/g)) out.add(x[1].toLowerCase())
  }
  out.delete('options')
  return [...out]
}

/**
 * Encabezado `// ── GET /x (detalle) ──` más cercano sobre el manejador. Se usa solo el
 * detalle; si el encabezado no dice más que el método y la ruta, no aporta resumen.
 */
function headingBefore(src, idx) {
  const before = src.slice(Math.max(0, idx - 3000), idx).split('\n').slice(-40)
  for (let k = before.length - 1; k >= 0; k--) {
    const m = before[k].match(/\/\/\s*[─-]{2,}\s*(.+?)\s*[─-]{2,}/)
    if (!m) continue
    const detail = m[1]
      .replace(/\b(GET|POST|PUT|PATCH|DELETE)(\s*(\/|or|and|y|o)\s*(GET|POST|PUT|PATCH|DELETE))*\b/g, '')
      .replace(/\/[\w{}:\-/.]+/g, '')
      .replace(/\b(or|and|o|y)\b/g, '')
      .replace(/[(),]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (detail.length < 4 || /^[?&=]/.test(detail)) return null
    return detail.charAt(0).toUpperCase() + detail.slice(1)
  }
  return null
}

const OPERATION_PREFIX = {
  'auth-api-lambda': 'auth',
  'auth-admin-lambda': 'internal',
  'registration-public-lambda': 'registration',
  'registration-admin-lambda': 'admin',
  'otp-service-lambda': 'otp',
  'payments-api-lambda': 'payments',
  'notification-lambda': 'notifications',
}

function rolesIn(body) {
  const roles = new Set()
  for (const m of body.matchAll(/\[((?:\s*'(?:root|admin|driver|client)'\s*,?)+)\]\.includes\([^)]*role/g)) {
    for (const r of m[1].matchAll(/'(\w+)'/g)) roles.add(r[1])
  }
  if (/role\s*!==\s*'root'/.test(body) && roles.size === 0) roles.add('root')
  return [...roles]
}

/**
 * Lee la expresión regular literal que empieza en `start` (el '/'). Un '/' dentro de
 * `[...]` no la cierra: `[^/]+` es lo más común en estas rutas.
 */
function readRegexLiteral(src, start) {
  let inClass = false
  for (let i = start + 1; i < src.length; i++) {
    const c = src[i]
    if (c === '\\') { i++; continue }
    if (c === '\n') return null
    if (inClass) { if (c === ']') inClass = false; continue }
    if (c === '[') { inClass = true; continue }
    if (c === '/') return src.slice(start + 1, i)
  }
  return null
}

/** Todas las `path.match(/.../)` de un texto, como fuentes de expresión regular. */
function pathMatchRegexes(text) {
  const out = []
  for (const m of text.matchAll(/path\.match\(\s*\//g)) {
    const re = readRegexLiteral(text, m.index + m[0].length - 1)
    if (re) out.push(re)
  }
  return out
}

function extractFromSource(svc, src) {
  src = src.replace(/\r\n/g, '\n')
  const matchVars = new Map()
  for (const m of src.matchAll(/const\s+(\w+)\s*=\s*path\.match\(\s*\//g)) {
    const re = readRegexLiteral(src, m.index + m[0].length - 1)
    if (re) matchVars.set(m[1], { templates: expandRegex(re), anchored: re.startsWith('^') })
  }
  const found = []
  // Condiciones: las de un `if (...)` y las guardadas en una constante
  // (`const isClientRoute = httpMethod === 'POST' && (path === ...)`).
  const conditions = []
  for (const m of src.matchAll(/\bif\s*\(/g)) {
    const open = m.index + m[0].length - 1
    conditions.push({ index: m.index, open, cond: balanced(src, open) })
  }
  for (const m of src.matchAll(/const\s+\w+\s*=\s*(?=[\s(]*httpMethod\s*===)/g)) {
    const start = m.index + m[0].length
    const end = src.indexOf(';', start)
    if (end > start) conditions.push({ index: m.index, open: end - 1, cond: src.slice(start, end), assigned: true })
  }
  for (const m of conditions) {
    const { open, cond } = m
    if (!cond || !/httpMethod/.test(cond)) continue
    const methods = methodsIn(cond)
    if (methods.length === 0) continue

    // `exact`: la ruta tal cual (`path === '/x'`, expresiones con ^...$). `partial`: un
    // fragmento (`path.includes('/x')`) al que le falta el prefijo del gateway.
    const paths = new Set()
    const partial = new Set()
    for (const p of cond.matchAll(/path\s*===\s*'([^']+)'/g)) paths.add(p[1])
    for (const p of cond.matchAll(/path\.(?:includes|endsWith|startsWith)\(\s*'([^']+)'\s*\)/g)) partial.add(p[1])
    for (const re of pathMatchRegexes(cond)) {
      for (const t of expandRegex(re)) (re.startsWith('^') ? paths : partial).add(t)
    }
    for (const [v, { templates, anchored }] of matchVars) {
      if (new RegExp(`\\b${v}\\b`).test(cond)) templates.forEach(t => (anchored ? paths : partial).add(t))
    }
    if (paths.size === 0 && partial.size === 0) continue

    const bodyStart = m.assigned ? open + 2 : open + cond.length + 2
    const body = src.slice(bodyStart, bodyStart + 2500)
    const heading = headingBefore(src, m.index)
    const secured = /verifyAuth\(|verifyOperator\(|verifySession\(|requireAuth|verifyToken\(/.test(body)
    found.push({ methods, paths: [...paths], partial: [...partial], heading, secured, roles: rolesIn(body) })
  }
  return found
}

// ───────────────────────────── Inventario final ─────────────────────────────

function slug(routePath) {
  return routePath
    .replace(/[{}]/g, '')
    .split('/')
    .filter(Boolean)
    .map(s => s.replace(/[^a-zA-Z0-9]+/g, '_'))
    .join('_')
}

function tagFor(routePath) {
  const segs = routePath.split('/').filter(Boolean)
  const key = segs[0] === 'internal' || segs[0] === 'root' ? segs[1] || segs[0] : segs[0]
  if (segs[0] === 'root' && !TAGS_BY_SEGMENT[key]) return 'Root'
  return TAGS_BY_SEGMENT[key] || TAGS_BY_SEGMENT[segs[0]] || 'General'
}

/** Clave para comparar rutas sin importar el nombre de los parámetros. */
function normKey(method, routePath) {
  return `${method} ${routePath.replace(/\{[^}]+\}/g, '{}').replace(/\/+$/, '')}`
}

/**
 * Dentro de un mismo manejador, dos rutas son alias si terminan en el mismo segmento fijo
 * (`/registration/tariffs` y `/registration/coverage/tariffs`). Si terminan distinto son
 * operaciones distintas aunque compartan código (`.../approve` y `.../override-activate`).
 */
function aliasGroup(routePath) {
  const segs = routePath.split('/').filter(Boolean)
  const literals = segs.filter(x => !x.startsWith('{'))
  const params = segs.length - literals.length
  return `${literals[literals.length - 1] || ''}#${params}`
}

export function extractFlowexLambdaRoutes({ repoRoot }) {
  const metadata = catalogMetadata({ repoRoot })
  const metaByKey = new Map(metadata.map(r => [normKey(r.method, r.path), r]))
  const byKey = new Map()

  for (const { service, repo } of SERVICES) {
    const file = path.join(repoRoot, repo, 'src', 'index.ts')
    if (!fs.existsSync(file)) continue
    const src = fs.readFileSync(file, 'utf8')
    const prefixes = Object.entries(GATEWAY).filter(([, s]) => s === service).map(([p]) => p)

    for (const h of extractFromSource(service, src)) {
      for (const method of h.methods) {
        // Una ruta exacta que el gateway no entrega a esta Lambda (el alias sin /internal)
        // no se documenta: desde afuera no existe. Un fragmento (`path.includes('/x')`)
        // solo se usa si el manejador no trae la ruta completa, y se completa con el
        // prefijo principal de la Lambda.
        const reachable = new Set()
        const consider = (c) => {
          c = c.replace(/\/+$/, '') || '/'
          if (c.includes('*') || c.includes('undefined')) return
          if (gatewayTarget(method, c) === service) reachable.add(nameParams(c))
        }
        for (let raw of h.paths) consider(raw.startsWith('/') ? raw : `/${raw}`)
        if (reachable.size === 0) {
          for (let raw of h.partial) {
            if (!raw.startsWith('/')) raw = `/${raw}`
            const first = raw.split('/')[1]
            if (GATEWAY[first]) consider(raw)
            else if (prefixes[0]) consider(`/${prefixes[0]}${raw}`)
          }
        }
        if (reachable.size === 0) continue

        const groups = new Map()
        for (const p of reachable) {
          const g = aliasGroup(p)
          groups.set(g, [...(groups.get(g) || []), p])
        }

        for (const group of groups.values()) {
          // Canónica: la ya documentada; si no, la que empieza con /internal; si no, la más corta.
          const list = group.sort((a, b) => {
            const ma = metaByKey.has(normKey(method, a)) ? 0 : 1
            const mb = metaByKey.has(normKey(method, b)) ? 0 : 1
            if (ma !== mb) return ma - mb
            const ia = a.startsWith('/internal/') ? 0 : 1
            const ib = b.startsWith('/internal/') ? 0 : 1
            if (ia !== ib) return ia - ib
            return a.length - b.length
          })
          const meta = list.map(p => metaByKey.get(normKey(method, p))).find(Boolean)
          // Con metadatos se usa su nombre de parámetros (`{email}`, `{userId}`).
          const canonical = meta ? meta.path : list[0]
          const key = normKey(method, canonical)
          if (byKey.has(key)) continue
          const tag = meta?.tag || tagFor(canonical)
          byKey.set(key, {
            service,
            source: `${repo}/src/index.ts`,
            method,
            path: canonical,
            operationId: meta?.operationId || `${OPERATION_PREFIX[service]}_${method}_${slug(canonical.replace(/^\/(internal|auth|registration|admin|otp|payments|notifications)\//, '/'))}`,
            tag,
            tags: meta?.tags || [tag],
            summary: meta?.summary || SUMMARIES[`${method} ${canonical}`] || h.heading || `${method.toUpperCase()} ${canonical}`,
            roles: meta?.roles?.length ? meta.roles : h.roles,
            security: meta ? meta.security : h.secured ? 'bearerAuth' : false,
            ...(list.length > 1 ? { aliases: list.slice(1) } : {}),
          })
        }
      }
    }
  }

  return [...byKey.values()].sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method))
}

/** Entradas del catálogo manual que ya no existen en el código (para limpiar metadatos). */
export function staleCatalogEntries({ repoRoot }) {
  const live = new Set(
    extractFlowexLambdaRoutes({ repoRoot }).flatMap(r => [r.path, ...(r.aliases || [])].map(p => normKey(r.method, p)))
  )
  return catalogMetadata({ repoRoot }).filter(r => !live.has(normKey(r.method, r.path)))
}
