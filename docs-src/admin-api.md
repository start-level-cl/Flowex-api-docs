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
  - `role`: (Opcional) `'all' | 'root' | 'admin' | 'driver' | 'client'`
  - `status`: (Opcional) `'all' | 'active' | 'blocked'`
  - `search`: (Opcional) Búsqueda libre insensible a mayúsculas/minúsculas sobre nombre, email, RUT o teléfono.
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

### 8. Libreta de Contactos Frecuentes (`GET /contacts` o `GET /internal/contacts`)
Permite a clientes y administradores consultar la agenda de contactos frecuentes para despacho con base legal registrada conforme a la Ley N° 21.719 de Protección de Datos Personales.

* **Parámetros Query:**
  - `page`: (Opcional, default `1`, 1-indexed) Página actual solicitada.
  - `limit`: (Opcional, default `50`, máx `100`) Cantidad de registros por página.
  - `q`: (Opcional) Término de búsqueda por nombre completo, comuna, dirección o teléfono.
* **Respuesta (`200 OK`):**
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
  "contacts": [
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

### 9. Solicitudes de Supresión de Datos Personales (`GET /contacts/erasure-requests` o `GET /internal/contacts/erasure-requests`)
Bandeja de solicitudes de ejercicio de derechos ARCO (supresión / derecho al olvido) bajo la Ley N° 21.719 para supervisión de oficiales de protección de datos y administradores.

* **Parámetros Query:**
  - `page`: (Opcional, default `1`, 1-indexed) Página actual.
  - `limit`: (Opcional, default `20`, máx `100`) Límite de solicitudes por página.
* **Respuesta (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "era_1771344928000",
      "requesterName": "Carolina Soto",
      "contactIdentifier": "c***@gmail.com",
      "status": "pendiente",
      "requestedAt": "2026-09-18T14:20:00.000Z"
    }
  ],
  "requests": [
    {
      "id": "era_1771344928000",
      "requesterName": "Carolina Soto",
      "contactIdentifier": "c***@gmail.com",
      "status": "pendiente",
      "requestedAt": "2026-09-18T14:20:00.000Z"
    }
  ],
  "total": 5,
  "pending": 2,
  "meta": {
    "total": 5,
    "page": 1,
    "limit": 20,
    "last_page": 1
  }
}
```

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
