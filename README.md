# Documentación Técnica y API Reference - Flowex

Este repositorio centraliza y publica la documentación técnica, arquitectura en la nube y especificación OpenAPI 3.1.0 interactiva para el ecosistema de 8 microservicios y funciones serverless de **Flowex** (`Flowex-auth-api-lambda`, `Flowex-auth-admin-lambda`, `Flowex-registration-public-lambda`, `Flowex-otp-service-lambda`, `Flowex-payments-api-lambda`, `Flowex-notification-lambda`, `Flowex-registration-admin-lambda`, `Flowex-consent-worker-lambda` y `Flowex-shared-layer`).

---

## 📦 Artefactos Generados

* `generated/openapi.json`: Especificación OpenAPI 3.1.0 completa y tipada.
* `generated/openapi.yaml`: Versión YAML de la especificación para importación en Postman/Insomnia.
* `generated/api-types.d.ts`: Definición de tipos TypeScript generados automáticamente para integración en el frontend.
* `generated/source-routes.json`: Inventario extraído de rutas y lambdas.
* `generated/routes-by-service.json`: Rutas agrupadas por microservicio.
* `generated/routes-diff.json`: Análisis de consistencia y cambios de endpoints.
* `docs/index.html`: Portal estático completo construido con VitePress y Mermaid.
* `docs/reference.html`: Interfaz interactiva de documentación API impulsada por `@scalar/api-reference`.

---

## 🚀 Comandos Disponibles

```bash
# 1. Instalar dependencias
npm install

# 2. Generar OpenAPI, tipos y compilar documentación estática
npm run build

# 3. Validar consistencia al 100% entre código fuente y especificación
npm run validate

# 4. Servidor de desarrollo en vivo para guías (VitePress)
npm run docs:dev

# 5. Servir la documentación estática compilada localmente
npm run serve
# Disponible en http://localhost:4010
```

---

## ⚙️ Cómo Funciona el Motor de Documentación

1. **Extracción Automática:** `scripts/lib/route-extractor.mjs` analiza las funciones Lambda de Flowex e indexa sus métodos HTTP, rutas, parámetros y roles requeridos.
2. **Enriquecimiento de Metadata:** `scripts/lib/spec-config.mjs` aporta esquemas JSON Schema, ejemplos transaccionales, códigos de respuesta y esquemas de seguridad (`bearerAuth`, `cookieAccessAuth`, `cookieRefreshAuth`, `statusTokenAuth`).
3. **Generación de Tipos:** `scripts/lib/typegen.mjs` transforma automáticamente la especificación OpenAPI en interfaces TypeScript puras.
4. **Validación Continua:** `scripts/validate-openapi.mjs` asegura que no existan endpoints en el código que no estén debidamente especificados.
5. **Publicación Estática:** VitePress renderiza las guías en Markdown y copia la interfaz interactiva de Scalar (`reference.html`) dentro de `docs/`.

---

## 🌐 Despliegue Estático en Vercel

