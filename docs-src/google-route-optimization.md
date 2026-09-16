# Integración con Google Route Optimization API y Google Maps

Flowex resuelve la planificación y el ruteo dinámico de su flota combinando dos servicios de Google Cloud y Google Maps Platform: **Route Optimization API** (`optimizeTours`) para la asignación y partición de flota, y **Directions API** para la geometría y el orden de visita dentro de cada ruta.

Esta página constituye la **guía técnica exhaustiva de configuración, credenciales, secretos en AWS Secrets Manager, variables de entorno y comandos operativos** para poner en marcha el sistema. El algoritmo general, el corte de las 12:00 y los endpoints de flota se encuentran en [Planificación de Rutas, Flota y Capacidad](/route-planning).

---

## 1. Dos APIs Distintas: Propósito y Credenciales

Es fundamental distinguir ambas APIs, ya que utilizan tipos de credenciales y modelos de seguridad diferentes:

| Característica | Directions API | Route Optimization API |
| :--- | :--- | :--- |
| **Objetivo** | Geometría y secuencia fina de paradas de **un solo vehículo** | Asignación global de **múltiples vehículos** con restricciones de carga |
| **Límite de Paradas** | 25 waypoints por petición (Flowex aplica *chunking* cada 23) | Cientos de envíos simultáneos en un único modelo |
| **Capacidad y Carga** | No gestiona capacidades ni peso | Soporte nativo de mapas `loadLimits` y `loadDemands` |
| **Ventanas Horarias** | No contempla horarios de chofer | Soporte de `startTimeWindows`, `routeDurationLimit` y descansos (`breakRule`) |
| **Tipo de Credencial** | **API Key** de Google Maps | **Service Account (Cuenta de Servicio)** de Google Cloud con clave privada |
| **Flujo de Autenticación** | Header o query param `key=AIzaSy...` | JWT firmado (RS256) intercambiado por Bearer Token OAuth2 |
| **Secreto en AWS Secrets Manager** | `flowex/{stage}/google/maps` | `flowex/{stage}/google/route-optimization` |
| **Cliente TypeScript en Lambda** | [`GoogleMapsClient`](file:///C:/Users/joyta/OneDrive/Desktop/inspytech/flowEx/Flowex-auth-admin-lambda/src/clients/google-maps-client.ts) | [`RouteOptimizationClient`](file:///C:/Users/joyta/OneDrive/Desktop/inspytech/flowEx/Flowex-auth-admin-lambda/src/clients/route-optimization-client.ts) |

::: tip Complementariedad Operativa
Ambas APIs trabajan de manera coordinada: `optimizeTours` resuelve qué pedidos corresponden a cada chofer y vehículo según su capacidad, y una vez armada la ruta, `Directions API` traza la polylinea geográfica y calcula la distancia precisa en kilómetros para la aplicación del conductor.
:::

---

## 2. Matriz Completa de Variables de Entorno

El Lambda [`flowex-auth-admin`](file:///C:/Users/joyta/OneDrive/Desktop/inspytech/flowEx/Flowex-auth-admin-lambda) y los servicios de planificación utilizan las siguientes variables de configuración:

| Variable de Entorno | Requerida | Valor por Defecto | Descripción |
| :--- | :--- | :--- | :--- |
| `ROUTE_OPTIMIZATION_SECRET_NAME` | **Sí** (en AWS) | `flowex/dev/google/route-optimization` | Nombre o ARN completo del secreto en AWS Secrets Manager que contiene el JSON de la cuenta de servicio de GCP. |
| `GCP_PROJECT_ID` | Opcional | `project_id` del JSON | Identificador del proyecto en Google Cloud Console. Si no se define, el cliente lo extrae automáticamente del JSON de la Service Account. |
| `GOOGLE_ROUTE_OPTIMIZATION_KEY` | Opcional (Dev/CI) | `undefined` | String con el contenido JSON completo de la clave de servicio. Permite levantar el optimizador en entornos locales o de prueba sin conectar a Secrets Manager. |
| `GOOGLE_MAPS_SECRET_NAME` | **Sí** (en AWS) | `flowex/dev/google/maps` | Nombre o ARN del secreto en AWS Secrets Manager que contiene la API Key de Google Maps para Directions. |
| `GOOGLE_MAPS_API_KEY` | Opcional (Dev/CI) | `undefined` | API Key directa de Google Maps. Se utiliza como fallback prioritario en desarrollo local y tests unitarios. |
| `AWS_REGION` / `AWS_DEFAULT_REGION` | Opcional | `us-east-2` | Región de AWS donde se encuentra desplegado Secrets Manager y el servicio Lambda. |

---

## 3. Estructura de Secretos en AWS Secrets Manager

### Secreto A: `flowex/{stage}/google/route-optimization`

Almacena la clave privada de la cuenta de servicio de Google Cloud. Debe guardarse como texto plano (`SecretString`) con la estructura JSON estándar emitida por Google Cloud:

```json
{
  "type": "service_account",
  "project_id": "flowex-logistics-prod",
  "private_key_id": "example_private_key_id",
  "private_key": "-----BEGIN PRIVATE KEY-----\\n<CONTENIDO_DE_TU_CLAVE_PRIVADA_RSA_PEM>\\n-----END PRIVATE KEY-----\\n",
  "client_email": "flowex-route-optimizer@flowex-logistics-prod.iam.gserviceaccount.com",
  "client_id": "109876543210987654321",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/flowex-route-optimizer%40flowex-logistics-prod.iam.gserviceaccount.com"
}
```

* **Validaciones del cliente**: El código verifica estrictamente la presencia de `client_email` y `private_key`. Si alguno de estos campos falta, emite un error descriptivo y activa la degradación controlada a bin-packing.

### Secreto B: `flowex/{stage}/google/maps`

Almacena la API Key de Google Maps para Directions API y cálculo de matrices de distancia. Se aceptan los siguientes formatos:

#### Opción 1: Objeto JSON con clave `apiKey` (Recomendado)
```json
{
  "apiKey": "<TU_GOOGLE_MAPS_API_KEY>"
}
```

#### Opción 2: Objeto JSON con clave `key`
```json
{
  "key": "<TU_GOOGLE_MAPS_API_KEY>"
}
```

#### Opción 3: String directo
```txt
<TU_GOOGLE_MAPS_API_KEY>
```

---

## 4. Guía de Puesta en Marcha en Google Cloud Platform (GCP)

Para configurar el entorno desde cero en Google Cloud, sigue estos pasos utilizando la consola de GCP o Google Cloud SDK (`gcloud` CLI):

### Paso 1: Habilitar las APIs necesarias

Ambas APIs deben estar activas y el proyecto debe tener una cuenta de facturación (Billing Account) vinculada:

```bash
# Definir ID de proyecto GCP
export GCP_PROJECT_ID="flowex-logistics-prod"

# Habilitar Route Optimization API y Directions API
gcloud services enable \
  routeoptimization.googleapis.com \
  directions-backend.googleapis.com \
  --project="${GCP_PROJECT_ID}"
```

### Paso 2: Crear la Cuenta de Servicio (Service Account)

```bash
# Crear la cuenta de servicio dedicada al optimizador
gcloud iam service-accounts create flowex-route-optimizer \
  --display-name="Flowex Route Optimization Engine" \
  --description="Cuenta de servicio para invocación de optimizeTours desde AWS Lambda" \
  --project="${GCP_PROJECT_ID}"
```

### Paso 3: Asignar el Rol de Ejecución en GCP

La cuenta requiere el rol de editor o invocador de la Route Optimization API:

```bash
gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
  --member="serviceAccount:flowex-route-optimizer@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/routeoptimization.editor"
```

### Paso 4: Generar y Descargar la Clave Privada JSON

```bash
# Generar la credencial en archivo JSON
gcloud iam service-accounts keys create gcp-service-account-key.json \
  --iam-account="flowex-route-optimizer@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --project="${GCP_PROJECT_ID}"
```

### Paso 5: Almacenar los Secretos en AWS Secrets Manager

Mediante AWS CLI, carga la credencial en el secreto correspondiente de tu entorno (`dev`, `staging` o `prod`):

```bash
# 1. Cargar clave de Route Optimization
aws secretsmanager create-secret \
  --name "flowex/prod/google/route-optimization" \
  --description "Google Cloud Service Account JSON for Route Optimization API" \
  --secret-string file://gcp-service-account-key.json \
  --region us-east-2

# 2. Cargar clave de Google Maps (Directions API)
aws secretsmanager create-secret \
  --name "flowex/prod/google/maps" \
  --description "Google Maps API Key for Directions API" \
  --secret-string '{"apiKey":"<TU_GOOGLE_MAPS_API_KEY>"}' \
  --region us-east-2
```

---

## 5. Permisos IAM Requeridos en AWS Lambda

El rol de ejecución IAM asignado a la función Lambda `flowex-auth-admin` debe contener la siguiente política mínima para permitir la lectura de los secretos en frío:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowReadGoogleSecrets",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-2:*:secret:flowex/*/google/route-optimization*",
        "arn:aws:secretsmanager:us-east-2:*:secret:flowex/*/google/maps*"
      ]
    }
  ]
}
```

---

## 6. Flujo de Autenticación OAuth2 Interno

El cliente [`RouteOptimizationClient`](file:///C:/Users/joyta/OneDrive/Desktop/inspytech/flowEx/Flowex-auth-admin-lambda/src/clients/route-optimization-client.ts) implementa el flujo estándar de **JWT firmado para cuentas de servicio (RFC 7523)**:

1. **Construcción del JWT**: Se genera una aserción con algoritmo **RS256**, donde `iss` es el `client_email`, el `scope` es `https://www.googleapis.com/auth/cloud-platform`, `aud` es `https://oauth2.googleapis.com/token` y la expiración es de 1 hora.
2. **Intercambio en Token Endpoint**: Se realiza una petición `POST` al endpoint de OAuth2 de Google con el grant `urn:ietf:params:oauth:grant-type:jwt-bearer`.
3. **Caché en Memoria con Skew**: El token `access_token` resultante se almacena en memoria global de la instancia Lambda. Se renueva automáticamente **60 segundos antes de expirar** (`TOKEN_SKEW_MS = 60000`), evitando rechazos por llamadas en curso durante el vencimiento.

