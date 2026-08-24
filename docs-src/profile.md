# Módulo Estandarizado de Perfil de Usuario (Standardized Profile Module)

El **Módulo Estandarizado de Perfil de Usuario** de Flowex proporciona una arquitectura unificada y modular para la gestión integral de identidad, libreta de direcciones para despachos, información tributaria para facturación electrónica (DTE), preferencias de notificación multicanal y trazabilidad regulatoria de consentimiento informado conforme a la legislación chilena (**Ley N° 21.719 sobre Protección de Datos Personales**).

Este módulo es transversal a todos los roles de la plataforma (`root`, `admin`, `driver`, `client`, `customer`).

---

## 🏛️ Arquitectura del Módulo de Perfil

```mermaid
graph TD
    User([Usuario Flowex]) --> PM[Módulo Estandarizado de Perfil]

    subgraph "Capas del Perfil"
        PM --> SecA["A. Identidad & Credenciales<br>• Avatar Dinámico<br>• Roles & Insignias<br>• Estado de Verificación"]
        PM --> SecB["B. Datos Personales<br>• RUT Validado Módulo 11<br>• Email Verificado OTP<br>• Teléfono E.164 +569"]
        PM --> SecC["C. Libreta de Direcciones<br>• Bodegas & Sucursales<br>• Dirección Principal (isDefault)<br>• Integración POST /orders"]
        PM --> SecD["D. Facturación DTE<br>• Razón Social & Giro<br>• RUT Empresa Módulo 11<br>• Dirección & Correo DTE"]
        PM --> SecE["E. Notificaciones Multicanal<br>• Amazon SES (Email)<br>• Meta WhatsApp Cloud API<br>• Amazon SNS (SMS)"]
        PM --> SecF["F. Consentimiento Legal<br>• Cumplimiento Ley N° 21.719<br>• Trazabilidad IP & Timestamp<br>• Suspensión Automática"]
    end

    SecC --> Dispatch["Motor de Creación de Envíos<br>(POST /orders)"]
    SecD --> Invoicing["Emisión de Facturas SII<br>(DTE Electrónico)"]
    SecE --> NotificationService["Flowex-notification-lambda &<br>Flowex-otp-service-lambda"]
```

---

## 🧩 Componentes y Secciones del Perfil

### 1. Cabecera de Identidad y Roles
* **Avatar y Estado:** Selector visual de avatares predeterminados y anillo indicador de estado en tiempo real (activo/en línea).
* **Insignias de Rol (`RoleBadge`):** Renderizado semántico de roles (`root`, `admin`, `driver`, `client`, `customer`) con control de privilegios.
* **Badge de Verificación:** Indicador de cuenta verificada por OTP y cumplimiento legal.

### 2. Datos Personales y Validación Chilena
* **Algoritmo Módulo 11:** Validación matemática estricta y formateo automático de RUT (`XX.XXX.XXX-X`).
* **Formato Telefónico E.164:** Normalización chilena a formato internacional (`+56 9 XXXX XXXX`).
* **Seguridad de Credenciales:** Validación de complejidad de contraseñas (mínimo 8 caracteres, mayúscula, minúscula, número y símbolo).

### 3. Libreta de Direcciones Frecuentes (Address Book)
Permite al usuario gestionar múltiples ubicaciones (bodegas centrales, oficinas, sucursales de despacho y retiro) para autocompletar dinámicamente las solicitudes de envío (`POST /orders`).
* **Dirección Predeterminada (`isDefault`):** Una única dirección principal activa para retiros. Al marcar una nueva como principal, el sistema reajusta automáticamente las demás.
* **Campos estructurados:** Alias, calle, número, departamento/módulo, ciudad/comuna, región, código postal y referencias para el conductor.

### 4. Datos de Facturación Tributaria (DTE)
Configuración centralizada para la emisión automática de Facturas Electrónicas de Transporte y Servicios Logísticos autorizadas por el SII:
* **Razón Social:** Nombre legal de la empresa o persona jurídica.
* **RUT Empresa:** RUT corporativo con validación Módulo 11.
* **Giro Comercial:** Actividad económica registrada en SII.
* **Dirección Tributaria & Correo:** Destino oficial para el envío de los XML y PDF de facturación.

