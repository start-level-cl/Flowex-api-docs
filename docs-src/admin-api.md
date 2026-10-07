# Administración de Usuarios y Overrides Administrativos (Admin API)

Flowex provee endpoints protegidos para la administración central de usuarios dentro de la VPC y para la resolución manual o forzada de solicitudes de registro que requieran intervención humana.

---

## 🔐 Requisitos de Seguridad
* **Endpoints Internos VPC (`/internal/users/*`):** Desplegados en subredes privadas. Requieren token JWT con roles `admin` o `root`.
* **Endpoints de Override (`/admin/registration-requests/*`):** Exigen encabezado `Authorization: Bearer <token>` de un usuario con privilegios `admin` o `root`.

---

## 📡 Endpoints de Administración de Usuarios (VPC)

### 1. Listar Usuarios del Sistema (`GET /internal/users`)
Permite a la consola administrativa consultar todos los usuarios registrados con soporte de búsqueda y filtros, implementando el estándar unificado de paginación Importal con el objeto dual `data`/`users` y metadatos calculados `meta`.

* **Parámetros Query:**
  - `page`: (Opcional, default `1`, 1-indexed) Número de página actual a consultar.
  - `limit`: (Opcional, default `50`, máx `100`) Cantidad máxima de registros por página.
  - `offset`: (Opcional, default `0`) Desplazamiento alternativo para compatibilidad hacia atrás. Si se suministra `page`, se calcula `offset = (page - 1) * limit`.
  - `role`: (Opcional) `'all' | 'root' | 'admin' | 'driver' | 'client'`, o varios separados por coma (`admin,root`). Los valores desconocidos se ignoran; el filtro se aplica antes de paginar.
  - `status`: (Opcional) `'all' | 'active' | 'blocked'`
  - `search`: (Opcional) Búsqueda libre insensible a mayúsculas/minúsculas sobre nombre, email, RUT o teléfono.
* **`summary` (KPI globales):** la respuesta trae `summary` con `total`, `active`, `blocked`, `clients`, `drivers`, `admins`, `roots` y `staff` (admin + root) de **toda** la plataforma, independiente de página, búsqueda y filtros. Son solo conteos: el panel ya no descarga el directorio completo para calcularlos (antes hasta 5.000 cuentas, cada página registrada como acceso a datos personales). Si no se pudo calcular, `summary` es `null` y el listado sale igual.
* **Respuesta Exitosa (`200 OK`):**
```json
{
  "data": [
    {
      "id": "usr_drv_201",
      "userId": "usr_drv_201",
      "name": "Juan Pérez",
      "email": "juan.perez@flowex.cl",
      "phone": "+56 9 9123 4567",
      "role": "driver",
      "rut": "15.432.109-8",
      "isActive": true,
      "isVerified": true,
      "totalOrdersCount": 3,
      "deliveredOrdersCount": 1,
      "createdAt": "2026-08-19T10:30:00.000Z"
    }
  ],
  "users": [
    {
      "id": "usr_drv_201",
      "userId": "usr_drv_201",
      "name": "Juan Pérez",
      "email": "juan.perez@flowex.cl",
      "phone": "+56 9 9123 4567",
      "role": "driver",
      "rut": "15.432.109-8",
      "isActive": true,
      "isVerified": true,
      "totalOrdersCount": 3,
      "deliveredOrdersCount": 1,
      "createdAt": "2026-08-19T10:30:00.000Z"
    }
  ],
  "total": 45,
  "limit": 50,
  "offset": 0,
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 50,
    "last_page": 1
  }
}
```

---

### 2. Crear Usuario Interno (`POST /internal/users`)
* **Roles permitidos para creación:** `root`, `admin`, `driver`, `client`.
* **Cuerpo de Solicitud:**
```json
{
  "name": "Patricio Chofer",
  "email": "patricio.chofer@flowex.cl",
  "password": "PasswordConductor2026!",
  "phone": "+56987654321",
  "role": "driver",
  "rut": "16.789.123-4"
}
```
* **Respuesta Exitosa (`201 Created`):**
```json
{
  "userId": "usr_1771345600000",
  "name": "Patricio Chofer",
  "email": "patricio.chofer@flowex.cl",
  "phone": "+56987654321",
  "role": "driver",
  "rut": "16.789.123-4",
  "createdAt": "2026-08-19T10:50:00.000Z"
}
```

