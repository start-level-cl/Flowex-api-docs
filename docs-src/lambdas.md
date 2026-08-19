# Matriz y Configuración de AWS Lambdas

El backend de Flowex está compuesto íntegramente por funciones serverless desacopladas en **Node.js 22 LTS**, aprovisionadas con asignaciones de memoria y timeouts ajustados al perfil de carga de cada microservicio.

---

## 📊 Matriz Máster de Lambdas

| Función Lambda | Ámbito | Memoria | Timeout | Triggers | Variables Principales |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`Flowex-auth-api-lambda`** | Público | `256 MB` | `5 s` | API Gateway REST (`/auth/*`) | `AUTH_JWT_SECRET`, `AUTH_JWT_ISSUER` |
| **`Flowex-auth-admin-lambda`** | Privado (VPC) | `256 MB` | `10 s` | API Gateway VPC (`/internal/users/*`) | `DATABASE_URL`, `DB_SECRET_ARN` |
| **`Flowex-registration-public-lambda`** | Público | `512 MB` | `10 s` | API Gateway REST (`/registration/*`) | `COMPROBANTES_BUCKET_NAME`, `AWS_REGION` |
| **`Flowex-otp-service-lambda`** | Público | `256 MB` | `5 s` | API Gateway REST (`/otp/*`) | `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `NOTIFICATION_QUEUE_URL` |
| **`Flowex-registration-admin-lambda`** | Admin / Event | `256 MB` | `15 s` | API Gateway Admin / Invocación IAM | `AUTH_JWT_SECRET`, `DYNAMODB_TABLE` |
| **`Flowex-payments-api-lambda`** | Público | `256 MB` | `10 s` | API Gateway REST (`/payments/*`, `/webhooks/*`) | `MP_ACCESS_TOKEN`, `FINTOC_SECRET_KEY`, `FINTOC_WEBHOOK_SECRET` |
| **`Flowex-notification-lambda`** | SQS / Directo | `256 MB` | `10 s` | Cola Amazon SQS & API Gateway (`/notifications/*`) | `SES_SENDER_EMAIL`, `AWS_REGION` |

---

## ⚙️ Variables de Entorno por Microservicio

### `Flowex-auth-api-lambda`
```env
AUTH_JWT_SECRET=super_secret_jwt_key_flowex_prod
AUTH_JWT_ISSUER=flowex-auth
NODE_ENV=production
```

### `Flowex-registration-public-lambda`
```env
AWS_REGION=us-east-2
COMPROBANTES_BUCKET_NAME=flowex-comprobantes-prod-bucket
MAX_COMPROBANTE_BYTES=5242880
```

### `Flowex-otp-service-lambda`
```env
AWS_REGION=us-east-2
WHATSAPP_API_TOKEN=EAAG...PROD_WHATSAPP_TOKEN
WHATSAPP_PHONE_NUMBER_ID=109823471092384
NOTIFICATION_QUEUE_URL=https://sqs.us-east-2.amazonaws.com/123456789012/flowex-notif-queue-prod
STATUS_TOKEN_SECRET=flowex-prod-status-token-secret
```

### `Flowex-payments-api-lambda`
```env
MP_ACCESS_TOKEN=APP_USR-xxxx-xxxxxx-xxxxxx
MP_NOTIFICATION_URL=https://api.flowex.cl/webhooks/mercadopago
FINTOC_SECRET_KEY=sk_live_flowex_fintoc_prod
FINTOC_WEBHOOK_SECRET=whsec_flowex_fintoc_prod
```

### `Flowex-notification-lambda`
```env
AWS_REGION=us-east-2
SES_SENDER_EMAIL=no-reply@flowex.cl
```

---

## 🛠️ Compilación y Empaquetado

```bash
# Compilar Capa Compartida (Shared Layer)
cd Flowex-shared-layer && npm run build && cd ..

# Compilar Funciones Lambda
cd Flowex-auth-api-lambda && npm run build && cd ..
cd Flowex-auth-admin-lambda && npm run build && cd ..
cd Flowex-registration-public-lambda && npm run build && cd ..
cd Flowex-otp-service-lambda && npm run build && cd ..
cd Flowex-registration-admin-lambda && npm run build && cd ..
cd Flowex-payments-api-lambda && npm run build && cd ..
cd Flowex-notification-lambda && npm run build && cd ..
```