### 5. Preferencias de Notificaciones Multicanal
Panel de control granular para activar o desactivar alertas transaccionales:
* **Amazon SES (Email):** Notificaciones transaccionales de órdenes, resúmenes y comprobantes PDF.
* **Meta WhatsApp Cloud API:** Alertas instantáneas de entrega, fotos POD y código PIN de 4 dígitos.
* **Amazon SNS (SMS):** Canal de respaldo para mensajes críticos de verificación.

> [!IMPORTANT]
> **Vinculación con Consentimiento:** Las notificaciones multicanal requieren que el consentimiento de tratamiento de datos personales esté activo. Si el usuario revoca su consentimiento, todos los canales externos se suspenden inmediatamente.

### 6. Consentimiento Legal y Cumplimiento Regulatorio (Ley N° 21.719)
Flowex implementa un registro auditable e inmutable de consentimiento informado para el tratamiento de datos personales bajo la **Ley N° 21.719** de Chile y normativas internacionales (GDPR):
* **Versión de Política:** Control de versiones contractuales (ej. `v2.4 (Ley N° 21.719)`).
* **Trazabilidad & Huella:** Registro inmutable de fecha/hora (`timestamp` ISO), dirección IP de origen (`ipAddress`) y canal (`web_registration`, `web_settings`).
* **Finalidades Granulares:** Separación explícita entre finalidades esenciales (contractuales) y accesorias/funcionales.
* **Revocabilidad Potestativa:** Capacidad del titular de suspender o habilitar finalidades no esenciales en cualquier momento desde su perfil de usuario.

---

## 🔒 Endpoints de Revisión y Gestión de Consentimiento

El módulo de perfil y autenticación expone las siguientes rutas REST para el autoservicio del titular y la inspección forense administrativa:

### 1. `GET /users/me/consentimiento` (o `/auth/consent`)
Consulta el estado vigente del consentimiento otorgado y el desglose detallado de finalidades autorizadas para el usuario autenticado.

* **Método:** `GET`
* **Autenticación:** Requerida (`Bearer <JWT>` o cookie HttpOnly `access_token`).
* **Respuesta Exitosa (`200 OK`):**
```json
{
  "userId": "usr_client_1771344000",
  "appId": "flowex",
  "status": "GRANTED",
  "policyVersion": "v2.4",
  "channel": "web_registration",
  "purposes": [
    {
      "purpose": "terms_and_conditions",
      "name": "Términos y Condiciones del Servicio",
      "description": "Aceptación obligatoria para la prestación del servicio logístico",
      "granted": true,
      "essential": true
    },
    {
      "purpose": "operational_notifications",
      "name": "Notificaciones Operacionales",
      "description": "Alertas críticas sobre el estado y despacho de envíos",
      "granted": true,
      "essential": true
    },
    {
      "purpose": "sms_whatsapp_alerts",
      "name": "Alertas SMS y WhatsApp",
      "description": "Notificaciones directas vía mensajería móvil instantánea",
      "granted": true,
      "essential": false
    },
    {
      "purpose": "delivery_tracking",
      "name": "Seguimiento y Georreferenciación",
      "description": "Rastreo en tiempo real y posicionamiento geoespacial de envíos",
      "granted": true,
      "essential": false
    }
  ],
  "grantedAt": "2026-08-24T10:30:00.000Z",
  "updatedAt": "2026-08-24T10:30:00.000Z",
  "legalNotice": "Tratamiento de datos personales conforme a la Ley N° 21.719 sobre Protección de Datos Personales en Chile."
}
```

---

### 2. `POST /users/me/revocar-consentimiento` (o `/auth/consent/revoke`)
Permite al titular ejercer su derecho de oposición/revocación sobre finalidades **no esenciales**. Al revocarse, se emite de forma asíncrona un evento `REVOKE_CONSENT` a Amazon SQS (`FlowexConsentQueue`).

