# Sistema Integral de Notificaciones Multicanal (Notifications)

El sistema de notificaciones de **Flowex** es un motor distribuido diseñado bajo arquitectura **Event-Driven**. Coordina las comunicaciones hacia remitentes, destinatarios, conductores y personal operativo:

1. **Amazon Simple Email Service (SES)**: Correos transaccionales en HTML (`Flowex-notification-lambda`). Es el **único canal de los códigos de verificación** y del segundo factor.
2. **Meta WhatsApp Business Cloud API**: Avisos del pedido y código de entrega al destinatario, con plantillas aprobadas por Meta (`Flowex-otp-service-lambda` y `Flowex-notification-lambda`).
3. **Bus de Eventos Asíncronos (Amazon SQS)**: Desacoplamiento mediante `NotificationsQueue` y `FlowexConsentQueue`.
4. **Observabilidad (Discord Webhooks)**: Alertas internas de fallos mediante el middleware `withSentinel`.

> [!NOTE]
> Flowex **no envía SMS**. La ruta `/notifications/sms/verify-phone` y el canal SMS del segundo factor se eliminaron: solo escribían en el log y respondían «enviado».

---

## 🏗️ Arquitectura Global del Flujo de Notificaciones

```mermaid
graph TB
    subgraph Orígenes de Eventos
        Auth[Flowex-auth-api-lambda<br>Login / 2FA MFA]
        Orders[Flowex-auth-admin-lambda<br>Creación, En Reparto, POD, Retención]
        RegPublic[Flowex-registration-public-lambda<br>Onboarding de Clientes]
        RegAdmin[Flowex-registration-admin-lambda<br>Aprobación de Conductores]
        Frontend[Flowex Frontend SPA<br>Confirmación de Pago y Seguimiento]
        Consent[Flowex-consent-worker-lambda<br>Derechos ARCO Ley 21.719]
    end

    subgraph Encolamiento y Desacoplamiento
        SQSNotif[[Amazon SQS: NotificationsQueue]]
        SQSConsent[[Amazon SQS: FlowexConsentQueue]]
    end

    subgraph Microservicios de Notificación
        OTPService[Flowex-otp-service-lambda<br>Código por correo & avisos WhatsApp]
        NotifWorker[Flowex-notification-lambda<br>Procesador SQS & Amazon SES Engine]
    end

    subgraph Canales de Salida
        MetaCloud[Meta WhatsApp Cloud API<br>Graph API v19.0]
        AmazonSES[Amazon SES<br>HTML Emails Transaccionales]
        DiscordWebhook[Discord Webhook<br>Alertas Sentinel de Monitoreo]
    end

    Auth -->|SQS AUTH_MFA_OTP| SQSNotif
    Orders -->|SQS ORDER_CREATED / STATUS / DISCREPANCY| SQSNotif
    RegPublic -->|POST /otp/send| OTPService
    RegAdmin -->|SQS USER_REGISTRATION_ACTIVATED| SQSNotif
    Frontend -->|POST /notifications/whatsapp| OTPService
    Consent -->|SQS CONTACT_ERASURE_NOTICE| SQSNotif

    OTPService -->|Avisos de pedido| MetaCloud
    OTPService -->|CLIENT_REG_OTP código por correo| SQSNotif

    SQSNotif -->|Batch Processing| NotifWorker
    NotifWorker -->|SendEmailCommand| AmazonSES
    NotifWorker -->|Plantillas de pedido| MetaCloud
    NotifWorker -->|reportErrorToDiscord| DiscordWebhook
```

---

## 📋 Catálogo Completo de Notificaciones por Canal

### 1. Canal Meta WhatsApp Business Cloud API (`Flowex-otp-service-lambda`)

