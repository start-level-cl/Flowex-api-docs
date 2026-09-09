# Planificación de Rutas, Flota y Capacidad

El motor de ruteo de Flowex arma cada día las rutas de recogida y de reparto en torno a los
conductores realmente en turno y a la capacidad de sus vehículos.

Este documento describe el algoritmo, el contrato de los endpoints y los códigos de error.

---

## Decisiones que fija este módulo

| Regla | Comportamiento |
|---|---|
| **El pedido nunca se rechaza** | La capacidad restringe la ruta, no el alta del pedido. Lo que no cabe hoy queda en `unassigned` y entra al corte siguiente. |
| **Rutas de un solo tipo** | Cada ruta es de recogida o de entrega. Un conductor puede encadenar una de recogida detrás de una de entrega en la misma zona; el vehículo se vacía en el hub entre ambas, así que las capacidades no se acumulan. |
| **Los no entregados vuelven al hub** | Un pedido con intento fallido regresa al hub e ingresa de primero en la siguiente generación. |
| **La jornada es configurable** | El planificador lee el turno de cada conductor desde la base en cada corrida. No existe ninguna jornada fija en el código. |
| **Corte diario a las 12:00** | Una regla de EventBridge dispara la planificación sobre los pedidos ingresados hasta ese momento. La re-generación bajo demanda queda reservada al rol `root`. |

---

## Carga por pedido

No hay balanza ni campo de peso real: la carga se deriva del catálogo de tarifas. Cada bulto
aporta el **tope de peso de su categoría** y el **volumen de su caja nominal**.

| Categoría | Dimensiones | Peso computado | Volumen computado |
|---|---|---|---|
| S | 30x30x30 cm | 6 kg | 0,027 m³ |
| M | 40x40x40 cm | 10 kg | 0,064 m³ |
| L | 60x60x60 cm | 20 kg | 0,216 m³ |

Los campos se llaman `estimated_weight_kg` y `estimated_volume_m3` a propósito: son cotas
superiores declaradas, no mediciones. `load_source` vale `tariff_estimate` y pasará a
`weighed` el día que exista una balanza en el hub, sin necesidad de otra migración.

**Consecuencia asumida:** la carga se sobreestima y se reserva flota de más. Un sobre de
200 gramos cuenta como 6 kilos.

### Qué restricción manda

Con estos valores un bulto L pesa 20 kg y ocupa 0,216 m³, es decir unos 92 kg/m³. Un furgón
de 4,4 m³ y 800 kg de carga útil se llena de **volumen** con 20 bultos L y 407 kg, mucho
antes que de peso.

En esta operación el volumen es la restricción activa casi siempre. El planificador evalúa
las tres dimensiones de todos modos.

---

## Algoritmo

```
1. Cargar de Aurora, para la fecha del corte:
     · pedidos elegibles de entrega y de recogida, por separado
     · vehículos activos + conductores en turno  → la flota define el techo
     · pedidos no entregados que retornaron al hub → van al frente de la cola
2. Clustering geográfico por tipo de ruta
     · agrupar por zona (communes.zone_type: same_day / scheduled)
     · dentro de la zona, k-means sobre lat/lng con distancia haversine
3. Bin-packing por vehículo, First-Fit Decreasing sobre volumen
     restricciones duras:
       Σ estimated_weight_kg ≤ vehicle.max_weight_kg
       Σ estimated_volume_m3 ≤ vehicle.max_volume_m3
       Σ bultos              ≤ vehicle.max_packages
       Σ tiempo del día      ≤ min(ventana de turno, tope legal) − colación
       driver.license_class habilita vehicle.required_license_class
     prioridad: reintento fallido > same_day > antigüedad
4. Cada bin → una ruta; ordenar las paradas con Directions y aplicar waypointOrder
5. Encadenamiento por conductor: tras la ruta de entrega de una zona, se ofrece la ruta
   de recogida de esa misma zona si la jornada lo permite
6. Sobrante → cola `unassigned` con motivo explícito
```

### Distancia