---

### 3. Consultar Expediente 360° del Usuario (`GET /internal/users/{userId}`)
Emite automáticamente el evento de auditoría `PII_ACCESS_AUDIT` a la cola SQS de cumplimiento legal (Ley N° 21.719).

* **Respuesta (`200 OK`):**
```json
{
  "userId": "usr_drv_201",
  "name": "Juan Pérez",
  "email": "juan.perez@flowex.cl",
  "phone": "+56 9 9123 4567",
  "role": "driver",
  "rut": "15.432.109-8",
  "isActive": true,
  "driverDetails": {
    "licenseNumber": "B-15432109",
    "vehicleType": "Furgón Mercedes Sprinter",
    "vehiclePlate": "KJL-942",
    "comprobanteUrl": "https://s3.us-east-2.amazonaws.com/flowex-comprobantes/licencia_juan_perez.pdf"
  },
  "totalOrdersCount": 3,
  "deliveredOrdersCount": 1
}
```

---

### 4. Consultar Historial de Pedidos del Usuario (`GET /internal/users/{userId}/orders`)
Retorna todas las encomiendas vinculadas al usuario (como conductor asignado o como remitente/destinatario) implementando paginación unificada Importal y redacción de datos sensibles por rol (el código de entrega PIN se excluye para remitentes y conductores).

* **Parámetros Query:**
  - `page`: (Opcional, default `1`, 1-indexed) Página actual a consultar.
  - `limit`: (Opcional, default `20`, máx `100`) Límite de pedidos por página.
* **Respuesta (`200 OK`):**
```json
{
  "data": [
    {
      "id": "ord_drv_1",
      "trackingNumber": "FLX-2026-8812",
      "recipientName": "Carlos Mendoza",
      "recipientCommune": "Las Condes",
      "status": "delivered",
      "isPaid": true,
      "totalCost": 5500,
      "packagesCount": 1,
      "createdAt": "2026-08-20T10:30:00.000Z"
    }
  ],
  "userId": "usr_drv_201",
  "userEmail": "juan.perez@flowex.cl",
  "role": "driver",
  "totalOrders": 3,
  "orders": [
    {
      "id": "ord_drv_1",
      "trackingNumber": "FLX-2026-8812",
      "recipientName": "Carlos Mendoza",
      "recipientCommune": "Las Condes",
      "status": "delivered",
      "isPaid": true,
      "totalCost": 5500,
      "packagesCount": 1,
      "createdAt": "2026-08-20T10:30:00.000Z"
    }
  ],
  "meta": {
    "total": 3,
    "page": 1,
    "limit": 20,
    "last_page": 1
  }
}
```

---

### 5. Suspender o Reactivar Cuenta (`PATCH /internal/users/{userId}/status`)
* **Rol requerido: `root` únicamente.** Es la única acción del portal vedada al rol `admin`.
  A cambio, `root` puede aplicarla sobre cualquier otra cuenta, incluidos otros `admin`.
* **Errores:**
  * `400` si falta `isActive`, si se bloquea sin `reason`, o si `reason` supera 500 caracteres.
  * `401` sin token válido.
  * `403` si el solicitante no es `root`.
  * `404` si el usuario no existe en `users`.
  * `409` si `root` intenta bloquear su propia cuenta.
  * `502` si la escritura en base de datos falla (no se reporta un éxito falso).
* **Cuerpo de Solicitud:** `reason` es obligatorio al bloquear y opcional al reactivar.
```json
{
  "isActive": false,
  "reason": "Fraude documentado en 3 envíos"
}
```
* **Respuesta (`200 OK`):**
```json
{
  "message": "Estado de usuario actualizado correctamente",
  "userId": "usr_drv_201",
  "isActive": false,
  "reason": "Fraude documentado en 3 envíos",
  "blockedAt": "2026-09-15T12:00:00.000Z",
  "sessionsRevokedAt": "2026-09-15T12:00:00.000Z",
  "persisted": true
}
```