* **Método:** `POST`
* **Autenticación:** Requerida (`Bearer <JWT>` o cookie HttpOnly `access_token`).
* **Cuerpo de Solicitud (`application/json`):**
```json
{
  "purposes": [
    "sms_whatsapp_alerts"
  ],
  "reason": "El titular solicita cese voluntario de alertas por mensajería móvil"
}
```
* **Respuesta Exitosa (`200 OK`):**
```json
{
  "message": "Consentimiento revocado exitosamente para las finalidades seleccionadas",
  "userId": "usr_client_1771344000",
  "status": "PARTIALLY_REVOKED",
  "policyVersion": "v2.4",
  "purposes": [
    {
      "purpose": "terms_and_conditions",
      "name": "Términos y Condiciones del Servicio",
      "granted": true,
      "essential": true
    },
    {
      "purpose": "operational_notifications",
      "name": "Notificaciones Operacionales",
      "granted": true,
      "essential": true
    },
    {
      "purpose": "sms_whatsapp_alerts",
      "name": "Alertas SMS y WhatsApp",
      "granted": false,
      "essential": false
    },
    {
      "purpose": "delivery_tracking",
      "name": "Seguimiento y Georreferenciación",
      "granted": true,
      "essential": false
    }
  ],
  "updatedAt": "2026-08-24T14:30:00.000Z"
}
```
* **Respuesta de Error si se intenta revocar finalidad esencial (`400 Bad Request`):**
```json
{
  "message": "No es posible revocar finalidades esenciales para la operación del servicio (Ley N° 21.719)",
  "forbiddenPurposes": ["terms_and_conditions"],
  "essentialPurposes": ["terms_and_conditions", "operational_notifications"]
}
```

---

### 3. `GET /internal/users/{userId}/consents`
Endpoint interno (VPC / Consola Administrativa) para la inspección forense de consentimientos de un usuario específico. La consulta despacha obligatoriamente un evento de auditoría `PII_ACCESS_AUDIT` a la cola SQS.

* **Método:** `GET`
* **Autenticación:** Requerida con rol `admin` o `root` (`Bearer <JWT>`).
* **Headers Opcionales:** `x-audit-reason: Revisión legal de cuenta`
* **Respuesta Exitosa (`200 OK`):**
```json
{
  "userId": "usr_1771345600000",
  "appId": "flowex",
  "status": "GRANTED",
  "policyVersion": "v2.4",
  "channel": "web_registration",
  "purposes": [
    {
      "purpose": "terms_and_conditions",
      "name": "Términos y Condiciones del Servicio",
      "granted": true,
      "essential": true
    },
    {
      "purpose": "operational_notifications",
      "name": "Notificaciones Operacionales",
      "granted": true,
      "essential": true
    },
    {
      "purpose": "sms_whatsapp_alerts",
      "name": "Alertas SMS y WhatsApp",
      "granted": true,
      "essential": false
    },
    {
      "purpose": "delivery_tracking",
      "name": "Seguimiento y Georreferenciación",
      "granted": true,
      "essential": false
    }
  ],
  "grantedAt": "2026-08-20T10:00:00.000Z",
  "updatedAt": "2026-08-20T10:00:00.000Z",
  "userIsActive": true
}
```

---

## ⚖️ Regla de No-Revocación ante Bloqueo de Usuario (*Non-Revocation on Block*)

> [!IMPORTANT]
> **Fundamento Jurídico (Ley N° 21.719 & GDPR):**
> La revocación de un consentimiento para el tratamiento de datos personales constituye un **derecho voluntario, personalísimo e indelegable del titular de los datos** (Derecho de Oposición ARCOP).
> 
> En consecuencia, cuando un administrador o el sistema desactiva, suspende o bloquea una cuenta de usuario (`isActive = false` o `is_active = false`):
> 1. **El consentimiento histórico otorgado NO se revoca automáticamente.**
> 2. **El estado de las finalidades aceptadas se mantiene bajo custodia legal inmutable.**
> 3. **Justificación:** Si el sistema revocara automáticamente el consentimiento al bloquear una cuenta fraudulenta o en mora, se destruiría la base jurídica que faculta a Flowex para auditar transacciones pasadas, defenderse en litigios comerciales o responder a requerimientos de la Agencia de Protección de Datos o tribunales.
> 
> En la respuesta de inspección administrativa (`GET /internal/users/{userId}/consents`), cuando `userIsActive = false`, se agrega la anotación legal:
> ```json
> {
>   "userIsActive": false,
>   "notice": "El consentimiento se mantiene vigente bajo custodia legal (Ley N° 21.719)",
>   "legalCustody": true
> }
> ```

