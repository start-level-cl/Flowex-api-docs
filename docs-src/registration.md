# Flujo de Registro y Validación de RUT (Registration)

El proceso de registro en Flowex (`Flowex-registration-public-lambda`) implementa una secuencia de validaciones estrictas, onboarding ligero sin direcciones fijas y carga opcional de documentación en Amazon S3 antes de someter la cuenta al proceso de verificación por OTP o revisión administrativa.

---

## 🏛️ Principio de Diseño: Direcciones Dinámicas por Orden

> [!IMPORTANT]
> **No se requieren direcciones fijas en el registro:**
> En la arquitectura logística de Flowex, los clientes finales (`client`) **no están obligados a registrar una dirección física fija** (`streetAndNumber`, `housingType`, `region`, `comuna`).
>
> Dado que los puntos de origen y destino pueden variar en cada transacción comercial (retiros desde bodegas, oficinas, sucursales o domicilios a diferentes destinatarios), las direcciones de recolección (pickup) y de entrega (delivery) se ingresan de forma **100% dinámica e individual en cada pedido mediante el endpoint `POST /orders`**.

---

## 📋 Reglas de Validación de Negocio

### 1. Validación de RUT Chileno (Algoritmo Módulo 11)
Todo usuario debe ingresar un RUT válido en Chile. El sistema procesa el cuerpo numérico y calcula el dígito verificador esperado mediante la fórmula:

$$\text{Suma} = \sum_{i=0}^{n} d_i \times m_i \quad \text{donde } m \in [2, 3, 4, 5, 6, 7]$$

$$\text{Resto} = 11 - (\text{Suma} \pmod{11})$$

$$\text{DV} = \begin{cases} \text{'0'}, & \text{si Resto} = 11 \\ \text{'K'}, & \text{si Resto} = 10 \\ \text{Resto}, & \text{en otro caso} \end{cases}$$

Si el dígito verificador no coincide, la solicitud es rechazada inmediatamente con error `400 Bad Request`.

### 2. Formato de Teléfono Celular (Estándar E.164)
* Debe comenzar con el prefijo internacional de Chile `+569` seguido de 8 dígitos numéricos (ejemplo: `+56987654321`) o formato internacional general `+\d{7,15}`.

### 3. Fortaleza de la Contraseña
* Longitud mínima de **8 caracteres**.
* Al menos **1 letra mayúscula** (`A-Z`).
* Al menos **1 letra minúscula** (`a-z`).
* Al menos **1 número** (`0-9`).
* Al menos **1 carácter especial** (`!@#$%^&*()_+-=[]{};':"|,.<>/?`).

### 4. Carga de Comprobantes a Amazon S3
* Formatos admitidos: `image/jpeg`, `image/png`, `application/pdf`.
* Tamaño máximo por archivo: **5 MB**.
* El comprobante se almacena automáticamente en el bucket S3 en la ruta: `comprobantes/{email}/{timestamp}_{fileName}`.

---

## 🔄 Diagrama de Secuencia del Registro

```mermaid
sequenceDiagram
    autonumber
    actor Solicitante as Nuevo Cliente / Chofer
    participant WebApp as Flowex Frontend
    participant RegLambda as Registration Lambda
    participant S3 as Amazon S3 Bucket
    participant OTPService as Flowex-otp-service-lambda

    Solicitante->>WebApp: Completa formulario de registro (datos de identidad)
    WebApp->>RegLambda: POST /registration/client o POST /registration/requests
    Note over RegLambda: Valida RUT (Módulo 11), Teléfono E.164 y Password (Sin exigir dirección física fija)
    opt Adjunta comprobante / licencia
        RegLambda->>S3: PutObjectCommand (archivo en S3)
        S3-->>RegLambda: comprobanteKey generado
    end
    RegLambda-->>WebApp: 201 Created (status: PENDING_VERIFICATION, requires_otp: true)
    
    WebApp->>OTPService: POST /otp/send { email, phone }
    OTPService-->>Solicitante: Envío de OTP vía WhatsApp / SMS
```

---

## 📡 Endpoints del Módulo de Registro

### 1. Registro Directo de Cliente (`POST /registration/client`)
Endpoint optimizado para el onboarding público de clientes finales sin solicitar datos domiciliarios fijos.

* **Campos Requeridos**: `email`, `name`, `rut`, `phone`, `password`, `consentimiento`.
* **Campos Opcionales**: `transportType`, `facturaRequired`, `razonSocial`, `rutEmpresa`, `giro`.

#### Ejemplo de Solicitud:
```json
{
  "email": "juan.cliente@gmail.com",
  "name": "Juan Pérez Silva",
  "rut": "18.345.678-K",
  "phone": "+56991234567",
  "password": "PasswordSegura2026!",
  "consentimiento": true,
  "transportType": ["maritimo", "aereo"],
  "facturaRequired": false
}
```

