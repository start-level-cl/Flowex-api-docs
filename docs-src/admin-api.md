# Administración de Usuarios y Overrides Administrativos (Admin API)

Flowex provee endpoints protegidos para la administración central de usuarios dentro de la VPC y para la resolución manual o forzada de solicitudes de registro que requieran intervención humana.

---

## 🔐 Requisitos de Seguridad
* **Endpoints Internos VPC (`/internal/users/*`):** Desplegados en subredes privadas. Requieren token JWT con roles `admin` o `root`.
* **Endpoints de Override (`/admin/registration-requests/*`):** Exigen encabezado `Authorization: Bearer <token>` de un usuario con privilegios `admin` o `root`.

---

## 📡 Endpoints de Administración de Usuarios (VPC)

### 1. Crear Usuario Interno (`POST /internal/users`)
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

### 2. Consultar Usuario por ID (`GET /internal/users/{userId}`)
* **Respuesta (`200 OK`):**
```json
{
  "userId": "usr_1771345600000",
  "name": "Patricio Chofer",
  "email": "patricio.chofer@flowex.cl",
  "role": "driver",
  "isActive": true
}
```

---

### 3. Actualizar Datos de Usuario (`PUT /internal/users/{userId}`)
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

### 4. Eliminar Usuario (`DELETE /internal/users/{userId}`)
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
