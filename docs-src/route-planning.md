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

## Cobertura y días de servicio

Flowex opera en **45 comunas de la Región Metropolitana**. La plataforma rechaza pedidos con
retiro o entrega fuera de ese límite.

| Comunas | Frecuencia | Días |
|---|---|---|
| 1 a 34 | Mismo día | Lunes a sábado |
| 35 a 45 | Programada | Martes y sábado |

Los precios no discriminan comuna.

### Comunas programadas

| # | Comuna | # | Comuna |
|---|---|---|---|
| 35 | Padre Hurtado | 41 | Talagante |
| 36 | Calera de Tango | 42 | Pirque |
| 37 | Lampa | 43 | Paine |
| 38 | Peñaflor | 44 | El Monte |
| 39 | Buin | 45 | Isla de Maipo |
| 40 | Colina | | |

### Cómo se aplica la regla

`communes.service_days` guarda los días en formato ISO, donde 1 es lunes y 7 es domingo.
Martes y sábado son `{2,6}`. La descripción en texto (`schedule_description`) es solo para
mostrar: el planificador lee el arreglo.

El filtro corre **antes de elegir el motor de optimización**, porque es una regla de la
operación y no del solucionador. Un pedido cuya comuna no tiene servicio ese día no se
rechaza: entra en la cola `unassigned` con motivo `outside_service_day` y el detalle indica
su próxima fecha.

```jsonc
{
  "trackingNumber": "FLX-2026-2461",
  "kind": "pickup",
  "reason": "outside_service_day",
  "detail": "Talagante no tiene servicio los miércoles. Próxima fecha: 2026-09-12."
}
```

Cuando una de las dos puntas del pedido está en comuna programada, manda la programada: la
ruta no puede salir un día en que una de las dos no tiene servicio.

### Rechazo por cobertura

`POST /orders` responde **400 `COMMUNE_OUT_OF_COVERAGE`** cuando el retiro o la entrega
caen fuera de las 45 comunas.

```jsonc
{
  "success": false,
  "error": "COMMUNE_OUT_OF_COVERAGE",
  "message": "Fuera de la zona de cobertura: Concepción (entrega)",
  "communes": ["Concepción (entrega)"]
}
```

Esto es distinto del cupo diario, que **nunca** bloquea un pedido y solo mueve su fecha
comprometida. La cobertura sí bloquea, porque aceptar un destino donde la operación no llega
sería prometer un servicio que no existe.

---

## Panel de configuración de comunas

Reservado al rol **root**. Cambiar una comuna decide qué pedidos acepta la plataforma y qué
día sale un conductor, así que la escritura exige **doble confirmación** y queda registrada.

### `GET /internal/communes`

Lista las comunas con su frecuencia, sus días y su centro (`latitude`, `longitude`). Las
coordenadas son lo que permite dibujarlas en el mapa del selector, así el operador ve qué
ya está cubierto antes de agregar nada. Acepta `?covered=true`.

### `GET /internal/geo/commune-at`

Qué comuna hay bajo un punto del mapa. Es lo que convierte un clic del selector en un
nombre y una región, en vez de depender de que se escriban bien.

Parámetros obligatorios: `lat` y `lng`.

En Chile la región es `administrative_area_level_1` y la comuna
`administrative_area_level_3`. Los puntos rurales que solo traen `locality` caen a ese, en
lugar de responder vacío y hacer ver el mapa como roto.

```jsonc
{
  "success": true,
  "commune": "Til Til",
  "region": "Región Metropolitana de Santiago",
  "latitude": -33.0839,
  "longitude": -70.9294,
  "placeId": "ChIJ…",
  "existing": null
}
```

`existing` viene con la comuna ya registrada cuando el punto cae sobre una. El selector lo
muestra y bloquea el alta, en vez de dejar que falle por duplicado.

Un punto fuera de Chile o en el mar responde `200` con `success: false` y
`NO_COMMUNE_AT_POINT`: no es un error de la petición, es que ahí no hay nada que agregar.
Una caída de Google responde `502 GEOCODING_FAILED`.

Google puede resolver la comuna sin la región. La respuesta lo refleja con `region: null` y
el alta queda bloqueada, porque necesita las dos.

### Alta de una comuna

`POST /internal/communes` acepta `latitude`, `longitude` y `placeId`. Con ellos el servidor
no geocodifica el nombre, que es donde se colaban los errores de escritura. Sin ellos sigue
resolviendo por nombre y región.

### `POST /internal/communes/{id}/change-request`

Primer paso. Devuelve el diff calculado en el servidor y un token firmado para **ese** cambio.

```jsonc
{
  "requiresConfirmation": true,
  "commune": { "id": 41, "name": "Talagante", "officialNumber": 41 },
  "changes": [
    { "campo": "Días de servicio", "antes": "martes y sábado", "despues": "martes" }
  ],
  "confirmationToken": "1788965197732.c26751e6…",
  "expiresAt": "2026-09-09T14:46:37.732Z"
}
```

### `PUT /internal/communes/{id}`

Segundo paso. Aplica el cambio solo si el token corresponde exactamente a él.

**409 `CONFIRMATION_REQUIRED`** cuando falta el token, cuando venció, o cuando se intenta
reutilizar en un cambio distinto del que se revisó.