Se usa haversine, no distancia euclídea sobre grados crudos. A la latitud de Santiago
(−33,4°) un grado de longitud equivale a 0,835 de un grado de latitud, así que medir en
grados planos sobrepondera la longitud alrededor de un 20%.

### Motor

| Motor | Cuándo | Qué resuelve |
|---|---|---|
| `optimize_tours` | Cuando el despliegue tiene configurada la cuenta de servicio de Google | Multi-vehículo con capacidades y ventanas horarias |
| `bin_packing` | Degradación | El planificador propio. Rutas correctas aunque no óptimas |

La degradación es a un plan real que respeta todas las restricciones, nunca a números
inventados. La respuesta siempre declara qué motor corrió en el campo `engine`.

---

## `POST /internal/routes/plan-daily`

Genera la planificación del día.

**Cuerpo**

```jsonc
{
  "trigger": "api",      // "api" | "manual" | "schedule"
  "dryRun": true,        // simula sin comprometer la flota
  "date": "2026-09-09"   // opcional, por defecto hoy
}
```

`trigger: "manual"` es el botón de re-generación y **exige rol `root`**. La validación vive
en el endpoint, no en la interfaz.

**Respuesta**

```jsonc
{
  "success": true,
  "dryRun": true,
  "engine": "bin_packing",
  "date": "2026-09-09",
  "trigger": "api",
  "plannedAt": "2026-09-09T15:00:12.481Z",
  "routes": [
    {
      "appId": "rut_ent_20260909_1",
      "code": "RUT-ENT-20260909-001",
      "name": "Ruta de Reparto Ñuñoa",
      "type": "delivery",
      "status": "planned",
      "assignedDriverName": "Roberto Gómez",
      "vehiclePlate": "KJL-942",
      "totalOrders": 18,
      "totalPackages": 22,
      "totalWeightKg": 210.0,
      "totalVolumeM3": 1.408,
      "estimatedDistanceKm": 42.7,
      "estimatedDuration": "3h 21m",
      "estimateSource": "google",
      "sequenceInDay": 1,
      "chainedFromCode": null,
      "utilization": { "weightPct": 26, "volumePct": 38, "packagesPct": 65, "timePct": 45 },
      "stops": [
        { "stopSequence": 1, "trackingNumber": "FLX-2026-1234", "commune": "Ñuñoa", "lat": -33.45, "lng": -70.6 }
      ]
    }
  ],
  "unassigned": [
    { "trackingNumber": "FLX-2026-5678", "kind": "delivery", "reason": "capacity_exceeded" }
  ],
  "utilization": [
    { "plate": "KJL-942", "driver": "Roberto Gómez", "weightPct": 26, "volumePct": 38, "packagesPct": 65, "timePct": 45 }
  ],
  "metrics": { "routesCreated": 3, "totalUnassigned": 4, "fallbackUsed": false },
  "warnings": []
}
```

### `estimateSource`

| Valor | Significado |
|---|---|
| `google` | Directions entregó la secuencia y los kilómetros. El orden de las paradas y la distancia describen el mismo viaje. |
| `fallback` | Google no respondió. El orden es una heurística de vecino más cercano y la distancia una estimación propia. |

La interfaz solo puede rotular la lista como "optimizada" cuando vale `google`.

### Motivos de `unassigned`

| Motivo | Significado |
|---|---|
| `capacity_exceeded` | No cupo en la flota del día |
| `out_of_shift_window` | No alcanzaba la jornada de ningún conductor |
| `no_fleet_available` | Nadie en turno con un vehículo utilizable |
| `zone_not_allowed` | Los vehículos disponibles no cubren esa comuna |
| `missing_coordinates` | El pedido no tiene coordenadas válidas |

Ningún pedido de esta lista fue rechazado. Todos entran al corte siguiente.

---

## `GET /internal/routes` · `GET /internal/routes/{id}`

Leen desde `delivery_routes` y `route_orders`, unidas con la memoria del Lambda como
respaldo. Las paradas vienen ordenadas por `stop_sequence`.

Parámetros opcionales: `type` (`pickup` | `delivery`) y `driverId`.

---