#### Respuesta Exitosa (`201 Created`):
```json
{
  "message": "Solicitud de cliente registrada correctamente. Proceda a validar mediante OTP.",
  "request": {
    "email": "juan.cliente@gmail.com",
    "name": "Juan Pérez Silva",
    "rut": "18345678-K",
    "phone": "+56991234567",
    "role": "client",
    "status": "PENDING_VERIFICATION",
    "is_verified": false,
    "is_email_verified": false,
    "is_phone_verified": false,
    "createdAt": "2026-08-24T14:30:00.000Z"
  },
  "requires_otp": true
}
```

---

### 2. Solicitud General de Registro (`POST /registration/requests`)
Permite registrar solicitudes de clientes o conductores. Para clientes, no se requiere ningún campo de dirección fija; para choferes se debe proveer el token de invitación y datos vehiculares.

#### Ejemplo Solicitud: Cliente (`role: client`)
```json
{
  "email": "andrea.cliente@gmail.com",
  "name": "Andrea Morales Silva",
  "rut": "19.876.543-2",
  "phone": "+56991234567",
  "password": "PasswordSegura2026!",
  "role": "client",
  "consentimiento": true,
  "transportType": ["maritimo"],
  "facturaRequired": true,
  "razonSocial": "Morales Logística SpA",
  "rutEmpresa": "76.123.456-7",
  "giro": "Servicios de Distribución"
}
```

> [!NOTE]
> Si el payload incluye campos heredados (`housingType`, `streetAndNumber`, `region`, `comuna`), estos son tratados como opcionales e informativos. La logística operativa de retiro y entrega se resolverá dinámicamente en `POST /orders`.

#### Ejemplo Solicitud: Conductor / Repartidor (`role: driver`)
```json
{
  "email": "carlos.chofer@gmail.com",
  "name": "Carlos Chofer González",
  "rut": "15.987.654-3",
  "phone": "+56987654321",
  "password": "DriverPassword2026!",
  "role": "driver",
  "inviteToken": "INV-DRV-2026-8921",
  "consentimiento": true,
  "licenseNumber": "LIC-15987654-CL",
  "vehicleType": "Furgón / Camioneta",
  "vehiclePlate": "LJ-89-21",
  "comprobante": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "comprobanteFileName": "licencia_conducir.jpg"
}
```

#### Respuesta Exitosa (`201 Created`):
```json
{
  "message": "Solicitud registrada correctamente. Proceda a validar mediante OTP.",
  "request": {
    "email": "andrea.cliente@gmail.com",
    "name": "Andrea Morales Silva",
    "rut": "19876543-2",
    "phone": "+56991234567",
    "role": "client",
    "status": "PENDING_VERIFICATION",
    "is_verified": false,
    "is_email_verified": false,
    "is_phone_verified": false,
    "createdAt": "2026-08-24T14:30:00.000Z"
  },
  "requires_otp": true
}
```

---

### 3. Registro por Invitación (`POST /registration/invite`)
Permite a usuarios invitados (administradores o choferes) completar su alta mediante un `inviteToken` validado (`INV-ADM-...` o `INV-DRV-...`).

---

### 4. Consultar Estado de Solicitud (`GET /registration/requests/{email}/status`)
Retorna el estado de verificación y si la solicitud requiere validación por OTP.

* **Parámetro URL:** `email` (URL Encoded).
* **Respuesta (`200 OK`):**
```json
{
  "exists": true,
  "email": "juan.cliente@gmail.com",
  "status": "PENDING_VERIFICATION",
  "is_verified": false,
  "is_email_verified": false,
  "is_phone_verified": false,
  "requires_otp": true
}
```

---

### 5. Actualizar Datos de Contacto (`PUT /registration/requests/{email}/update-contact`)
Permite corregir el número de teléfono o correo en caso de haberlo ingresado con error durante el onboarding inicial.

* **Cuerpo de Solicitud:**
```json
{
  "phone": "+56999887766",
  "email": "juan.perez.nuevo@gmail.com"
}
```
* **Respuesta (`200 OK`):**
```json
{
  "message": "Contact updated successfully",
  "originalEmail": "juan.cliente@gmail.com",
  "updatedEmail": "juan.perez.nuevo@gmail.com",
  "updatedPhone": "+56999887766"
}
```

---

### 6. Re-subir Comprobante (`PUT /registration/requests/{email}/reupload-comprobante`)
Permite reemplazar un documento rechazado o ilegible.

* **Cuerpo de Solicitud:**
```json
{
  "comprobante": "data:application/pdf;base64,JVBERi0xLjQK...",
  "comprobanteFileName": "nuevo_comprobante.pdf"
}
```
* **Respuesta (`200 OK`):**
```json
{
  "message": "Comprobante reuploaded successfully",
  "comprobanteKey": "comprobantes/juan.cliente%40gmail.com/1771344500000_nuevo_comprobante.pdf",
  "status": "PENDING_VERIFICATION"
}
```

