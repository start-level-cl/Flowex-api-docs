# Matriz y Configuración de AWS Lambdas

El backend de Flowex está compuesto por funciones serverless en **Node.js 24** dentro de las subredes privadas de la VPC compartida. Cada función se llama `flowex-<servicio>-<env>` (por ejemplo `flowex-auth-api-prod`). `Flowex-iac` la crea y fija su configuración, y el repositorio del servicio despliega su código. Ver [Despliegue](/deployment).

---

## 📊 Matriz Máster de Lambdas

Memoria y timeout según `Flowex-iac/lib/config/environments.ts` (iguales en dev y prod).

| Función Lambda | Ámbito | Memoria | Timeout | Triggers | Secretos que lee (por nombre) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`Flowex-auth-api-lambda`** | Público | `512 MB` | `10 s` | API Gateway REST (`/auth/*`) | `auth/jwt` |
| **`Flowex-auth-admin-lambda`** | Privado (VPC) | `256 MB` | `10 s` | API Gateway (`/internal/*`, pedidos, rutas), EventBridge cada 15 min (planificación) | `auth/jwt`, `orders/delivery-pin-key`, `google/maps`, `google/route-optimization` |
| **`Flowex-registration-public-lambda`** | Público | `512 MB` | `10 s` | API Gateway REST (`/registration/*`) | `auth/jwt` |
| **`Flowex-registration-admin-lambda`** | Admin / Event | `256 MB` | `15 s` | API Gateway Admin / Invocación IAM | `auth/jwt` |
| **`Flowex-otp-service-lambda`** | Público | `512 MB` | `10 s` | API Gateway REST (`/otp/*`, `/notifications/whatsapp`) | `auth/jwt`, `meta/whatsapp` |
| **`Flowex-payments-api-lambda`** | Público | `256 MB` | `10 s` | API Gateway REST (`/payments/*`, `/webhooks/*`) | `auth/jwt`, `mercadopago/checkout-pro`, `fintoc/payments` |
| **`Flowex-notification-lambda`** | SQS / Directo | `256 MB` | `10 s` | Cola `flowex-notifications-queue-<env>` y API Gateway (`/notifications/*`) | `auth/jwt`, `meta/whatsapp` (sin permiso IAM, ver [brechas](/deployment#_9-brechas-conocidas)) |
| **`Flowex-consent-worker-lambda`** | SQS / Worker | `256 MB` (ARM64) | `10 s` | Cola `flowex-consent-queue-<env>` | `auth/jwt` |
| `flowex-db-migrate-<env>` (`Flowex-database`) | Interno | `512 MB` | `5 min` | Invocación desde el pipeline de `Flowex-database` | `auth/root` (solo prod) |

Todas leen además las credenciales de la base: `flowex-postgres-<env>-credentials` (usuario maestro, respaldo) y `flowex/<env>/db/app-user` (rol acotado). Los nombres completos llevan el prefijo `flowex/<env>/`. Ver la [tabla de secretos](/deployment#_3-1-aws-secrets-manager-region-us-east-2).

---

## ⚙️ Variables de Entorno

`Flowex-iac` define las variables. Ninguna contiene un valor secreto: los secretos se pasan **por nombre** y cada función los resuelve en Secrets Manager durante el arranque en frío.

### Comunes a todas las funciones

```env
NODE_ENV=production            # development en dev
STAGE=prod                     # dev | prod
AUTH_JWT_ISSUER=flowex-auth
AUTH_JWT_SECRET_NAME=flowex/<env>/auth/jwt
DB_HOST=<endpoint de RDS>
DB_PORT=5432
DB_NAME=flowex_db
DB_SECRET_ARN=<ARN de flowex-postgres-<env>-credentials>
APP_DB_SECRET_ARN=<ARN de flowex/<env>/db/app-user>
DB_SSL=true
ERROR_SENTINEL_ENABLED=true|false
ERROR_SENTINEL_DISCORD_WEBHOOK_URL=<desde el secret de GitHub; solo si existe>
CONSENT_API_BASE_URL=<API central de consentimiento; solo si está configurada>
CONSENT_APP_ID=flowex
FRONTEND_CLOUDFRONT_URL=https://<dominio de la app>
```

### Por servicio

| Función | Variables propias |
| :--- | :--- |
| `auth-api` | `CONSENT_QUEUE_URL`, `NOTIFICATION_QUEUE_URL` |
| `auth-admin` | `CONSENT_QUEUE_URL`, `NOTIFICATION_QUEUE_URL`, `NOTIFICATION_LAMBDA_NAME`, `S3_FILES_BUCKET`, `FILES_BUCKET_NAME`, `GOOGLE_MAPS_SECRET_NAME`, `ROUTE_OPTIMIZATION_SECRET_NAME`, `GCP_PROJECT_ID`, `ROUTE_PLANNING_DAILY_LIMIT`, `DELIVERY_PIN_KEY_NAME` |
| `registration-public` | `COMPROBANTES_BUCKET_NAME`, `FILES_BUCKET_NAME`, `NOTIFICATION_QUEUE_URL`, `CONSENT_QUEUE_URL` |
| `registration-admin` | `NOTIFICATION_QUEUE_URL`, `CONSENT_QUEUE_URL` |
| `otp-service` | `NOTIFICATION_QUEUE_URL`, `SNS_TOPIC_ARN`, `WHATSAPP_SECRET_NAME`, `CONSENT_QUEUE_URL`, `DEV_REDIRECT_WHATSAPP_PHONE` (solo dev) |
| `payments-api` | `NOTIFICATION_QUEUE_URL`, `CONSENT_QUEUE_URL`, `MP_SECRET_NAME`, `FINTOC_SECRET_NAME`, `APP_URL`, `MP_NOTIFICATION_URL` |
| `notification` | `SES_SENDER_EMAIL`, `NOTIFICATION_QUEUE_URL`, `SNS_TOPIC_ARN`, `CONSENT_QUEUE_URL`, `DEV_REDIRECT_EMAIL` y `DEV_REDIRECT_WHATSAPP_PHONE` (solo dev) |
| `consent-worker` | `CONSENT_QUEUE_URL` |
| `db-migrate` | `RUN_SEEDS` (`true` solo en dev), `APP_DB_SECRET_ARN`, `ROOT_ACCOUNT_SECRET_ARN` (solo prod) |

### Desarrollo local

Fuera de AWS, las funciones aceptan el valor directo en lugar del nombre del secreto: `AUTH_JWT_SECRET`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `FINTOC_SECRET_KEY`, `FINTOC_PUBLIC_KEY`, `FINTOC_WEBHOOK_SECRET`, `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `GOOGLE_MAPS_API_KEY`, `GOOGLE_ROUTE_OPTIMIZATION_KEY` y `DELIVERY_PIN_KEY`. Esos valores van en un `.env` local que no se versiona. La plantilla está en `Flowex-payments-api-lambda/.env.example`.

---

## 🛠️ Compilación y Empaquetado

Cada Lambda es un repositorio independiente con su propio `pnpm-lock.yaml`. No hay una Lambda Layer compartida: cada servicio incluye su copia de las utilidades comunes.

```bash
cd Flowex-auth-api-lambda && pnpm install && pnpm test && pnpm build
# Repetir en: auth-admin, registration-public, registration-admin, otp-service,
# payments-api, notification y consent-worker.
```

El pipeline de cada repositorio empaqueta `dist/` con las dependencias de producción y ejecuta `aws lambda update-function-code`. No hace falta empaquetar a mano.