* **URL de Producción en Vivo:** [https://docs-nu-three-75.vercel.app](https://docs-nu-three-75.vercel.app)
* **Referencia API Interactiva (Scalar):** [https://docs-nu-three-75.vercel.app/reference.html](https://docs-nu-three-75.vercel.app/reference.html)

Vercel publica la documentación compilada directamente desde la carpeta `docs/`.

### Configuración del Proyecto en Vercel:
* **Framework Preset:** `Other` (o `VitePress`).
* **Root Directory:** `./` (raíz del repositorio `Flowex-api-docs`).
* **Build Command:** `npm run build` o vacío si se versiona la carpeta `docs`.
* **Output Directory:** `docs`.
* **Production Branch:** `main`.

### Configuración de Secretos en GitHub Actions (para despliegue automatizado):
Para que el workflow `.github/workflows/vercel-deploy.yml` despliegue automáticamente en cada push/PR, se deben configurar los siguientes secretos en el repositorio de GitHub (`https://github.com/start-level-cl/Flowex-api-docs/settings/secrets/actions`):

* `VERCEL_TOKEN`: Token de autenticación generado en tu cuenta de Vercel ([Vercel Tokens](https://vercel.com/account/tokens)).
* `VERCEL_ORG_ID` *(opcional)*: ID de la organización o equipo en Vercel.
* `VERCEL_PROJECT_ID` *(opcional)*: ID del proyecto creado en Vercel.

---

## 📊 Matriz de Microservicios y Módulos Documentados

| Microservicio / Módulo | Visibilidad | Dominio / Propósito | Endpoints / Contratos Clave |
| :--- | :--- | :--- | :--- |
| `Flowex-auth-api-lambda` | Pública | Autenticación JWT y Cookies | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/validate`, `POST /auth/change-password` |
| `Flowex-auth-admin-lambda` | Privada VPC | Administración Interna de Usuarios | `POST /internal/users`, `GET /internal/users/{id}`, `PUT /internal/users/{id}`, `DELETE /internal/users/{id}` |
| `Flowex-registration-public-lambda` | Pública | Onboarding y Validación RUT | `POST /registration/requests`, `GET /registration/requests/{email}/status`, `PUT /registration/requests/{email}/update-contact`, `PUT /registration/requests/{email}/reupload-comprobante` |
| `Flowex-otp-service-lambda` | Pública | OTP y Meta WhatsApp Cloud API | `POST /otp/send`, `POST /otp/send-whatsapp`, `POST /otp/verify`, `POST /notifications/whatsapp` |
| `Flowex-payments-api-lambda` | Pública | Pasarelas de Pago & Webhooks | `POST /payments/mercadopago/preference`, `POST /payments/fintoc/payment-intent`, `POST /webhooks/mercadopago`, `POST /webhooks/fintoc` |
| `Flowex-notification-lambda` | Pública / SQS | Amazon SES HTML Emails & SMS | `POST /notifications/email/verify-account`, `POST /notifications/sms/verify-phone`, `POST /notifications/email/welcome`, `POST /notifications/email/order-created`, `POST /notifications/email/order-status-update` |
| `Flowex-registration-admin-lambda` | Admin / Event | Overrides Administrativos | `POST /admin/registration-requests/{email}/override-activate`, Invocaciones IAM (`GET, FORCE_ACTIVATE, REJECT`) |
| `Flowex-consent-worker-lambda` | Worker / SQS | Consentimiento y Auditoría PII (Node 24 ARM64) | SQS `FlowexConsentQueue` + DLQ `FlowexConsentDLQ`, Eventos `RECORD_CONSENT`, `REVOKE_CONSENT`, `PII_ACCESS_AUDIT` |
| `Flowex-shared-layer` | Layer | Biblioteca Central Compartida | Algoritmo Módulo 11 RUT, Firmas JWT, Tokens HMAC, Respuestas CORS |
| **Standardized Profile Module** | Transversal | Gestión Integral de Perfil, Direcciones, Facturación y Consentimiento | Esquemas `UserProfile`, `SavedAddress`, `BillingInfo`, `NotificationPreferences`, `LegalConsent` (Ley N° 21.719) |

---

## 👤 Módulo Estandarizado de Perfil (Standardized Profile Module)

El ecosistema Flowex implementa una arquitectura transversal para la gestión del perfil de usuario aplicable a todos los roles (`root`, `admin`, `driver`, `client`, `customer`):

1. **Identidad & Cabecera de Usuario:**
   * Selector dinámico de avatares predeterminados y estados de actividad.
   * Renderizado de roles con insignias semánticas (`RoleBadge`) y verificación de cuenta.
2. **Datos Personales & Validaciones Chilenas:**
   * Verificación matemática de RUT chileno bajo algoritmo **Módulo 11**.
   * Normalización telefónica a estándar **E.164** (`+56 9 XXXX XXXX`).
   * Renovación segura de credenciales y cambio de contraseñas.
3. **Libreta de Direcciones Frecuentes (Address Book):**
   * Gestión de bodegas, oficinas y sucursales frecuentes (`SavedAddress`).
   * Selección de dirección principal (`isDefault`) para autocompletar envíos en `POST /orders`.
4. **Datos de Facturación Tributaria (DTE):**
   * Configuración de Razón Social, RUT Empresa (Módulo 11), Giro Comercial, Dirección Tributaria y Correo para emisión de facturas electrónicas del SII.
5. **Preferencias de Notificaciones Multicanal:**
   * Activación/desactivación granular de canales: **Amazon SES** (Email), **Meta WhatsApp Business Cloud API** y **Amazon SNS** (SMS).
6. **Consentimiento Legal & Protección de Datos (Ley N° 21.719 de Chile):**
   * Registro auditable con versión de política contractual, timestamp ISO y registro de dirección IP.
   * Suspensión automática de canales de notificación externos al revocar el consentimiento.

---

## 🔔 Catálogo Integral de Notificaciones del Sistema (Amazon SES, WhatsApp Meta, SMS, SQS y Discord)

Flowex opera un motor de notificaciones multicanal event-driven desacoplado que mantiene informados a los clientes, destinatarios, conductores y administradores en cada etapa del ciclo de vida de los envíos:

### 1. Canales de Comunicación Soportados
* **Meta WhatsApp Business Cloud API (`Flowex-otp-service-lambda`):** Envío de mensajes oficiales interactivos y utilitarios con plantillas pre-aprobadas por Meta.
* **Amazon Simple Email Service / SES (`Flowex-notification-lambda`):** Correos electrónicos corporativos transaccionales en HTML responsivo y seguro.
* **Amazon SNS / SMS Gateway:** Mensajes de texto SMS para códigos OTP de contingencia y validación celular directa.
* **Bus de Eventos Asíncronos SQS (`NotificationsQueue`):** Desacopla las operaciones críticas de la base de datos permitiendo procesamiento resiliente por lotes con reintentos y Dead Letter Queue (DLQ).
* **Observabilidad Sentinel (Discord Webhooks):** Canal interno de alertas automáticas para monitoreo de excepciones en Lambdas en tiempo real.

### 2. Matriz de Plantillas Meta WhatsApp Business Cloud API
| Evento del Sistema | Plantilla Oficial Meta | Variables Dinámicas | Propósito y Destinatario |
| :--- | :--- | :--- | :--- |
| **Código OTP Autenticación** | `flowex_otp_code` | `{{1}}` Código OTP 6 dígitos | Validación telefónica y segundo factor (2FA). |
| **Envío Creado y Pagado** | `flowex_order_created_v2` | `{{1}}` Tracking, `{{2}}` PIN 4 dígitos, `{{3}}` Destinatario, `{{4}}` Comuna, `{{5}}` Dirección, `{{6}}` Remitente | Notificación inmediata con PIN secreto al receptor. |
| **Paquete en Salida Hoy** | `flowex_order_out_today` | `{{1}}` Tracking, `{{2}}` Chofer, `{{3}}` Destinatario, `{{4}}` PIN | Alerta matutina de ruta activa para recepción. |
| **Alerta Próxima Parada** | `flowex_order_next_stop` | `{{1}}` Tracking, `{{2}}` Chofer, `{{3}}` Destinatario, `{{4}}` PIN, `{{5}}` Dirección | Aviso cuando el conductor se encuentra a minutos del domicilio. |
| **Actualización en Tránsito** | `flowex_order_in_transit` | `{{1}}` Tracking, `{{2}}` Estado / Hub Logístico, `{{3}}` Destinatario | Notificación de movimiento intermedio en centros de distribución. |
| **Confirmación de Entrega (POD)** | `flowex_order_delivered` | `{{1}}` Tracking, `{{2}}` Fecha y Hora, `{{3}}` Receptor | Comprobante de entrega exitosa para remitente y receptor. |
| **Incidencia de Despacho** | `flowex_delivery_incident` | `{{1}}` Tracking, `{{2}}` Causa de la Incidencia, `{{3}}` Destinatario | Aviso de dirección no encontrada, cliente ausente o rechazo. |
| **Aviso General de Plataforma** | `flowex_general_notification`| `{{1}}` Texto del comunicado oficial | Contingencias operativas y anuncios de servicio. |

### 3. Matriz de Correos Electrónicos Transaccionales (Amazon SES)
| Tipo de Correo | Asunto Corporativo | Disparador / Evento SQS | Contenido Clave |
| :--- | :--- | :--- | :--- |
| **Verificación de Cuenta** | `Flowex: Código para Validación de Cuenta` | `POST /notifications/email/verify-account` / `CLIENT_REG_OTP` | Código OTP numérico con espaciado amplio y expiración. |
| **Segundo Factor 2FA** | `Flowex: Código de Verificación de Inicio de Sesión` | Evento SQS `AUTH_MFA_OTP` | Código OTP de 6 dígitos con validez estricta de 5 min (Ley 21.719). |
| **Bienvenida / Activación** | `Flowex: ¡Bienvenido a nuestra plataforma!` | Evento SQS `USER_REGISTRATION_ACTIVATED` | Notificación de cuenta aprobada para clientes o conductores. |
| **Confirmación de Envío** | `Flowex: Tu Envío #[TRACKING] ha sido Confirmado` | `POST /notifications/email/order-created` / `ORDER_CREATED` | Detalle del paquete, SLA, dirección y **PIN de seguridad de 4 dígitos**. |
| **Cambio de Estado** | `Flowex: Actualización de tu Envío #[TRACKING]` | `POST /notifications/email/order-status-update` / `ORDER_STATUS_UPDATE` | Notificación de transición de estado en ruta o entrega final. |
| **Retención por Discrepancia** | `Flowex: Tu Envío #[TRACKING] requiere Atención` | Evento SQS `ORDER_DISCREPANCY_HOLD` | Notificación de discrepancia en pesaje/bultos durante control en bodega. |
| **Supresión de Contacto ARCO** | `Flowex: Aviso de Supresión de Datos de Contacto` | Evento SQS `CONTACT_ERASURE_NOTICE` | Confirmación formal de eliminación bajo la Ley N° 21.719. |

> Guía exhaustiva con esquemas JSON, diagramas de arquitectura y simulación de desarrollo disponible en [Guía de Notificaciones Multicanal](docs-src/notifications-ses.md).

---

## 🛡️ Arquitectura de Consentimiento y Auditoría PII (Ley N° 21.719)

Para garantizar cumplimiento normativo sin introducir latencia sincrónica en el core transaccional:
* **Microservicio Worker:** `Flowex-consent-worker-lambda` (Node.js 24, AWS Graviton ARM64) consume por lotes la cola `FlowexConsentQueue` con `reportBatchItemFailures`.
* **Esquemas Canónicos SQS:** Soporta eventos `RECORD_CONSENT` (aceptación de términos/finalidades), `REVOKE_CONSENT` (revocación de finalidades no esenciales) y `PII_ACCESS_AUDIT` (trazabilidad de consultas administrativas de datos sensibles).
* **Buffer Local (Fase 1):** Almacena eventos de auditoría en tablas PostgreSQL Aurora (`consent_event_buffer` y `admin_pii_access_logs`).
* **Especificación de Transición:** La estrategia de migración hacia el microservicio centralizado `consentimiento` (Fase 2 SigV4) se detalla en [`technical-debt-consent-integration.md`](file:///C:/Users/joyta/OneDrive/Desktop/inspytech/flowEx/technical-debt-consent-integration.md).