El cambio se escribe en `users` (`is_active`, `blocked_origin`, `blocked_reason`,
`blocked_by_id`, `blocked_at`) y estampa `sessions_revoked_at`, que es lo que invalida los
tokens ya emitidos. `persisted: false` indica que no había base configurada y el cambio
solo vive en memoria (modo demostración). Ver migración `028_user_blocking.sql`.

---

### 6. Actualizar Datos de Usuario (`PUT /internal/users/{userId}`)
* **Cuerpo de Solicitud:**
```json
{
  "name": "Patricio Chofer Modificado",
  "phone": "+56999881122",
  "isActive": true
}
```
* **Respuesta (`200 OK`):**
```json
{
  "message": "Usuario actualizado correctamente",
  "userId": "usr_1771345600000",
  "updatedFields": {
    "name": "Patricio Chofer Modificado",
    "phone": "+56999881122",
    "isActive": true
  }
}
```

---

### 7. Eliminar Usuario (`DELETE /internal/users/{userId}`)
* **Respuesta (`200 OK`):**
```json
{
  "message": "Usuario usr_1771345600000 eliminado correctamente"
}
```

---

### 8. Libreta de Contactos Frecuentes (`GET /internal/contacts`)

> **Solo bajo `/internal`.** La lambda también reconoce `/contacts/...`, pero API Gateway no
> expone ese prefijo: una llamada a `/contacts/...` no llega al servicio y la puerta de enlace
> responde `403 Missing Authentication Token`. Vale para todas las rutas de esta sección y de
> la siguiente (libreta, base de licitud, supresión y avisos al remitente).

Permite a clientes y administradores consultar la agenda de contactos frecuentes para despacho con base legal registrada conforme a la Ley N° 21.719 de Protección de Datos Personales.

* **Parámetros Query:**
  - `page`: (Opcional, default `1`, 1-indexed) Página actual solicitada.
  - `limit`: (Opcional, default `50`, máx `100`) Cantidad de registros por página.
  - `q`: (Opcional) Término de búsqueda por nombre completo, comuna, dirección o teléfono.
* **Respuesta (`200 OK`):** la colección va **solo en `data`**. Es la única excepción al formato dual de los listados: hasta octubre de 2026 se repetía en `contacts`, que duplicaba el tamaño de la respuesta.
```json
{
  "success": true,
  "data": [
    {
      "id": "cnt_1771344928000",
      "ownerId": "usr_client_101",
      "fullName": "Beatriz Morales",
      "phone": "+56 9 8765 4321",
      "commune": "Providencia",
      "streetAddress": "Av. Providencia 1234, Of. 502",
      "createdAt": "2026-08-20T10:30:00.000Z"
    }
  ],
  "total": 14,
  "meta": {
    "total": 14,
    "page": 1,
    "limit": 50,
    "last_page": 1
  },
  "lawfulBasis": {
    "version": "1.0",
    "text": "Tratamiento fundado en la ejecución de la relación contractual y el consentimiento del titular (Ley N° 21.719)"
  }
}
```

---

### 9. Solicitudes de Supresión de Datos Personales (`GET /internal/contacts/erasure-requests`)
Supresión de datos de titulares sin cuenta cuyo teléfono aparece en la libreta de algún cliente (Ley N° 21.719). El trámite es **automático**; el personal (`admin`, `root`) lo sigue y solo interviene en casos puntuales.