---

## 🛡️ Desglose de Derechos ARCOP (Ley N° 21.719 / GDPR)

Flowex estructura el cumplimiento del catálogo de derechos del titular conforme al nuevo marco legal chileno:

| Derecho ARCOP | Definición en Flowex | Mecanismo de Ejercicio en la Plataforma |
|---|---|---|
| **A**cceso | Derecho del titular a conocer qué datos personales han sido recolectados, con qué fines y a quiénes se transfieren. | `GET /users/me/consentimiento` y panel de perfil de usuario (`Flowex-frontend`). |
| **R**ectificación | Derecho a modificar, corregir o actualizar datos inexactos, desactualizados o incompletos (RUT, teléfono, razón social DTE). | `PUT /registration/requests/{email}/update-contact`, libreta de direcciones y configuración de facturación DTE. |
| **C**ancelación (Supresión) | Derecho a solicitar el borrado de datos cuando ha concluido la relación contractual y vencido el plazo legal de retención tributaria/logística. | Solicitud formal de derecho ARCOP procesada por el Oficial de Privacidad (DPO) y archivo final en S3 Glacier WORM. |
| **O**posición / Revocación | Derecho a revocar total o parcialmente el consentimiento sobre finalidades accesorias (alertas WhatsApp, tracking publicitario). | `POST /users/me/revocar-consentimiento` (no aplica a finalidades esenciales del contrato de transporte). |
| **P**ortabilidad | Derecho a recibir los datos personales en un formato estructurado, interoperable y de uso común. | Exportación estructurada JSON/CSV desde el perfil de usuario. |

---

## 📋 Estructura de DTOs y Tipos TypeScript

```typescript
export type UserRole = 'root' | 'admin' | 'driver' | 'client' | 'customer';

export interface SavedAddress {
  id: string;
  alias: string;
  calle: string;
  numero: string;
  departamento?: string;
  ciudad: string;
  region: string;
  codigoPostal?: string;
  referencias?: string;
  isDefault: boolean;
}

export interface BillingInfo {
  razonSocial: string;
  rutEmpresa: string;
  giro: string;
  direccion: string;
  correo: string;
}

export interface NotificationPreferences {
  emailSes: boolean;
  whatsappMeta: boolean;
  smsSns: boolean;
}

export interface ConsentPurpose {
  purpose: string;
  name?: string;
  description?: string;
  granted: boolean;
  essential: boolean;
}

export type ConsentStatus = 'GRANTED' | 'REVOKED' | 'PARTIALLY_REVOKED';

export interface UserConsent {
  userId: string;
  appId: string;
  status: ConsentStatus;
  policyVersion: string;
  channel: string;
  purposes: ConsentPurpose[];
  grantedAt: string;
  updatedAt: string;
  legalNotice?: string;
  userIsActive?: boolean;
  notice?: string;
  legalCustody?: boolean;
}

export interface RevokeConsentRequest {
  purposes: string[];
  reason?: string;
}

export interface LegalConsent {
  accepted: boolean;
  policyVersion: string;
  timestamp: string;
  ipAddress?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  roleTitle: string;
  avatar: string;
  department: string;
  rut?: string;
  isVerified?: boolean;
  addresses?: SavedAddress[];
  billingInfo?: BillingInfo;
  notificationPreferences?: NotificationPreferences;
  legalConsent?: LegalConsent;
}
```

---

## 🛡️ Especificación OpenAPI 3.1.0 Schemas

Los esquemas OpenAPI correspondientes se encuentran formalizados en `components/schemas` de la especificación:

* `#/components/schemas/SavedAddress`
* `#/components/schemas/BillingInfo`
* `#/components/schemas/NotificationPreferences`
* `#/components/schemas/LegalConsent`
* `#/components/schemas/ConsentPurpose`
* `#/components/schemas/UserConsent`
* `#/components/schemas/RevokeConsentRequest`
* `#/components/schemas/UserProfile`
