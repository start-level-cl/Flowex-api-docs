# Integración con Google Route Optimization API

Flowex resuelve el ruteo con **Route Optimization API** (`optimizeTours`), el servicio de
Google Cloud que resuelve un problema de ruteo de flotas con capacidades y ventanas
horarias.

Esta página cubre la integración con Google. El algoritmo, los endpoints y el modelo de
datos están en [Planificación de Rutas y Flota](/route-planning).

::: warning Estado
Hasta la implementación del plan de ruteo esta página describía un adaptador que existía en
el frontend pero **nunca se invocaba**, y una arquitectura de dos rutas fijas
(`RUT-REC-001` y `RUT-ENT-001`) que eran datos de prueba y fueron eliminados. El contenido
de abajo refleja la integración real.
:::

---

## 1. Dos APIs distintas

Es la confusión que más caro sale, porque las dos son de Google Maps Platform y suenan
parecido.

| | Directions API | Route Optimization API |
|---|---|---|
| Resuelve | Un vehículo, orden de visita | Muchos vehículos con capacidades |
| Límite | 25 waypoints | Cientos de envíos |
| Capacidad | No la conoce | `loadLimits` / `loadDemands` nativos |
| Ventanas horarias | No | Por vehículo y por visita |
| Autenticación | API key | Cuenta de servicio con OAuth2 |
| Secreto | `flowex/{stage}/google/maps` | `flowex/{stage}/google/route-optimization` |

**La API key de Maps no sirve para `optimizeTours`.** Son credenciales de naturaleza
distinta, por eso el cliente de ruteo es una clase aparte y no una extensión del cliente de
Maps.

Ambas se usan: `optimizeTours` arma las rutas y decide qué va en cada vehículo, y Directions
entrega la geometría y el orden fino de las paradas dentro de cada ruta ya formada.

---

## 2. Puesta en marcha en Google Cloud

Pasos manuales, fuera del repositorio:

1. Habilitar **Route Optimization API** en el proyecto de GCP.
2. Activar el billing del proyecto. La API no responde sin él.
3. Crear una cuenta de servicio con el rol de cliente de la API.
4. Generar su credencial en formato JSON.
5. Cargar ese JSON completo como secreto en AWS Secrets Manager bajo
   `flowex/{stage}/google/route-optimization`.

El permiso IAM que deja al Lambda `auth-admin` leer ese secreto se despliega junto con el
modelo de flota, no al final. Así una demora en la habilitación aparece temprano en lugar de
bloquear la última fase.

Variables de entorno del Lambda:

| Variable | Uso |
|---|---|
| `ROUTE_OPTIMIZATION_SECRET_NAME` | Nombre del secreto con la cuenta de servicio |
| `GCP_PROJECT_ID` | Proyecto sobre el que se llama a `optimizeTours` |

---

## 3. Autenticación

Flujo de **JWT firmado**, sin consentimiento de usuario ni refresh token:

1. Se firma con RS256 una aserción con `iss` (el correo de la cuenta de servicio), `scope`
   `https://www.googleapis.com/auth/cloud-platform`, `aud` y una vigencia de una hora.
2. Se intercambia en `https://oauth2.googleapis.com/token` con el grant
   `urn:ietf:params:oauth:grant-type:jwt-bearer`.
3. Google devuelve un token de acceso de vida corta que se cachea en memoria y se renueva un
   minuto antes de expirar, para que ninguna petición en vuelo muera con un token vencido.

---

## 4. Forma del payload

```jsonc
POST https://routeoptimization.googleapis.com/v1/projects/{projectId}:optimizeTours

{
  "model": {
    "shipments": [
      {
        "label": "FLX-2026-1234",
        "deliveries": [
          { "arrivalLocation": { "latitude": -33.45, "longitude": -70.6 }, "duration": "480s" }
        ],
        "loadDemands": {
          "weight_kg": { "amount": "20" },
          "volume_l":  { "amount": "216" },
          "packages":  { "amount": "1" }
        },
        "penaltyCost": 1000000
      }
    ],
    "vehicles": [
      {
        "label": "KJL-942",
        "startLocation": { "latitude": -33.3642, "longitude": -70.7301 },
        "endLocation":   { "latitude": -33.3642, "longitude": -70.7301 },
        "loadLimits": {
          "weight_kg": { "maxLoad": "800" },
          "volume_l":  { "maxLoad": "4400" },
          "packages":  { "maxLoad": "41" }
        },
        "costPerKilometer": 450,
        "costPerHour": 8500,
        "startTimeWindows": [{ "startTime": "…", "endTime": "…" }],
        "routeDurationLimit": { "maxDuration": "28800s" },
        "breakRule": { "breakRequests": [{ "minDuration": "1800s", "…": "…" }] }
      }
    ],
    "globalStartTime": "…",
    "globalEndTime": "…"
  },
  "searchMode": "RETURN_FAST",
  "considerRoadTraffic": true
}
```

### Tres detalles que hay que respetar

**`loadLimits` y `loadDemands` son mapas, no arreglos.** Se indexan por el nombre del tipo
de carga. El adaptador antiguo los modelaba como arreglos y la API los habría rechazado.

**`maxLoad` y `amount` son enteros.** Un volumen de 0,216 m³ se truncaría a cero y toda
restricción de capacidad quedaría en la práctica sin límite. Por eso el volumen cruza la
frontera con Google en **litros enteros**. La base de datos conserva metros cúbicos con tres
decimales; la conversión vive solo en el adaptador.

**`penaltyCost` tiene que ser alto.** Es lo que cuesta dejar un envío fuera. Si es bajo, el
solucionador descubre que omitir un pedido lejano sale más barato que atenderlo y empieza a
descartar clientes en silencio.

---

## 5. Un modelo por tipo de ruta

Las recogidas y las entregas se envían en **dos peticiones separadas**, no como pares
pickup-delivery dentro de un mismo modelo.

Las rutas son de un solo tipo por decisión de negocio. Mandar ambos tipos en un solo modelo
dejaría al solucionador intercalarlos, que es exactamente lo que se decidió no hacer.

---

## 6. Respuesta y degradación

`ShipmentRoute` se mapea a `delivery_routes` más `route_orders.stop_sequence`.
`skippedShipments` se convierte en la cola `unassigned` conservando el motivo: un pedido que
el solucionador no pudo atender se reporta, nunca se descarta.

Cualquier pedido que no aparezca ni en una ruta ni entre los omitidos igual se contabiliza
como no asignado, para que la suma de planificados y no asignados siempre cuadre con la
entrada.

Si `optimizeTours` falla, expira o devuelve error de cuota, el planificador degrada a su
propio bin-packing. Es un plan real que respeta capacidad, jornada y prioridades: rutas
correctas aunque no óptimas. La respuesta declara qué motor corrió en el campo `engine`.

---

## 7. Costo

Se factura por cada envío y cada vehículo que entra en la optimización, en cada corrida.

Con una corrida diaria a las 12:00 más las re-generaciones manuales que dispare `root`, el
gasto queda acotado. Para tener consumo real en vez de una proyección, cada llamada se
registra en `route_optimization_runs` con su disparador, la cantidad de envíos y de
vehículos enviados, y el motor que resolvió.