**Por qué un token firmado y no una sesión.** Un Lambda no comparte memoria entre
contenedores, así que un token guardado en RAM se aceptaría o rechazaría según qué
contenedor respondiera. El token es un HMAC sobre el cambio concreto, el usuario y la
expiración: es sin estado, no se puede falsificar desde el cliente, y no sirve para aplicar
un cambio distinto al revisado. Vence a los 5 minutos.

En la interfaz hay además una segunda barrera humana: el operador debe escribir el nombre de
la comuna para habilitar el botón.

### `GET /internal/communes/{id}/history`

Bitácora de cambios con quién los hizo y qué se movió. Visible para `root` y `admin`.

### Validaciones

- `serviceDays` solo admite enteros de 1 a 7.
- Una comuna **con cobertura no puede quedar sin días**: sus pedidos no entrarían nunca en una ruta. Para dejarla sin días hay que retirarle la cobertura en el mismo cambio.
- `zoneType` solo admite `same_day` o `scheduled`.

> Los seeds no otorgan cobertura. Corren en cada despliegue, así que hacerlo revertiría en
> silencio cualquier ajuste hecho desde el panel.

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

### Tope diario de corridas

Cada corrida se paga a la API de Route Optimization. En un ambiente de pruebas el mismo día
se replanifica una y otra vez, y eso es dinero gastado en un despliegue que no despacha
nada, así que **develop tiene un tope diario y producción no**.

| Ambiente | `ROUTE_PLANNING_DAILY_LIMIT` | Efecto |
|---|---|---|
| dev | `2` | Dos corridas por fecha, la programada del corte incluida |
| prod | `0` | Sin tope |

El tope es un número en el entorno, no una comprobación del nombre del ambiente: producción
no puede heredarlo por accidente y se cambia sin desplegar código.

**Una simulación cuenta.** `dryRun` no escribe nada, pero llama a Google igual que una
corrida real y cuesta lo mismo. Dejarla fuera del contador volvía el tope burlable.

El límite se comprueba antes de leer la base y antes de llamar al optimizador, así que una
corrida rechazada no gasta ninguna petición.

Una corrida que termina en excepción no queda registrada y por lo tanto no descuenta cupo.

**429 `PLANNING_DAILY_LIMIT_REACHED`**

```jsonc
{
  "success": false,
  "error": "PLANNING_DAILY_LIMIT_REACHED",
  "message": "Se alcanzó el límite de 2 generación(es) de rutas por día en este ambiente. Hoy se ejecutaron 2. El contador se reinicia mañana.",
  "quota": { "used": 2, "limit": 2, "remaining": 0, "exhausted": true, "date": "2026-09-09" }
}
```

Si el contador no se puede leer, la corrida se deja pasar. Quedarse sin poder planificar
porque falló un `SELECT` es peor que una corrida sin contar.

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
  "quota": { "used": 1, "limit": 2, "remaining": 1, "exhausted": false, "date": "2026-09-09" },
  "warnings": []
}
```

`quota` viene con la corrida ya descontada. `limit: 0` significa sin tope.

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

## `GET /internal/routes/planning-quota`

Cuántas generaciones quedan hoy, sin gastar ninguna. La consola lo consulta al entrar y al
cambiar de fecha, para avisar antes de gastar la última en vez de que el tope aparezca como
un rechazo.

Parámetro opcional: `date` (`YYYY-MM-DD`, por defecto hoy). El contador se lleva por fecha,
así que se reinicia solo.

```jsonc
{
  "success": true,
  "unlimited": false,
  "quota": { "used": 1, "limit": 2, "remaining": 1, "exhausted": false, "date": "2026-09-09" }
}
```

En producción responde `unlimited: true` con `remaining: null`.

---

## `GET /internal/routes` · `GET /internal/routes/{id}`

Leen desde `delivery_routes` y `route_orders`, unidas con la memoria del Lambda como
respaldo. Las paradas vienen ordenadas por `stop_sequence`.

Parámetros opcionales: `type` (`pickup` | `delivery`) y `driverId`.

---

## `POST /internal/routes/{id}/orders`

Agrega pedidos a una ruta ya generada. El `{id}` acepta el código de la ruta, su `app_id`
o su UUID.

El servidor inserta las paradas al final, recalcula el recorrido con Directions y reescribe
la secuencia con el orden que devuelve Google, de modo que los kilómetros que se muestran y
el orden que sigue el conductor describan el mismo viaje.

**409 `ROUTE_NOT_OPEN`**

Una ruta cerrada o anulada no admite paradas nuevas. El conductor ya entregó la hoja del
día, así que un pedido agregado ahí no lo recogería nadie: entra en la planificación
siguiente.

```jsonc
{
  "success": false,
  "error": "ROUTE_NOT_OPEN",
  "message": "La ruta RUT-REC-20260909-001 está cerrada y ya no admite paradas. Los pedidos entrarán en la próxima planificación.",
  "status": "completed"
}
```

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
La creación de un pedido nunca se bloquea por capacidad (D4).

La capacidad solo se puede exigir cuando la patente de la ruta corresponde a un vehículo de
la flota. Si no lo resuelve, los pedidos se agregan y la respuesta lo informa en vez de
inventar un límite.

**En la consola.** El panel de pedidos pendientes del tablero de administración ofrece un
selector con las rutas de recogida abiertas del día, con su conductor y su número de
paradas. Sin ninguna ruta abierta los botones quedan deshabilitados: primero hay que generar
la planificación.

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