**Flujo**
1. `POST /internal/contacts/erasure-requests/verification` (público): `{ claimantPhone, claimantEmail }`. Envía un código de 6 dígitos **por WhatsApp al teléfono** (plantilla `flowex_otp_code`) y responde `{ verificationId, expiresInSeconds }`. Guarda solo la huella del teléfono. Topes: 3 códigos por teléfono y hora, 5 por origen y hora, 60 s entre códigos. Si WhatsApp no lo entrega: `502 ERASURE_CODE_NOT_SENT`, con la indicación de escribir a privacidad@flowex.cl.
2. `POST /internal/contacts/erasure-requests` (público): `{ claimantPhone, claimantEmail, verificationId, code }`. Valida el código (5 intentos, 10 minutos, solo para ese teléfono), crea el folio y **en el acto** busca el teléfono en las libretas y avisa a cada remitente (`CONTACT_ERASURE_NOTICE`), con 10 días corridos para responder. Si no está en ninguna libreta, cierra y responde `sin_datos`.
3. El remitente responde desde su libreta (ver más abajo). Cuando respondieron todos, o vence el plazo, se cierra: se purga el contacto en las libretas sin oposición (solo `contact_book`; los pedidos conservan su copia por obligación tributaria), se le responde al titular (`CONTACT_ERASURE_RESOLVED`, con las causales si las hubo) y se borran su teléfono y su correo. Queda la huella `claimant_subject`.
4. La tarea programada cada 15 minutos (la misma de la planificación de rutas) reintenta los avisos que no salieron y cierra las vencidas.

**Causales para conservar** (catálogo cerrado, `causes` en las respuestas): `relacion_contractual`, `obligacion_legal`, `defensa_reclamaciones`. No hay causal de "autorización del titular": pedir la supresión es retirarla.

**Ninguna respuesta lleva datos de quien reclama**, ni completos ni enmascarados.

* **Listado (`GET`):** `page`, `limit` (default 50, máx 100). Filtros, todos sobre el trámite y nunca sobre los datos de quien reclama: `status` (un estado, o `abiertas` / `cerradas`), `deadline` (`vencido` / `por_vencer`, dos días o menos), `withCauses=true` (conservadas en alguna libreta por una causal) y `ticket` (folio o parte). `total` respeta los filtros; `pending` cuenta siempre toda la cola. Cada solicitud trae `ticket`, `status`, fechas, `matchedOwners`, `responsesCount`, `rejectionCauses`, `hasOwnerResponse`, `hasResolutionNote`; las notas, que son texto libre, solo en la ficha. No se registra como uso de datos.
```json
{
  "success": true,
  "requests": [
    {
      "id": "e0000000-0000-0000-0000-000000000001",
      "ticket": "SUP-20260910-1234",
      "status": "notificada",
      "statusLabel": "Remitente notificado, en plazo para acreditar legitimidad",
      "matchedContacts": 2,
      "matchedOwners": ["b1c2…", "c3d4…"],
      "notifiedAt": "2026-09-10T13:05:00.000Z",
      "responseDeadlineAt": "2026-09-20T13:05:00.000Z",
      "responsesCount": 1,
      "rejectionCauses": [],
      "hasOwnerResponse": true,
      "hasResolutionNote": false,
      "createdAt": "2026-09-10T12:00:00.000Z"
    }
  ],
  "total": 5,
  "pending": 2,
  "meta": { "total": 5, "page": 1, "limit": 50, "last_page": 1 },
  "causes": { "relacion_contractual": "Hay un contrato vigente con usted que requiere estos datos para cumplirse", "…": "…" }
}
```
* **Ficha (`GET …/{ticket}`):** agrega `ownerResponses` (`ownerName` con el primer nombre, `decision`, `cause`, `causeLabel`, `note`) y `resolutionNote`. Cada lectura se registra como `VIEW_ERASURE_REQUEST_DETAIL`.
* **Acciones del personal (`POST …/{ticket}/{acción}`):** `process` (alias `identify`/`notify`) reintenta la búsqueda y el aviso; `purge` cierra una vencida sin esperar la tarea programada (`409` si no se buscó, si falta el aviso o si el plazo está abierto); `reject` conserva el dato en todas las libretas: exige `cause` del catálogo y `note` de al menos 10 caracteres (constancia interna, no va al titular). Si la respuesta al titular no se puede encolar: `502 ERASURE_ANSWER_NOT_SENT` y la solicitud sigue abierta.

