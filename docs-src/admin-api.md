# Administración de Usuarios y Overrides Administrativos (Admin API)

Flowex provee endpoints protegidos para la administración central de usuarios dentro de la VPC y para la resolución manual o forzada de solicitudes de registro que requieran intervención humana.

---

## 🔐 Requisitos de Seguridad
* **Endpoints Internos VPC (`/internal/users/*`):** Desplegados en subredes privadas. Requieren token JWT con roles `admin` o `root`.
* **Endpoints de Override (`/admin/registration-requests/*`):** Exigen encabezado `Authorization: Bearer <token>` de un usuario con privilegios `admin` o `root`.

---

## 📡 Endpoints de Administración de Usuarios (VPC)

### 1. Listar Usuarios del Sistema (`GET /internal/users`)
Permite a la consola administrativa consultar todos los usuarios registrados con soporte de búsqueda y filtros.

* **Parámetros Query:**
  - `role`: (Opcional) `'all' | 'root' | 'admin' | 'driver' | 'client'`
  - `status`: (Opcional) `'all' | 'active' | 'blocked'`
  - `search`: (Opcional) Filtro de coincidencia por nombre, email, rut o teléfono.
  - `limit`: (Opcional, default 50)
  - `offset`: (Opcional, default 0)
* **Respuesta Exitosa (`200 OK`):**
```json
{
  "total": 4,
  "limit": 50,
  "offset": 0,
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
      "totalOrdersCount": 3,
      "deliveredOrdersCount": 1
    }
  ]
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
Retorna todas las encomiendas vinculadas al usuario (como conductor asignado o como remitente/destinatario).

* **Respuesta (`200 OK`):**
```json
{
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
  ]
}
```

---

### 5. Suspender o Reactivar Cuenta (`PATCH /internal/users/{userId}/status`)
* **Cuerpo de Solicitud:**
```json
{
  "isActive": false,
  "reason": "Suspensión preventiva administrativa"
}
```
* **Respuesta (`200 OK`):**
```json
{
  "message": "Estado de usuario actualizado correctamente",
  "userId": "usr_drv_201",
  "isActive": false
}
```

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