Todas las plantillas de WhatsApp están tipadas en [`whatsapp-templates.ts`](file:///C:/Users/joyta/OneDrive/Desktop/inspytech/flowEx/Flowex-otp-service-lambda/src/whatsapp-templates.ts) y aprobadas por Meta:

| Evento del Sistema | Plantilla Oficial Meta | Categoría | Variables Dinámicas | Destinatario Principal |
| :--- | :--- | :--- | :--- | :--- |
| **Envío Creado y Pagado** | `flowex_order_created_v2` | `UTILITY` (con Header de Imagen) | `{{1}}` Tracking, `{{2}}` PIN de entrega (4 dígitos), `{{3}}` Nombre Destinatario, `{{4}}` Comuna, `{{5}}` Dirección, `{{6}}` Nombre Remitente | Destinatario del Paquete |
| **Paquete en Salida Hoy** | `flowex_order_out_today` | `UTILITY` | `{{1}}` Tracking, `{{2}}` Nombre Chofer, `{{3}}` Destinatario, `{{4}}` PIN de Entrega | Destinatario del Paquete |
| **Alerta de Parada Próxima** | `flowex_order_next_stop` | `UTILITY` | `{{1}}` Tracking, `{{2}}` Nombre Chofer, `{{3}}` Destinatario, `{{4}}` PIN, `{{5}}` Dirección de Entrega | Destinatario del Paquete |
| **Actualización en Tránsito** | `flowex_order_in_transit` | `UTILITY` | `{{1}}` Tracking, `{{2}}` Estado / hub donde está el pedido, `{{3}}` Destinatario | Remitente y Destinatario |
| **Confirmación de Entrega (POD)** | `flowex_order_delivered` | `UTILITY` | `{{1}}` Tracking, `{{2}}` Fecha y Hora de Entrega, `{{3}}` Nombre Destinatario | Remitente y Destinatario |
| **Incidencia / Fallo de Entrega** | `flowex_delivery_incident` | `UTILITY` | `{{1}}` Tracking, `{{2}}` Motivo del Fallo, `{{3}}` Destinatario | Destinatario y Remitente |
| **Notificación de Contingencia** | `flowex_general_notification` | `UTILITY` (Fallback) | `{{1}}` Texto del aviso general | Usuarios de la plataforma |

> [!WARNING]
> **Sin credenciales de Meta no sale nada.** El envío responde `status: "not_sent"` y
> `delivered: false`, y no se registra como uso del teléfono del destinatario. Antes se
> simulaba (`mock_sent`), se contaba como entregado y quedaba auditado un envío que no ocurrió.

> [!IMPORTANT]
> **Seguridad del PIN de Entrega:** El PIN de 4 dígitos generado aleatoriamente con `crypto.randomInt` viaja exclusivamente en las plantillas directas al destinatario (`flowex_order_created_v2`, `flowex_order_out_today`, `flowex_order_next_stop`). Los conductores **no** tienen acceso visual al PIN en su interfaz móvil y solo pueden registrar la entrega cuando el receptor se lo proporciona verbalmente.

---

### 2. Canal Amazon SES - Correos Electrónicos HTML (`Flowex-notification-lambda`)

Los correos emitidos por Amazon SES utilizan plantillas HTML con la identidad corporativa de Flowex, tipografía legible y diseño adaptativo:

#### A. Verificación de Cuenta (`/notifications/email/verify-account` o evento `CLIENT_REG_OTP`)
* **Asunto:** `Flowex: Código para Validación de Cuenta`
* **Destinatario:** Usuario en proceso de registro de cuenta.
* **Contenido:** Contenedor destacado con el código OTP de 6 dígitos con espaciado amplio (`letter-spacing: 4px`) y advertencia de no compartirlo.

#### B. Segundo Factor de Autenticación 2FA (`AUTH_MFA_OTP`)
* **Asunto:** `Flowex: Código de Verificación de Inicio de Sesión`
* **Destinatario:** Usuarios autenticados con roles protegidos (`root`, `admin`, `driver`).
* **Contenido:** Código de 6 dígitos numéricos con vencimiento estricto a los 5 minutos, rol específico y leyenda de cumplimiento de la **Ley N° 21.719 de Chile**.

#### C. Bienvenida y Activación de Cuenta (`/notifications/email/welcome` o evento `USER_REGISTRATION_ACTIVATED`)
* **Asunto:** `Flowex: ¡Bienvenido a nuestra plataforma!` o `Flowex: ¡Tu Cuenta ha sido Activada!`
* **Destinatario:** Cliente o Conductor tras la aprobación de su cuenta.
* **Contenido:** Saludo cordial, confirmación del rol asignado y botón de llamado a la acción hacia `https://flowex.cl/login`.

#### D. Confirmación de Despacho y Comprobante Oficial (`/notifications/email/order-created` o evento `ORDER_CREATED`)
* **Asunto:** `Flowex: Confirmación de Pedido {trackingNumber}`
* **Destinatario:** Remitente y/o pagador del envío.
* **Contenido:** Número de seguimiento oficial `FLX-YYYY-XXXX`, PIN de seguridad de 4 dígitos, monto total pagado en CLP y botón con enlace directo a rastreo en vivo (`/tracking?code=FLX-...`).

#### E. Entrega fallida (`/notifications/email/order-status-update` o evento `ORDER_STATUS_UPDATE`)
* **Asunto:** `Flowex: Estado de tu pedido {trackingNumber} en {ESTADO}`
* **Destinatario:** El **remitente**, solo cuando el estado es `delivery_failed` (matriz aprobada el 16-09-2026). Los demás estados no envían correo; la salida a reparto se avisa al destinatario por WhatsApp.
* **Contenido:** Estado, observaciones y enlace al rastreo público, que muestra el nombre del hub donde está el pedido.

#### F. Retención por Discrepancia de Bultos (`/notifications/email/package-discrepancy` o evento `ORDER_PACKAGE_DISCREPANCY`)
* **Asunto:** `Flowex: tu pedido {trackingNumber} requiere pagar una diferencia para ser entregado`
* **Destinatario:** Cliente remitente.
* **Contenido:** Cuadro comparativo con la categoría de bulto declarada vs. la categoría verificada en la báscula del hub, el monto de la diferencia tarifaria en CLP, las observaciones del operador de bodega y la explicación de que el paquete queda retenido sin costo para el destinatario hasta que el remitente regularice el pago.

#### G. Solicitud de Supresión de Contacto de Libreta (`CONTACT_ERASURE_NOTICE` - Ley N° 21.719)
* **Asunto:** `Flowex: solicitud de supresión de un contacto de tu libreta ({ticket})`
* **Destinatario:** Remitente titular de una libreta de direcciones.
* **Contenido:** Aviso formal de que un tercero ha ejercido su derecho de supresión sobre su número de teléfono (enmascarado `+56 9 **** 1234`), otorgándole **10 días corridos** para acreditar una base de licitud contractual antes de la purga definitiva del registro de la libreta.

---

### 3. Canal de Alertas Operativas y de Monitoreo (Discord Webhooks)

A través del middleware transversal `withSentinel` (`reportErrorToDiscord`):

* **Fallo en Procesamiento de Cola SQS:** Alerta con `MessageId`, stack trace del error y carga útil del evento si falla la entrega tras reintentos en `Flowex-notification-lambda`.
* **Excepciones 500 no controladas:** Envío inmediato a canales privados de ingeniería (`#flowex-alerts`) con detalles del endpoint HTTP y contexto de ejecución.
* **Notificaciones de Discrepancia Crítica:** Aviso cuando una preferencia de Mercado Pago o sesión de Fintoc no cuadra con el monto registrado en base de datos.

---

## ⚙️ Control de Preferencias del Usuario (Opt-in / Opt-out)

En conformidad con los estándares de privacidad y la **Ley N° 21.719**, cada perfil de usuario en Flowex dispone de un objeto configurable de preferencias de comunicación (`NotificationPreferences`):

```json
{
  "emailSes": true,
  "whatsappMeta": true
}
```

Una preferencia `smsSns` guardada antes se ignora.

* **Actualización:** Mediante `PUT /users/me/notifications`.
* **Revocación:** Si el usuario desmarca un canal, el sistema omite el despacho de comunicaciones no esenciales a través de dicho medio, manteniendo únicamente aquellas estrictamente requeridas para la ejecución contractual del servicio de transporte.

---

## 🧪 Ambiente de Desarrollo y Desvío Seguro (`DEV_REDIRECT_EMAIL`, `DEV_REDIRECT_WHATSAPP_PHONE`)

Para evitar el envío accidental de correos o mensajes a destinatarios reales durante pruebas de desarrollo y control de calidad (QA):

* **Variable `DEV_REDIRECT_EMAIL`**: Si está configurada en la función Lambda, todos los correos electrónicos se envían exclusivamente al buzón de pruebas indicado.
* **Banner de Advertencia:** El encabezado del correo se decora automáticamente con un banner amarillo:
  ```html
  <div style="background:#fef3c7; border:1px solid #f59e0b; padding:12px; color:#78350f;">
    CORREO DE DESARROLLO — NO ES UN ENVÍO REAL<br/>
    Destinatario que corresponde en producción: destinatario.real@ejemplo.cl
  </div>
  ```
* **Sin SES configurado (`NODE_ENV=development` sin `DEV_REDIRECT_EMAIL`):** el correo no sale; queda solo el registro en el log y no se audita como uso de datos.

* **Variable `DEV_REDIRECT_WHATSAPP_PHONE`**: dev tiene credenciales reales de Meta
  (`flowex/dev/meta/whatsapp`), así que sin desvío un pedido de prueba le escribe de verdad
  al número que se le ponga. Con esta variable, todo WhatsApp (`Flowex-otp-service-lambda` y
  `Flowex-notification-lambda`) sale igual, pero al número de pruebas indicado — nunca al
  del pedido. El número tiene que estar dado de alta como *tester* en la app de Meta. En
  dev por defecto es el número de pruebas `+56982257217`.
* **Aviso en el mensaje:** solo en los envíos de texto libre (la respuesta de utilidad
  cuando una plantilla falla, o el mensaje sin plantilla); una plantilla aprobada por Meta
  no admite texto fuera de sus variables declaradas:
  ```
  🧪 DEV — habría sido para +5691 **** 5678

  📦 FlowEx: Notificación de entrega y seguimiento.
  ```
  Para una plantilla que sí se envía (por ejemplo `flowex_order_out_today`), el mensaje
  llega intacto al número de pruebas; el desvío solo cambia el destinatario, no el
  contenido de la plantilla.
* **Registro de uso de datos:** el envío queda registrado igual, con el número real del
  pedido, tal como `sendSesEmail` lo hace con el correo — el dato se usó para armar y
  disparar el envío, aunque haya terminado en el número de pruebas.
* **Nunca en producción:** el desvío se apaga si `STAGE=prod` o `NODE_ENV=production`,
  aunque la variable quedara puesta por error.
