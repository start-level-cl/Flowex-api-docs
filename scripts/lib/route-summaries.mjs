/**
 * Resúmenes de las rutas que el catálogo manual (route-metadata.mjs) no describía. La clave
 * es `método ruta` tal como la entrega el extractor. Una ruta nueva sin resumen aquí se
 * documenta igual, con "MÉTODO /ruta" como título.
 */
export const SUMMARIES = {
  // Registro (admin)
  'post /admin/registration/requests/{requestId}/approve': 'Aprobar una solicitud de registro pendiente',
  'get /admin/tariffs': 'Listar tarifas por tamaño de bulto (panel de administración)',
  'put /admin/tariffs/{tariffId}': 'Actualizar una tarifa por tamaño de bulto, con auditoría',

  // Auth
  'post /auth/consent/grant': 'Otorgar finalidades accesorias de consentimiento (Ley N° 21.719)',
  'post /auth/login/resend-2fa': 'Reenviar el código del segundo factor al correo',
  'post /auth/login/verify-2fa': 'Verificar el código del segundo factor y emitir la sesión',
  'patch /auth/security': 'Activar o desactivar el segundo factor de la cuenta',

  // Comunas y cobertura
  'get /internal/capacity/availability': 'Capacidad disponible de la flota para el día',
  'get /internal/communes': 'Listar comunas con cobertura, zona y días de servicio',
  'post /internal/communes': 'Crear una comuna con evaluación de factibilidad desde el hub más cercano',
  'patch /internal/communes/{communeId}': 'Actualizar cobertura o días de servicio de una comuna',
  'put /internal/communes/{communeId}': 'Actualizar cobertura o días de servicio de una comuna',
  'post /internal/communes/{communeId}/change-request': 'Solicitar confirmación para un cambio de cobertura con impacto',
  'get /internal/communes/{communeId}/feasibility': 'Evaluar si la flota alcanza la comuna desde un hub',
  'get /internal/communes/{communeId}/history': 'Bitácora de cambios de una comuna (acepta id o nombre)',
  'get /internal/geo/commune-at': 'Comuna que contiene un punto (latitud y longitud)',

  // Libreta de contactos
  'get /internal/contacts': 'Listar la libreta de contactos del remitente',
  'post /internal/contacts': 'Guardar un contacto con declaración de licitud (Ley N° 21.719)',
  'delete /internal/contacts/{contactId}': 'Suprimir un contacto de la libreta',
  'put /internal/contacts/{contactId}': 'Editar un contacto de la libreta',
  'get /internal/contacts/erasure-requests': 'Listar solicitudes de supresión de titulares sin cuenta',
  'post /internal/contacts/erasure-requests': 'Registrar la solicitud de supresión de un titular sin cuenta',
  'post /internal/contacts/erasure-requests/{erasureRequestId}/identify': 'Identificar los contactos afectados por una solicitud de supresión',
  'post /internal/contacts/erasure-requests/{erasureRequestId}/notify': 'Avisar a los remitentes afectados por una supresión',
  'post /internal/contacts/erasure-requests/{erasureRequestId}/purge': 'Ejecutar la supresión de los contactos del titular',
  'post /internal/contacts/erasure-requests/{erasureRequestId}/reject': 'Rechazar una solicitud de supresión con motivo',
  'get /internal/contacts/lawful-basis': 'Texto y versión vigentes de la declaración de licitud',

  // Conductores y flota
  'patch /internal/drivers/{driverId}/shift': 'Actualizar la jornada de un conductor',
  'put /internal/drivers/{driverId}/shift': 'Actualizar la jornada de un conductor',
  'get /internal/drivers/shifts': 'Jornadas configuradas de los conductores',
  'get /internal/vehicles': 'Listar vehículos de la flota con su hub',
  'post /internal/vehicles': 'Registrar un vehículo con límites de carga y hub',
  'delete /internal/vehicles/{vehicleId}': 'Dar de baja un vehículo',
  'patch /internal/vehicles/{vehicleId}': 'Actualizar un vehículo',
  'put /internal/vehicles/{vehicleId}': 'Actualizar un vehículo',
  'get /internal/vehicles/available': 'Vehículos disponibles para asignar a una ruta',
  'get /internal/vehicles/presets': 'Tipos de vehículo con capacidades sugeridas',

  // Hubs
  'get /internal/hubs': 'Listar hubs (incluye inactivos con ?includeInactive=true)',
  'post /internal/hubs': 'Crear un hub; la dirección se geocodifica en el servidor (root)',
  'delete /internal/hubs/{hubId}': 'Dar de baja un hub sin vehículos activos (root)',
  'patch /internal/hubs/{hubId}': 'Actualizar un hub; un nombre nuevo se propaga a pedidos y rutas (root)',
  'put /internal/hubs/{hubId}': 'Actualizar un hub; un nombre nuevo se propaga a pedidos y rutas (root)',

  // Invitaciones
  'get /internal/invites': 'Listar invitaciones emitidas',
  'post /internal/invites': 'Invitar a un administrador o conductor (root)',
  'delete /internal/invites/{inviteId}': 'Revocar una invitación',
  'get /internal/invites/{inviteId}/verify': 'Verificar una invitación antes del registro',

  // Pedidos
  'post /internal/orders': 'Crear un pedido',
  'post /internal/orders/batch': 'Crear pedidos en lote',
  'get /internal/orders/{orderId}': 'Detalle de un pedido; sin sesión devuelve solo la vista pública de rastreo',
  'patch /internal/orders/{orderId}/client-modifications': 'Modificaciones del cliente antes del retiro',
  'delete /internal/orders/{orderId}/coupon': 'Quitar el cupón de un pedido',
  'post /internal/orders/{orderId}/coupon': 'Aplicar un cupón a un pedido',
  'delete /internal/orders/{orderId}/coupon/remove': 'Quitar el cupón de un pedido',
  'post /internal/orders/{orderId}/coupon/remove': 'Quitar el cupón de un pedido',
  'post /internal/orders/{orderId}/delivery-code/regenerate': 'Regenerar el código de entrega (root)',
  'post /internal/orders/{orderId}/discrepancy': 'Registrar diferencia de bulto detectada en bodega',
  'post /internal/orders/{orderId}/discrepancy/settle': 'Liberar un pedido retenido tras pagar la diferencia',
  'get /internal/orders/{orderId}/evidence': 'Fotografías de retiro y entrega con URL firmada',
  'post /internal/orders/{orderId}/evidence': 'Subir las dos fotografías de un hito (retiro o entrega)',
  'patch /internal/orders/{orderId}/invoice': 'Registrar el folio SII de la factura (root)',
  'patch /internal/orders/{orderId}/status': 'Cambiar el estado de un pedido; al pasar a in_hub fija el hub donde se recibe',

  // Parámetros del planificador
  'get /internal/planner-settings': 'Parámetros vigentes del planificador',
  'patch /internal/planner-settings/{plannerSettingId}': 'Cambiar un parámetro del planificador con confirmación',
  'put /internal/planner-settings/{plannerSettingId}': 'Cambiar un parámetro del planificador con confirmación',
  'post /internal/planner-settings/{plannerSettingId}/change-request': 'Solicitar el token de confirmación y el impacto de un cambio',
  'get /internal/planner-settings/{plannerSettingId}/history': 'Bitácora de cambios de un parámetro',

  // Rutas
  'get /internal/route-assignments': 'Asignaciones de ruta, conductor y vehículo',
  'get /internal/routes/{routeId}': 'Detalle de una ruta con sus paradas',
  'post /internal/routes/{routeId}/close': 'Cerrar una ruta y registrar distancia y duración reales',
  'post /internal/routes/{routeId}/orders': 'Agregar pedidos a una ruta existente',
  'get /internal/routes/insertion-candidates': 'Rutas candidatas para insertar un pedido',
  'get /internal/routes/insertion-queue': 'Pedidos en espera de inserción en ruta',
  'post /internal/routes/plan-daily': 'Planificar las rutas del día (o simular con dryRun)',
  'post /internal/routes/plan-daily/confirm': 'Confirmar una simulación y replanificar',
  'get /internal/routes/plan-daily/simulation': 'Última simulación sin confirmar',
  'get /internal/routes/planning-quota': 'Corridas de planificación que quedan hoy',
  'get /internal/routes/settings': 'Estado de la planificación automática diaria (planner_settings)',
  'patch /internal/routes/settings': 'Activar o desactivar la planificación automática diaria (root)',

  // Usuarios
  'get /internal/users/{userId}/addresses': 'Direcciones guardadas de un usuario',
  'post /internal/users/{userId}/addresses': 'Agregar una dirección a un usuario',
  'get /internal/users/{userId}/orders': 'Pedidos de un usuario (como cliente o conductor)',
  'patch /internal/users/{userId}/status': 'Bloquear o reactivar una cuenta',
  'put /internal/users/{userId}/status': 'Bloquear o reactivar una cuenta',
  'get /users/me/addresses': 'Mis direcciones guardadas',
  'post /users/me/addresses': 'Agregar una dirección',
  'delete /users/me/addresses/{addressId}': 'Eliminar una dirección',
  'put /users/me/addresses/{addressId}': 'Editar una dirección',
  'patch /users/me/addresses/{addressId}/default': 'Marcar una dirección como predeterminada',
  'put /users/me/addresses/{addressId}/default': 'Marcar una dirección como predeterminada',
  'get /users/me/billing': 'Mis datos de facturación',
  'put /users/me/billing': 'Actualizar mis datos de facturación',
  'get /users/me/driver-profile': 'Mi ficha de conductor con vehículo asignado y hub',
  'put /users/me/driver-profile': 'Actualizar licencia y vehículo declarados',
  'get /users/me/export': 'Exportar todos mis datos personales en JSON (portabilidad, Ley N° 21.719)',
  'get /users/me/notifications': 'Mis preferencias de notificación (correo y WhatsApp)',
  'put /users/me/notifications': 'Actualizar mis preferencias de notificación',

  // Notificaciones y OTP
  'post /notifications/email/package-discrepancy': 'Avisar al remitente una diferencia de bulto',
  'post /otp/deliveries/{deliveryId}/resend': 'Reenviar un código de verificación por correo (operaciones)',
  'post /otp/send-delivery-code': 'Enviar al destinatario el código de entrega por WhatsApp (operaciones)',

  // Pagos
  'post /payments/fintoc/checkout-session': 'Crear sesión de pago Fintoc',
  'get /payments/fintoc/status': 'Estado de una sesión de pago Fintoc',
  'get /payments/mercadopago/status': 'Estado de un pago de Mercado Pago',

  // Registro público
  'post /registration/calculate-sla': 'Calcular el plazo de entrega entre dos comunas',
  'get /registration/communes': 'Comunas con cobertura (público)',
  'get /registration/tariffs': 'Tarifas vigentes por tamaño de bulto (público)',
}
