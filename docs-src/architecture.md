# Arquitectura Global del Sistema Flowex

Flowex es una plataforma tecnológica orientada a la logística y distribución de paquetería y envíos en Chile. Su arquitectura está diseñada 100% sobre un modelo **Serverless Event-Driven** en Amazon Web Services (AWS), garantizando alta disponibilidad, escalabilidad elástica y costos optimizados por transacción.

---

## 🏗️ Diagrama de Arquitectura de Microservicios

```mermaid
graph TB
    subgraph Clientes & Interfaces
        WebApp[Flowex Frontend SPA / React]
        DriverApp[Flowex Driver App / Mobile]
        PublicUser[Público General / Tracking]
    end

    subgraph "API Gateway & Enrutamiento"
        APIGW[Amazon API Gateway / Ingress]
    end

    subgraph "Microservicios Serverless (AWS Lambdas)"
        AuthLambda["Flowex-auth-api-lambda<br>(Login, Refresh, Logout, Validate)"]
        RegPublicLambda["Flowex-registration-public-lambda<br>(RUT Módulo 11, S3 Comprobantes)"]
        OtpLambda["Flowex-otp-service-lambda<br>(OTP, Meta WhatsApp Cloud API)"]
        PaymentsLambda["Flowex-payments-api-lambda<br>(Mercado Pago & Fintoc Open Banking)"]
        NotifLambda["Flowex-notification-lambda<br>(Amazon SES Emails, SMS)"]
        AuthAdminLambda["Flowex-auth-admin-lambda<br>(Gestión Usuarios VPC)"]
        RegAdminLambda["Flowex-registration-admin-lambda<br>(Overrides & Activación Forzada)"]
    end

    subgraph "Servicios Externos & Proveedores"
        MetaAPI[Meta WhatsApp Cloud API]
        MPAPI[Mercado Pago Checkout Pro]
        FintocAPI[Fintoc Open Banking A2A]
        SESAPI[Amazon Simple Email Service - SES]
    end

    subgraph "Almacenamiento & Eventos Asíncronos"
        S3Bucket[(Amazon S3 - Comprobantes)]
        SQSQueue[[Amazon SQS - Notification Queue]]
        DynamoDB[(Amazon DynamoDB / State)]
    end

    WebApp -->|HTTPS API REST| APIGW
    DriverApp -->|HTTPS API REST| APIGW
    PublicUser -->|Tracking / Registro| APIGW

    APIGW -->|/auth/*| AuthLambda
    APIGW -->|/registration/*| RegPublicLambda
    APIGW -->|/otp/*, /notifications/whatsapp| OtpLambda
    APIGW -->|/payments/*, /webhooks/*| PaymentsLambda
    APIGW -->|/notifications/*| NotifLambda
    APIGW -->|/internal/users/* (VPC)| AuthAdminLambda
    APIGW -->|/admin/registration-requests/*| RegAdminLambda

    RegPublicLambda -->|Upload Base64| S3Bucket
    OtpLambda -->|Envío de Plantillas| MetaAPI
    OtpLambda -->|Despacho Evento SQS| SQSQueue
    PaymentsLambda -->|Crear Preferencia / Webhooks| MPAPI
    PaymentsLambda -->|Payment Intent / Webhooks| FintocAPI
    SQSQueue -->|Consumo Asíncrono Worker| NotifLambda
    NotifLambda -->|Despacho Transaccional| SESAPI
```

---

## 🧩 Componentes del Ecosistema

### 1. `Flowex-frontend`
* **Tecnologías:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons.
* **Módulos:**
  * **Portal Cliente / Customer:** Creación de solicitudes de despacho, cotizador de tarifas por peso/zona, tracking en tiempo real y pasarela de pago integrada.
  * **Portal Conductor / Driver:** Hoja de ruta diaria, escaneo de paquetes, validación de entrega mediante PIN de 4 dígitos (`deliveryCode`) y carga de Proof of Delivery (POD) con foto y firma digital.
  * **Panel de Control / Admin:** Dashboard ejecutivo de envíos, asignación de rutas, gestión de incidencias logísticas y control de usuarios.

### 2. `Flowex-shared-layer` (Capa Compartida)
* Contiene utilidades transversales empaquetadas como Lambda Layer:
  * Validación estricta de RUT chileno mediante algoritmo Módulo 11 (`rut.ts`).
  * Generación y validación de tokens JWT (`jwt.ts`).
  * Generación de Status Tokens HMAC-SHA256 (`status-token.ts`).
  * Estructuras de respuesta normalizadas con soporte CORS (`response.ts`).
  * Tipado TypeScript compartido (`types.ts`).

### 3. Microservicios de Autenticación y Usuarios
* **`Flowex-auth-api-lambda`:** Expone endpoints públicos para login, renovación de access tokens (`/auth/refresh`), logout y validación de estado de sesión (`/auth/validate`), operando con tokens JWT de 1 hora y refresh tokens de 30 días fijados en cookies HttpOnly seguras.
* **`Flowex-auth-admin-lambda`:** Microservicio interno desplegado dentro de una VPC privada para la administración y CRUD de usuarios del sistema con roles `root`, `admin`, `driver` y `client`.

### 4. Microservicios de Onboarding y Registro
* **`Flowex-registration-public-lambda`:** Procesa solicitudes iniciales de clientes y choferes. Valida la complejidad de la contraseña, el RUT chileno y el teléfono celular E.164, y sube comprobantes de domicilio o de empresa a Amazon S3.
* **`Flowex-otp-service-lambda`:** Genera códigos OTP numéricos de 6 dígitos con tiempo de expiración y los envía mediante Meta WhatsApp Cloud API o SMS. Al verificar el código, auto-activa la cuenta a estado `APPROVED` y despacha eventos a Amazon SQS.
* **`Flowex-registration-admin-lambda`:** Permite a operadores de nivel `admin` y `root` realizar aprobaciones forzadas, rechazos o activaciones manuales de registros que requieran revisión humana.

### 5. Pasarelas de Pago (`Flowex-payments-api-lambda`)
* **Mercado Pago:** Integración con Checkout Pro / WebPay para pagos con tarjeta de débito, crédito y dinero en cuenta.
* **Fintoc:** Integración Open Banking A2A (Account to Account) para transferencias bancarias instantáneas verificadas mediante firmas criptográficas `x-fintoc-signature`.
* **Webhooks:** Receptores asíncronos para la actualización automática del estado de pago de las órdenes (`paid`, `payment_failed`).

### 6. Notificaciones Transaccionales (`Flowex-notification-lambda`)
* Soporta invocación HTTP directa y ejecución asíncrona como worker de Amazon SQS.
* Envía correos HTML responsivos a través de Amazon SES (Verificación de cuenta, Bienvenida, Confirmación de orden con PIN de seguridad, y Actualizaciones de estado de envío).
* Soporta notificaciones vía SMS.

### 7. Infraestructura como Código (`Flowex-iac`)
* Todo el aprovisionamiento de AWS (VPC, API Gateway, S3, SQS, Lambdas, IAM Roles) se gestiona mediante **AWS CDK** en TypeScript.