---

## 7. Especificación del Payload `optimizeTours`

El adaptador [`optimize-tours-adapter.ts`](file:///C:/Users/joyta/OneDrive/Desktop/inspytech/flowEx/Flowex-auth-admin-lambda/src/services/optimize-tours-adapter.ts) serializa el modelo logístico según las especificaciones técnicas de Google:

```jsonc
POST https://routeoptimization.googleapis.com/v1/projects/{projectId}:optimizeTours
Authorization: Bearer <GCP_OAUTH2_ACCESS_TOKEN>
Content-Type: application/json

{
  "model": {
    "shipments": [
      {
        "label": "FLX-2026-8492",
        "deliveries": [
          {
            "arrivalLocation": { "latitude": -33.4372, "longitude": -70.6506 },
            "duration": "480s"
          }
        ],
        "loadDemands": {
          "weight_kg": { "amount": "15" },
          "volume_l":  { "amount": "45" },
          "packages":  { "amount": "2" }
        },
        "penaltyCost": 1000000
      }
    ],
    "vehicles": [
      {
        "label": "CF-LX-88",
        "startLocation": { "latitude": -33.3642, "longitude": -70.7301 },
        "endLocation":   { "latitude": -33.3642, "longitude": -70.7301 },
        "loadLimits": {
          "weight_kg": { "maxLoad": "600" },
          "volume_l":  { "maxLoad": "2500" },
          "packages":  { "maxLoad": "35" }
        },
        "costPerKilometer": 450,
        "costPerHour": 8500,
        "routeDurationLimit": { "maxDuration": "28800s" },
        "breakRule": {
          "breakRequests": [
            {
              "earliestStartTime": "2026-09-16T13:00:00Z",
              "latestStartTime": "2026-09-16T15:00:00Z",
              "minDuration": "1800s"
            }
          ]
        }
      }
    ],
    "globalStartTime": "2026-09-16T09:00:00Z",
    "globalEndTime": "2026-09-16T19:00:00Z"
  },
  "searchMode": "RETURN_FAST",
  "considerRoadTraffic": true
}
```

### Reglas Críticas del Modelo

1. **Mapas de Carga (`loadLimits` y `loadDemands`)**: Son objetos tipo diccionario indexados por tipo de recurso (`weight_kg`, `volume_l`, `packages`), **no son listas/arreglos**.
2. **Volumen en Litros Enteros (`volume_l`)**: Google requiere que `maxLoad` y `amount` sean cadenas que representan números **enteros**. Si se enviara `0.216 m³`, Google lo truncaría a `0`, anulando la restricción. Por tanto, el adaptador convierte metros cúbicos a litros multiplicando por 1.000 y redondeando.
3. **`penaltyCost` Elevado**: Fija un costo virtual alto (ej: `1.000.000`) para que el algoritmo priorice despachar todos los envíos posibles y no decida omitir destinos lejanos por economía matemática.
4. **Separación de Modelos**: Las órdenes de recolección (`pickup`) y de entrega (`delivery`) se envían en llamadas separadas. Las rutas son homogéneas por definición de negocio.

---

## 8. Parámetros Configurables en Base de Datos (`system_settings`)

Además de las variables de entorno, los límites de la flota se pueden ajustar en caliente en la tabla `system_settings` de PostgreSQL sin necesidad de re-desplegar código:

| Clave | Tipo | Valor Predeterminado | Descripción |
| :--- | :--- | :--- | :--- |
| `planner.max_orders_per_driver` | Entero | `35` | Cantidad máxima de paradas/órdenes asignadas a un chofer por turno. |
| `planner.max_weight_per_driver` | Decimal | `450.0` | Capacidad máxima en kilogramos por vehículo estándar. |
| `planner.max_volume_per_driver` | Decimal | `2.5` | Capacidad volumétrica máxima en metros cúbicos ($m^3$). |
| `planner.default_shift_start` | String | `09:00` | Hora de inicio predeterminada del turno (horario local CLT). |
| `planner.default_shift_end` | String | `18:00` | Hora de término predeterminada del turno (horario local CLT). |

---

## 9. Monitoreo, Auditoría y Fallback

* **Mecanismo de Fallback**: Si la llamada a Google excede el tiempo límite (`timeoutMs = 25000`), no tiene credenciales configuradas o responde con error de cuota, el servicio conmuta de inmediato a su algoritmo interno de **bin-packing**. El campo `engine` de la respuesta indicará `"google"` o `"fallback"`.
* **Registro de Auditoría**: Cada corrida de ruteo registra una fila en la tabla `route_optimization_runs` guardando:
  * `trigger_type`: `'scheduled'` (EventBridge a las 12:00) o `'manual'` (invocado por admin).
  * `shipments_count` y `vehicles_count`.
  * `engine_used`: Motor que resolvió la ruta.
  * `duration_ms`: Latencia del cálculo.