#### Avisos para el remitente (rol cliente)
* **`GET /internal/contacts/erasure-notices`:** solicitudes abiertas sobre su libreta, con sus propios contactos afectados (`contacts`), el teléfono enmascarado, el plazo y su respuesta si ya respondió. Trae `causes`.
* **`POST /internal/contacts/erasure-notices/{ticket}/respond`:** `{ decision: "eliminar" | "conservar", cause?, note? }`. Conservar exige una `cause` del catálogo (`400 ERASURE_CAUSE_REQUIRED`). Una respuesta por remitente (`409 ERASURE_ALREADY_ANSWERED`); fuera de plazo, `409 ERASURE_DEADLINE_PASSED`. Si era el último en responder, la solicitud se cierra en el acto.

---

### 10. Gestión de Invitaciones de Acceso (`GET /internal/invites`)
Permite a roles `root` y `admin` listar las invitaciones de onboarding emitidas para usuarios con roles `admin` y `driver`, con enlace temporal y control de expiración.

* **Parámetros Query:**
  - `page`: (Opcional, default `1`, 1-indexed) Página actual solicitada.
  - `limit`: (Opcional, default `20`, máx `100`) Límite de invitaciones por página.
* **Respuesta (`200 OK`):**
```json
{
  "data": [
    {
      "id": "inv_1771344928000",
      "token": "a8f3b2c1...",
      "role": "driver",
      "targetEmail": "nuevo.conductor@flowex.cl",
      "expiresAt": "2026-09-28T23:59:59.000Z"
    }
  ],
  "invites": [
    {
      "id": "inv_1771344928000",
      "token": "a8f3b2c1...",
      "role": "driver",
      "targetEmail": "nuevo.conductor@flowex.cl",
      "expiresAt": "2026-09-28T23:59:59.000Z"
    }
  ],
  "total": 12,
  "meta": {
    "total": 12,
    "page": 1,
    "limit": 20,
    "last_page": 1
  }
}
```

---

### 11. Cupones de promoción (`GET /internal/root/coupons`, solo `root`)
Listado paginado de cupones con el formato dual (`data` y `coupons`, más `total` y `meta`).

* **Parámetros Query:** `page`, `limit` (máx `100`), `isActive` (`true`/`false`), `search` (código, descripción o creador; alias `code`; los comodines se tratan como texto) y `creator` (solo creador).
* **`summary` (KPI globales):** `total`, `active` (`is_active`, como siempre), `usable` (activos, vigentes y con usos disponibles: los que se pueden canjear hoy), `redemptions` (suma de canjes) y `discountApplied` (descuento aplicado en canjes vigentes). Son de **todos** los cupones, independientes de página y filtros; antes el panel los sumaba sobre los primeros 50. `null` si no se pudo calcular.
* **Errores:** si la base no responde, `503` (antes respondía una lista vacía con total 0, que se leía como «no hay cupones»).

---

## ⚡ Overrides Administrativos y Activación Forzada

### 1. Activación Manual por HTTP (`POST /admin/registration-requests/{email}/override-activate`)
Permite a un administrador forzar la activación de una solicitud de registro saltando la verificación de OTP.

* **Parámetro URL:** `email` (URL Encoded).
* **Cuerpo de Solicitud Opcional:**
```json
{
  "reviewedBy": "admin_central",
  "role": "client",
  "notes": "Cliente corporativo validado presencialmente en oficina"
}
```
* **Respuesta Exitosa (`200 OK`):**
```json
{
  "message": "Registro forzado/activado manualmente por administrador",
  "email": "cliente.empresa@gmail.com",
  "reviewedBy": "admin_central",
  "assignedRole": "client",
  "status": "APPROVED"
}
```

---

### 2. Invocación Directa por Evento IAM (AWS SDK / CLI)
`Flowex-registration-admin-lambda` soporta payloads de invocación directa para integraciones automatizadas o scripts administrativos internos:

```json
{
  "action": "FORCE_ACTIVATE",
  "email": "cliente.empresa@gmail.com",
  "reviewedBy": "lambda_batch_job",
  "notes": "Aprobación masiva por proceso nocturno"
}
```
* **Acciones soportadas:** `GET`, `FORCE_ACTIVATE`, `REJECT`, `REGISTER_USER`.