## `POST /internal/routes/{id}/orders`

Agrega pedidos a una ruta ya generada. Valida la capacidad restante del vehículo.

**409 `ROUTE_CAPACITY_EXCEEDED`**

```jsonc
{
  "success": false,
  "error": "ROUTE_CAPACITY_EXCEEDED",
  "message": "El vehículo KJL-942 no admite estos pedidos: volumen 4.100 m3 supera 3.7 m3",
  "capacity": { "maxWeightKg": 800, "maxVolumeM3": 3.7, "maxPackages": 34 },
  "projected": { "weightKg": 620, "volumeM3": 4.1, "packages": 31 }
}
```

Es la única validación dura de capacidad que ve una persona, y esa persona es el operador.

---

## `POST /internal/routes/{id}/directions`

Devuelve la geometría de la ruta como un circuito cerrado hub → paradas → hub.

**Chunking.** Directions admite 25 waypoints por llamada. Sobre 23 paradas intermedias la
petición se parte en tramos encadenados: cada tramo arranca donde terminó el anterior y el
último cierra en el hub. Las distancias y duraciones se suman, y los `waypointOrder` de cada
tramo se reindexan sobre el arreglo global. La optimización queda local a cada tramo, no
global. El campo `chunked` lo reporta.

---

## `GET /internal/capacity/availability`

Cupo del día que se muestra al crear un pedido.

`?date=YYYY-MM-DD&zone=same_day|scheduled`

```jsonc
{
  "date": "2026-09-09",
  "zone": "same_day",
  "fleet": { "vehicles": 3, "drivers": 3 },
  "capacity":  { "weightKg": 3200, "volumeM3": 22.5, "packages": 420 },
  "committed": { "weightKg": 2110, "volumeM3": 14.1, "packages": 268 },
  "usedPct":   { "weight": 66, "volume": 63, "packages": 64 },
  "overallPct": 66,
  "status": "available",
  "nextAvailableDate": null,
  "loadSource": "tariff_estimate"
}
```

`overallPct` es el **mayor** de los tres porcentajes: basta que una dimensión se llene para
que el vehículo no acepte más.

| Ocupación | `status` | Mensaje |
|---|---|---|
| menos de 75 % | `available` | Cupo disponible para hoy |
| 75 % a 100 % | `tight` | Últimos cupos para hoy |
| sobre 100 % | `full` | Sin cupo para hoy. Se despacha el `nextAvailableDate`. |

**Es informativo y nunca bloquea.** Su único efecto es fijar la fecha comprometida del
pedido.

Como el peso sale del tope de la categoría y no de una balanza, el cupo se ve más lleno de
lo que realmente está. El sistema dirá "sin cupo" antes de que la flota se llene de verdad.

---

## Flota

### `GET /internal/vehicles`

Lista la flota. Los costos por kilómetro y por hora se omiten para el rol `driver`.

### `GET /internal/vehicles/presets`

Capacidades por defecto según tipo de vehículo. Solo precargan el formulario; el
planificador siempre usa los valores guardados por unidad.

| Tipo | Carga útil | Volumen | Bultos | Licencia |
|---|---|---|---|---|
| `moto` | 20 kg | 0,10 m³ | 6 | A-1 |
| `furgon_compacto` | 800 kg | 3,70 m³ | 34 | B |
| `furgon` | 800 kg | 4,40 m³ | 41 | B |
| `furgon_grande` | 1.200 kg | 7,80 m³ | 73 | B |
| `camion_3_4` | 3.000 kg | 20,00 m³ | 187 | A-4 |
| `camion_rampla` | 12.000 kg | 45,00 m³ | 421 | A-5 |

`max_packages` no es un dato del fabricante: se deriva del volumen con un factor de estiba
de 0,75 sobre un bulto promedio de 0,08 m³.

### `POST` / `PUT` / `DELETE /internal/vehicles`

Requieren rol `root` o `admin`. `DELETE` es baja lógica: las rutas y asignaciones pasadas
siguen refiriendo a la unidad, que solo deja de planificarse.

