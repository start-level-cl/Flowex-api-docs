# Capa Compartida (Flowex Shared Layer)

El paquete `Flowex-shared-layer` concentra los tipos de datos comunes, utilidades criptográficas, validaciones de identidad para Chile y funciones de respuesta estándar utilizadas transversalmente por todas las funciones Lambda del ecosistema Flowex.

---

## 📦 Estructura del Layer

```
Flowex-shared-layer/
├── src/
│   ├── index.ts          # Punto de exportación unificado
│   ├── rut.ts            # Validador de RUT Chileno (Módulo 11)
│   ├── jwt.ts            # Emisión, verificación y decodificación JWT
│   ├── status-token.ts   # Tokens HMAC-SHA256 de estado de registro
│   ├── response.ts       # Respuestas HTTP normalizadas con cabeceras CORS
│   └── types.ts          # Interfaces y tipos TypeScript
├── package.json
└── tsconfig.json
```

---

## 🛠️ Utilidades Principales

### 1. Validador de RUT Chileno (`rut.ts`)
Implementa la normalización (eliminación de puntos y guiones) y la verificación del dígito verificador mediante el algoritmo Módulo 11.

```typescript
import { validateRut, cleanRut, formatRut } from 'flowex-shared-layer';

// Validación estricta
const isValid = validateRut('18.345.678-K'); // true

// Limpieza para almacenamiento en Base de Datos
const cleaned = cleanRut('18.345.678-k'); // "18345678-K"

// Formateo visual
const formatted = formatRut('18345678K'); // "18.345.678-K"
```

---

### 2. Generador y Validador de JWT (`jwt.ts`)
Centraliza las firmas de tokens de acceso (`1 hora`) y tokens de refresco (`30 días`) utilizando secretos configurables por variables de entorno (`AUTH_JWT_SECRET`).

```typescript
import { signAccessToken, signRefreshToken, verifyToken, extractTokenFromEvent } from 'flowex-shared-layer';

// Firma de Token de Acceso
const accessToken = signAccessToken({
  sub: 'usr_flowex_123',
  email: 'usuario@flowex.cl',
  role: 'client'
});

// Extracción automática desde cabecera Authorization o Cookie
const token = extractTokenFromEvent(event, 'access_token');
```

---

### 3. Status Tokens HMAC-SHA256 (`status-token.ts`)
Permite a usuarios en proceso de onboarding consultar el estado de su solicitud mediante un token autocontenido firmado con HMAC-SHA256, sin necesidad de emitir un token JWT de sesión completa antes de la activación.

```typescript
import { generateStatusToken, verifyStatusToken } from 'flowex-shared-layer';

// Generación de Status Token tras solicitud
const statusToken = generateStatusToken('usuario@gmail.com');

// Verificación en endpoint de consulta
const isValid = verifyStatusToken(statusToken, 'usuario@gmail.com'); // true
```

---

### 4. Normalizador de Respuestas HTTP (`response.ts`)
Genera respuestas compatibles con AWS API Gateway Proxy Integration, incluyendo cabeceras CORS permisivas (`Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials`) y fijación de cookies HttpOnly seguras.

```typescript
import { successResponse, errorResponse } from 'flowex-shared-layer';

// Respuesta Exitosa 200 con Cookies
return successResponse(200, { user, token }, origin, [
  'access_token=...; HttpOnly; Secure; SameSite=None; Path=/',
]);

// Respuesta de Error Controlado
return errorResponse(400, 'RUT inválido', origin);
```