**400 `INVALID_VEHICLE`** cuando falta alguno de los tres límites de carga. Son obligatorios
porque se convierten en los `loadLimits` que recibe el optimizador; una unidad incompleta no
puede entrar a una optimización.

---

## Jornadas

### `GET /internal/drivers/shifts`

Lista los conductores con su jornada y el tiempo útil calculado.

### `PUT /internal/drivers/{id}/shift`

```jsonc
{
  "shiftStart": "08:00",
  "shiftEnd": "17:00",
  "maxDailyHours": 8,
  "breakMinutes": 45,
  "defaultVehicleId": "…",
  "isAvailable": true
}
```

El tiempo útil es el **menor** entre la ventana de turno y el tope legal diario, menos la
colación. Una jornada de 09:00 a 18:00 con tope de 8 horas deja 7,5 horas útiles, no 8,5.

**400 `INVALID_SHIFT`** si el término no es posterior al inicio, si el tope diario sale del
rango 0 a 24, o si la colación no cabe en la jornada.

---

## Modelo de datos

| Tabla | Rol |
|---|---|
| `vehicles` | Flota. Cada campo existe porque `optimizeTours` lo consume. |
| `driver_profiles` | Extendida con `shift_start`, `shift_end`, `max_daily_hours`, `break_minutes`, `license_class`, `default_vehicle_id`. |
| `route_assignments` | Asignación ruta ↔ conductor ↔ vehículo, con `sequence_in_day` y `chained_from_route_id`. |
| `delivery_routes` | Extendida con `zone`, `hub_name`, `communes`, `app_id`, `estimate_source`, `planned_date`. |
| `route_orders` | `stop_sequence` ahora se escribe realmente. |
| `route_optimization_runs` | Contador de corridas, envíos y vehículos optimizados. |

### Mapeo a `optimizeTours`

| Origen | Campo de Google |
|---|---|
| `vehicles.max_weight_kg` | `loadLimits["weight_kg"].maxLoad` |
| `vehicles.max_volume_m3` | `loadLimits["volume_l"].maxLoad` (**en litros**) |
| `vehicles.max_packages` | `loadLimits["packages"].maxLoad` |
| `vehicles.cost_per_km` / `cost_per_hour` | `costPerKilometer` / `costPerHour` |
| `driver_profiles.shift_start` / `shift_end` | `startTimeWindows` / `endTimeWindows` |
| `driver_profiles.max_daily_hours` | `routeDurationLimit.maxDuration` |
| `driver_profiles.break_minutes` | `breakRule.breakRequests[].minDuration` |
| `orders.estimated_volume_m3` | `loadDemands["volume_l"].amount` |

**Trampa de unidades.** Los `maxLoad` y `amount` de `optimizeTours` son enteros. El volumen
en metros cúbicos se truncaría a cero y toda restricción de capacidad quedaría en la
práctica sin límite. Por eso toda la frontera con Google trabaja en **litros enteros**: un
bulto L son 216 litros y un furgón de 4,40 m³ son 4400. La base conserva metros cúbicos y la
conversión vive solo en el adaptador.

`loadLimits` y `loadDemands` son **mapas indexados por tipo de carga**, no arreglos.

---

## Autenticación de Google

Son dos productos distintos con dos credenciales distintas.

| API | Credencial | Secreto |
|---|---|---|
| Directions | API key | `flowex/{stage}/google/maps` |
| Route Optimization | Cuenta de servicio con OAuth2 | `flowex/{stage}/google/route-optimization` |

La API key de Maps **no sirve** para `optimizeTours`. El cliente firma un JWT con la clave
privada de la cuenta de servicio y lo intercambia por un token de acceso de vida corta.

Puesta en marcha en Google Cloud, fuera del repositorio:

1. Habilitar Route Optimization API y activar el billing del proyecto.
2. Crear una cuenta de servicio con el rol de cliente de la API.
3. Generar su credencial en formato JSON.
4. Cargar ese JSON como secreto en AWS Secrets Manager.

Mientras el secreto no exista, el planificador funciona con su propio motor y lo declara en
`engine`.
