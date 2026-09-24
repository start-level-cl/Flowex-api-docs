export const info = {
  title: 'Flowex API Specification',
  version: '1.0.0',
  description:
    'Documentación OpenAPI unificada para los microservicios serverless y arquitecturas en la nube de **Flowex** (Autenticación JWT, Registro con validación de RUT Módulo 11, Motor OTP con Meta WhatsApp Cloud API, Pasarelas de Pago Mercado Pago y Fintoc Open Banking, Amazon SES y Administración VPC).',
  contact: {
    name: 'Flowex Engineering Team',
    email: 'contacto@flowex.cl',
    url: 'https://flowex.cl',
  },
  license: {
    name: 'Proprietary',
  },
}

export const servers = [
  {
    url: 'https://api.flowex.cl',
    description: 'Ambiente de Producción Flowex',
  },
  {
    url: 'https://api-dev.flowex.cl',
    description: 'Ambiente de Desarrollo / Staging',
  },
  {
    url: 'http://localhost:3000',
    description: 'Servidor Local Serverless Offline',
  },
]

export const tags = [
  {
    name: 'Auth',
    description: 'Autenticación pública, emisión y validación de tokens JWT y gestión de cookies HttpOnly seguras',
  },
  {
    name: 'Registration',
    description: 'Flujo público de onboarding y registro con validación de RUT Módulo 11 y carga de comprobantes en S3',
  },
  {
    name: 'OTP & WhatsApp',
    description: 'Generación y verificación de OTPs de 6 dígitos, integración con Meta WhatsApp Cloud API y auto-activación',
  },
  {
    name: 'Payments',
    description: 'Integración transaccional con pasarelas de pago (Mercado Pago Checkout Pro / WebPay y Fintoc A2A)',
  },
  {
    name: 'Notifications',
    description: 'Notificaciones transaccionales: correo vía Amazon SES y avisos de pedido por Meta WhatsApp. Flowex no envía SMS.',
  },
  {
    name: 'Users Administration',
    description: 'Gestión CRUD interna de usuarios en VPC (Roles: root, admin, driver, client)',
  },
  {
    name: 'Admin Overrides',
    description: 'Endpoints y eventos administrativos para activación forzada o resolución manual de registros',
  },
  {
    name: 'Coupons',
    description: 'Sistema de cupones promocionales, validación exclusiva para clientes y administración exclusiva para rol root',
  },
  {
    name: 'Orders & Dispatch',
    description: 'Gestión y consulta de órdenes de despacho con estándar unificado de paginación y filtrado por rol',
  },
  {
    name: 'Route Planning',
    description: 'Planificación, optimización y consulta operativa de rutas y paradas con paginación Importal',
  },
]

export const securitySchemes = {
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'Token JWT de corta duración enviado en encabezado Authorization: Bearer <token>',
  },
  cookieAccessAuth: {
    type: 'apiKey',
    in: 'cookie',
    name: 'access_token',
    description: 'Cookie HTTP-only que contiene el access token JWT',
  },
  cookieRefreshAuth: {
    type: 'apiKey',
    in: 'cookie',
    name: 'refresh_token',
    description: 'Cookie HTTP-only que contiene el refresh token JWT de 30 días de duración',
  },
  statusTokenAuth: {
    type: 'apiKey',
    in: 'header',
    name: 'X-Status-Token',
    description: 'Token firmado HMAC-SHA256 para consultar estados de onboarding en proceso',
  },
}

export const schemas = {
  PaginationMeta: {
    type: 'object',
    required: ['total', 'page', 'limit', 'last_page'],
    description: 'Metadatos estándar de paginación Importal',
    properties: {
      total: { type: 'integer', example: 120, description: 'Total general de registros disponibles' },
      page: { type: 'integer', example: 1, description: 'Número de página actual (1-indexed)' },
      limit: { type: 'integer', example: 20, description: 'Cantidad máxima de registros por página' },
      last_page: { type: 'integer', example: 6, description: 'Última página disponible calculada como ceil(total / limit)' },
    },
  },
  InternalUserSummary: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'usr_1771344000000' },
      userId: { type: 'string', example: 'usr_1771344000000' },
      name: { type: 'string', example: 'Carlos Chofer' },
      email: { type: 'string', example: 'carlos.chofer@flowex.cl' },
      phone: { type: 'string', example: '+56987654321' },
      role: { $ref: '#/components/schemas/UserRole' },
      rut: { type: 'string', example: '12.345.678-5' },
      isActive: { type: 'boolean', example: true },
      isVerified: { type: 'boolean', example: true },
      totalOrdersCount: { type: 'integer', example: 12 },
      deliveredOrdersCount: { type: 'integer', example: 10 },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  OrderSummary: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'ord_1771344928000' },
      trackingNumber: { type: 'string', example: 'FLX-2026-8492' },
      senderName: { type: 'string', example: 'Juan Pérez Silva' },
      senderPhone: { type: 'string', example: '+56991234567' },
      senderEmail: { type: 'string', example: 'juan.cliente@gmail.com' },
      senderAddress: { type: 'string', example: 'Av. Providencia 1234' },
      senderCommune: { type: 'string', example: 'Providencia' },
      recipientName: { type: 'string', example: 'María López González' },
      recipientPhone: { type: 'string', example: '+56987654321' },
      recipientEmail: { type: 'string', example: 'maria.destinatario@gmail.com' },
      recipientAddress: { type: 'string', example: 'Av. Las Condes 10200' },
      recipientCommune: { type: 'string', example: 'Las Condes' },
      status: { $ref: '#/components/schemas/OrderStatus' },
      isPaid: { type: 'boolean', example: true },
      packagesCount: { type: 'integer', example: 1 },
      packageType: { type: 'string', example: 'caja_mediana' },
      weightKg: { type: 'number', example: 2.5 },
      totalCost: { type: 'number', example: 8900 },
      deliveryCode: { type: 'string', description: 'PIN confidencial (redactado para clientes no propietarios)', example: '4920' },
      assignedDriverId: { type: 'string', example: 'usr_drv_201' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  RouteSummary: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'rot_1771344928000' },
      code: { type: 'string', example: 'RUT-ENT-20260921-001' },
      type: { type: 'string', enum: ['pickup', 'delivery', 'transfer'], example: 'delivery' },
      status: { type: 'string', example: 'planned' },
      assignedDriverId: { type: 'string', example: 'usr_drv_201' },
      driverName: { type: 'string', example: 'Juan Pérez' },
      vehiclePlate: { type: 'string', example: 'KJL-942' },
      totalOrders: { type: 'integer', example: 18 },
      totalPackages: { type: 'integer', example: 22 },
      totalWeightKg: { type: 'number', example: 45.5 },
      estimatedDistanceKm: { type: 'number', example: 34.2 },
      estimatedDuration: { type: 'string', example: '2h 15m' },
      estimateSource: { type: 'string', enum: ['google', 'fallback'], example: 'google' },
      orders: {
        type: 'array',
        items: { $ref: '#/components/schemas/OrderSummary' },
      },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  OtpDeliveryItem: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'del_1771344928000' },
      identifier: { type: 'string', description: 'Identificador o contacto con enmascaramiento PII (Ley N° 21.719)', example: 'j***@flowex.cl' },
      email: { type: 'string', description: 'Correo electrónico enmascarado', example: 'j***@flowex.cl' },
      phone: { type: 'string', description: 'Teléfono móvil enmascarado', example: '+569****4321' },
      channel: {
        type: 'string',
        enum: ['email', 'whatsapp'],
        description: 'Los códigos nuevos salen solo por correo; `whatsapp` solo aparece en envíos antiguos.',
        example: 'email',
      },
      status: { type: 'string', enum: ['pendiente', 'entregado', 'fallido', 'usado', 'expirado'], example: 'entregado' },
      statusLabel: { type: 'string', example: 'Entregado por correo' },
      providerMessageId: { type: 'string', nullable: true, example: null },
      lastError: { type: 'string', nullable: true, example: null },
      sendCount: { type: 'integer', example: 1 },
      verifyAttempts: { type: 'integer', example: 0 },
      expiresAt: { type: 'string', format: 'date-time' },
      lastSentAt: { type: 'string', format: 'date-time' },
      consumedAt: { type: 'string', format: 'date-time', nullable: true },
      resentBy: { type: 'string', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
      vigente: { type: 'boolean', example: true },
    },
  },
  UserRole: {
    type: 'string',
    enum: ['root', 'admin', 'driver', 'client'],
    description: 'Rol asignado al usuario dentro de Flowex',
  },
  OrderStatus: {
    type: 'string',
    enum: [
      'pending',
      'paid',
      'pickup_assigned',
      'picked_up',
      'in_hub',
      'transit',
      'delivered',
      'incident',
    ],
    description: 'Ciclo de vida del estado del envío',
  },
  PaymentMethod: {
    type: 'string',
    enum: ['mercadopago', 'fintoc', 'webpay', 'credit_card', 'transfer'],
    description: 'Pasarela o método de pago utilizado',
  },
  HousingType: {
    type: 'string',
    enum: ['casa', 'departamento', 'oficina'],
    description: 'Tipo de domicilio del cliente',
  },
  TransporteOption: {
    type: 'string',
    enum: ['maritimo', 'aereo'],
    description: 'Modalidad de transporte',
  },
  SavedAddress: {
    type: 'object',
    required: ['id', 'alias', 'calle', 'numero', 'ciudad', 'region', 'isDefault'],
    description: 'Estructura de dirección guardada en la libreta de direcciones frecuentes del usuario',
    properties: {
      id: { type: 'string', example: 'addr_1771344928000' },
      alias: { type: 'string', example: 'Bodega principal' },
      calle: { type: 'string', example: 'Av. Américo Vespucio' },
      numero: { type: 'string', example: '1500' },
      departamento: { type: 'string', example: 'Módulo B-12' },
      ciudad: { type: 'string', example: 'Pudahuel' },
      region: { type: 'string', example: 'Región Metropolitana' },
      codigoPostal: { type: 'string', example: '8700000' },
      referencias: { type: 'string', example: 'Portón azul, acceso por calle lateral' },
      isDefault: { type: 'boolean', example: true },
    },
  },
  BillingInfo: {
    type: 'object',
    required: ['razonSocial', 'rutEmpresa', 'giro', 'direccion', 'correo'],
    description: 'Información tributaria para la emisión automática de Facturas Electrónicas de Transporte (DTE)',
    properties: {
      razonSocial: { type: 'string', example: 'Logística y Distribución SpA' },
      rutEmpresa: { type: 'string', description: 'RUT de empresa validado mediante Módulo 11', example: '76.123.456-7' },
      giro: { type: 'string', example: 'Transporte de Carga por Carretera' },
      direccion: { type: 'string', example: 'Av. Providencia 1234, Oficina 502, Providencia' },
      correo: { type: 'string', format: 'email', example: 'facturacion@empresa.cl' },
    },
  },
  NotificationPreferences: {
    type: 'object',
    required: ['emailSes', 'whatsappMeta'],
    description: 'Preferencias de notificaciones multicanal para seguimiento de envíos y alertas operativas',
    properties: {
      emailSes: { type: 'boolean', description: 'Correos transaccionales vía Amazon SES (resumen de órdenes, facturas PDF y cambios de estado)', example: true },
      whatsappMeta: { type: 'boolean', description: 'Avisos del pedido por Meta WhatsApp Business Cloud API (no códigos de verificación)', example: true },
    },
  },
  LegalConsent: {
    type: 'object',
    required: ['accepted', 'policyVersion', 'timestamp'],
    description: 'Registro de consentimiento informado y tratamiento de datos personales conforme a la Ley N° 21.719 de Chile',
    properties: {
      accepted: { type: 'boolean', description: 'Estado de aceptación del tratamiento de datos personales', example: true },
      policyVersion: { type: 'string', example: 'v2.4 (Ley N° 21.719)' },
      timestamp: { type: 'string', description: 'Fecha y hora exacta de aceptación o revocación', example: '2026-08-24 10:30:00' },
      ipAddress: { type: 'string', description: 'Dirección IP registrada al momento del consentimiento', example: '190.160.45.12' },
    },
  },
  ConsentPurpose: {
    type: 'object',
    required: ['purpose', 'granted', 'essential'],
    description: 'Finalidad específica de tratamiento de datos personales bajo la Ley N° 21.719',
    properties: {
      purpose: { type: 'string', example: 'terms_and_conditions' },
      name: { type: 'string', example: 'Términos y Condiciones del Servicio' },
      description: { type: 'string', example: 'Aceptación obligatoria para la prestación del servicio logístico' },
      granted: { type: 'boolean', example: true },
      essential: { type: 'boolean', example: true },
    },
  },
  UserConsent: {
    type: 'object',
    required: ['userId', 'appId', 'status', 'policyVersion', 'purposes'],
    description: 'Estructura canónica de consentimiento y finalidades autorizadas para un usuario',
    properties: {
      userId: { type: 'string', example: 'usr_client_1771344000' },
      appId: { type: 'string', example: 'flowex' },
      status: { type: 'string', enum: ['GRANTED', 'REVOKED', 'PARTIALLY_REVOKED'], example: 'GRANTED' },
      policyVersion: { type: 'string', example: 'v2.4' },
      channel: { type: 'string', example: 'web_registration' },
      purposes: {
        type: 'array',
        items: { $ref: '#/components/schemas/ConsentPurpose' },
      },
      grantedAt: { type: 'string', format: 'date-time', example: '2026-08-24T10:30:00.000Z' },
      updatedAt: { type: 'string', format: 'date-time', example: '2026-08-24T10:30:00.000Z' },
      legalNotice: { type: 'string', example: 'Tratamiento de datos personales conforme a la Ley N° 21.719 sobre Protección de Datos Personales en Chile.' },
      userIsActive: { type: 'boolean', example: true },
      notice: { type: 'string', example: 'El consentimiento se mantiene vigente bajo custodia legal (Ley N° 21.719)' },
      legalCustody: { type: 'boolean', example: true },
    },
  },
  RevokeConsentRequest: {
    type: 'object',
    required: ['purposes'],
    description: 'Solicitud de revocación o derecho de oposición sobre finalidades no esenciales',
    properties: {
      purposes: {
        type: 'array',
        items: { type: 'string' },
        example: ['sms_whatsapp_alerts'],
      },
      reason: { type: 'string', example: 'El titular solicita dejar de recibir alertas por WhatsApp' },
    },
  },
  UserProfile: {
    type: 'object',
    description: 'Modelo estandarizado de perfil de usuario en Flowex para todos los roles (root, admin, driver, client, customer)',
    properties: {
      id: { type: 'string', example: 'usr_flowex_01' },
      name: { type: 'string', example: 'Andrea Morales González' },
      email: { type: 'string', format: 'email', example: 'andrea.morales@flowex.cl' },
      phone: { type: 'string', example: '+56 9 8765 4321' },
      role: { $ref: '#/components/schemas/UserRole' },
      roleTitle: { type: 'string', example: 'Cliente Corporativo' },
      avatar: { type: 'string', format: 'uri', example: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250' },
      department: { type: 'string', example: 'Operaciones Comerciales' },
      rut: { type: 'string', description: 'RUT personal verificado con algoritmo Módulo 11', example: '18.765.432-1' },
      isVerified: { type: 'boolean', example: true },
      addresses: {
        type: 'array',
        items: { $ref: '#/components/schemas/SavedAddress' },
      },
      billingInfo: { $ref: '#/components/schemas/BillingInfo' },
      notificationPreferences: { $ref: '#/components/schemas/NotificationPreferences' },
      legalConsent: { $ref: '#/components/schemas/LegalConsent' },
    },
  },
  LoginRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        example: 'usuario@flowex.cl',
      },
      password: {
        type: 'string',
        format: 'password',
        example: 'Flowex2026!Pass',
      },
      role: {
        $ref: '#/components/schemas/UserRole',
        example: 'client',
      },
    },
  },
  LoginResponse: {
    type: 'object',
    properties: {
      accessToken: {
        type: 'string',
        description: 'Token JWT firmado válido por 1 hora',
      },
      refreshToken: {
        type: 'string',
        description: 'Token JWT para renovación válido por 30 días',
      },
      user: {
        type: 'object',
        properties: {
          sub: { type: 'string', example: 'usr_flowex_123' },
          email: { type: 'string', example: 'usuario@flowex.cl' },
          name: { type: 'string', example: 'Usuario FlowEx' },
          role: { $ref: '#/components/schemas/UserRole' },
        },
      },
    },
  },
  RefreshTokenRequest: {
    type: 'object',
    properties: {
      refreshToken: {
        type: 'string',
        description: 'Refresh token opcional en cuerpo si no se envía en Cookie',
      },
    },
  },
  RefreshTokenResponse: {
    type: 'object',
    properties: {
      accessToken: {
        type: 'string',
        description: 'Nuevo access token generado',
      },
    },
  },
  ValidateResponse: {
    type: 'object',
    properties: {
      valid: { type: 'boolean', example: true },
      user: {
        type: 'object',
        properties: {
          sub: { type: 'string', example: 'usr_flowex_123' },
          email: { type: 'string', example: 'usuario@flowex.cl' },
          role: { $ref: '#/components/schemas/UserRole' },
          exp: { type: 'integer', example: 1771344000 },
          iss: { type: 'string', example: 'flowex-auth' },
        },
      },
    },
  },
  ChangePasswordRequest: {
    type: 'object',
    required: ['token', 'password', 'newPassword'],
    properties: {
      token: { type: 'string', description: 'Token de autorización para cambio de clave' },
      password: { type: 'string', format: 'password', description: 'Contraseña actual' },
      newPassword: { type: 'string', format: 'password', description: 'Nueva contraseña segura' },
    },
  },
  InternalUserCreateRequest: {
    type: 'object',
    required: ['name', 'email', 'password', 'phone', 'role', 'rut'],
    properties: {
      name: { type: 'string', example: 'Carlos Chofer' },
      email: { type: 'string', format: 'email', example: 'carlos.chofer@flowex.cl' },
      password: { type: 'string', format: 'password', example: 'ChoferPass2026!' },
      phone: { type: 'string', example: '+56987654321' },
      role: { $ref: '#/components/schemas/UserRole' },
      rut: { type: 'string', example: '12345678-5' },
    },
  },
  InternalUserUpdateRequest: {
    type: 'object',
    properties: {
      name: { type: 'string', example: 'Carlos Chofer Actualizado' },
      email: { type: 'string', format: 'email', example: 'carlos.chofer@flowex.cl' },
      phone: { type: 'string', example: '+56987654321' },
      role: { $ref: '#/components/schemas/UserRole' },
      isActive: { type: 'boolean', example: true },
    },
  },
  InternalUserResponse: {
    type: 'object',
    properties: {
      userId: { type: 'string', example: 'usr_1771344000000' },
      name: { type: 'string', example: 'Carlos Chofer' },
      email: { type: 'string', example: 'carlos.chofer@flowex.cl' },
      phone: { type: 'string', example: '+56987654321' },
      role: { $ref: '#/components/schemas/UserRole' },
      rut: { type: 'string', example: '12345678-5' },
      isActive: { type: 'boolean', example: true },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  RegistrationClientCreate: {
    type: 'object',
    required: ['email', 'name', 'rut', 'phone', 'password', 'consentimiento'],
    description: 'Contrato de registro para cliente final. No requiere direcciones fijas (calle, número, comuna o región) al registrarse, ya que los domicilios de retiro y entrega se suministran dinámicamente en cada envío mediante POST /orders.',
    properties: {
      email: { type: 'string', format: 'email', example: 'cliente.nuevo@gmail.com' },
      name: { type: 'string', example: 'Andrea Morales' },
      rut: { type: 'string', description: 'RUT chileno validado por Módulo 11', example: '19876543-2' },
      phone: { type: 'string', description: 'Teléfono formato E.164 (+569...)', example: '+56991234567' },
      password: { type: 'string', format: 'password', description: 'Contraseña segura (mínimo 8 caracteres, mayúscula, minúscula, número y símbolo)' },
      consentimiento: { type: 'boolean', description: 'Consentimiento informado obligatorio', example: true },
      transportType: {
        type: 'array',
        items: { $ref: '#/components/schemas/TransporteOption' },
        example: ['maritimo', 'aereo'],
      },
      facturaRequired: { type: 'boolean', example: false },
      razonSocial: { type: 'string', example: 'Morales Logística SpA' },
      rutEmpresa: { type: 'string', example: '76123456-7' },
      giro: { type: 'string', example: 'Servicios de Distribución' },
      housingType: {
        $ref: '#/components/schemas/HousingType',
        description: 'Campo opcional / obsoleto en registro. Las direcciones fijas no son requeridas ya que origen y destino se configuran dinámicamente en cada orden (POST /orders).'
      },
      streetAndNumber: {
        type: 'string',
        description: 'Campo opcional / obsoleto en registro. Las direcciones de retiro y despacho se ingresan dinámicamente por orden en POST /orders.',
        example: 'Av. Providencia 1234'
      },
      deptOrOffice: { type: 'string', description: 'Opcional: Departamento u oficina', example: 'Oficina 502' },
      region: { type: 'string', description: 'Campo opcional / obsoleto en registro. Se especifica en POST /orders por envío.', example: 'Región Metropolitana' },
      comuna: { type: 'string', description: 'Campo opcional / obsoleto en registro. Se especifica en POST /orders por envío.', example: 'Providencia' },
      reference: { type: 'string', description: 'Opcional: Referencia', example: 'Frente a estación Metro Manuel Montt' },
      agency: { type: 'string', description: 'Opcional: Sucursal o agencia preferida', example: 'Sucursal Central' },
    },
  },
  RegistrationInviteCreate: {
    type: 'object',
    required: ['inviteToken', 'email', 'name', 'rut', 'phone', 'password', 'consentimiento'],
    description: 'Contrato de registro mediante token de invitación para administradores o conductores.',
    properties: {
      inviteToken: { type: 'string', description: 'Token de invitación (INV-ADM-... para admin o INV-DRV-... para driver)', example: 'INV-DRV-2026-XYZ' },
      email: { type: 'string', format: 'email', example: 'carlos.chofer@gmail.com' },
      name: { type: 'string', example: 'Carlos Chofer González' },
      rut: { type: 'string', description: 'RUT chileno validado por Módulo 11', example: '15987654-3' },
      phone: { type: 'string', description: 'Teléfono formato E.164 (+569...)', example: '+56987654321' },
      password: { type: 'string', format: 'password', description: 'Contraseña segura' },
      role: { type: 'string', enum: ['admin', 'driver'], example: 'driver' },
      consentimiento: { type: 'boolean', description: 'Consentimiento informado obligatorio', example: true },
      licenseNumber: { type: 'string', description: 'Requerido para conductores: Número de licencia de conducir', example: 'LIC-15987654-CL' },
      vehicleType: { type: 'string', description: 'Requerido para conductores: Tipo de vehículo', example: 'Furgón' },
      vehiclePlate: { type: 'string', description: 'Requerido para conductores: Patente del vehículo', example: 'LJ-89-21' },
      vehicleBrand: { type: 'string', example: 'Peugeot' },
      vehicleModel: { type: 'string', example: 'Partner' },
      vehicleYear: { type: 'integer', example: 2023 },
      comprobante: { type: 'string', description: 'Comprobante o licencia de conducir en Base64' },
      comprobanteFileName: { type: 'string', example: 'licencia_conducir.jpg' },
      comprobanteContentType: { type: 'string', example: 'image/jpeg' },
    },
  },
  RegistrationRequestCreate: {
    type: 'object',
    required: ['email', 'name', 'rut', 'phone', 'password', 'consentimiento'],
    description: 'Contrato de registro general para clientes o conductores. Las direcciones fijas (streetAndNumber, housingType, region, comuna) no son obligatorias en el registro; los puntos de retiro y entrega se suministran dinámicamente por envío en POST /orders.',
    properties: {
      email: { type: 'string', format: 'email', example: 'cliente.nuevo@gmail.com' },
      name: { type: 'string', example: 'Andrea Morales' },
      rut: { type: 'string', description: 'RUT chileno validado por Módulo 11', example: '19876543-2' },
      phone: { type: 'string', description: 'Teléfono formato E.164 (+569...)', example: '+56991234567' },
      password: { type: 'string', format: 'password', description: 'Contraseña segura (mínimo 8 caracteres, mayúscula, minúscula, número y símbolo)' },
      role: { $ref: '#/components/schemas/UserRole', default: 'client' },
      consentimiento: { type: 'boolean', description: 'Consentimiento informado obligatorio', example: true },
      inviteToken: { type: 'string', description: 'Token de invitación obligatorio para roles driver o admin', example: 'INV-DRV-2026-XYZ' },
      housingType: {
        $ref: '#/components/schemas/HousingType',
        description: 'Campo opcional / no requerido en registro. Las direcciones de origen y destino se configuran dinámicamente en POST /orders.'
      },
      streetAndNumber: {
        type: 'string',
        description: 'Campo opcional / no requerido en registro. Las direcciones de retiro y entrega se ingresan dinámicamente por orden en POST /orders.',
        example: 'Av. Providencia 1234'
      },
      deptOrOffice: { type: 'string', description: 'Opcional: Departamento u oficina', example: 'Oficina 502' },
      region: { type: 'string', description: 'Campo opcional / no requerido en registro. Se especifica dinámicamente en POST /orders.', example: 'Región Metropolitana' },
      comuna: { type: 'string', description: 'Campo opcional / no requerido en registro. Se especifica dinámicamente en POST /orders.', example: 'Providencia' },
      reference: { type: 'string', description: 'Opcional: Referencia', example: 'Frente a estación Metro Manuel Montt' },
      agency: { type: 'string', description: 'Opcional: Sucursal o agencia preferida', example: 'Sucursal Central' },
      transportType: {
        type: 'array',
        items: { $ref: '#/components/schemas/TransporteOption' },
        example: ['maritimo', 'aereo'],
      },
      facturaRequired: { type: 'boolean', example: false },
      razonSocial: { type: 'string', example: 'Morales Logística SpA' },
      rutEmpresa: { type: 'string', example: '76123456-7' },
      giro: { type: 'string', example: 'Servicios de Distribución' },
      licenseNumber: { type: 'string', description: 'Para rol driver: Número de licencia de conducir' },
      vehicleType: { type: 'string', description: 'Para rol driver: Tipo de vehículo' },
      vehiclePlate: { type: 'string', description: 'Para rol driver: Patente del vehículo' },
      comprobante: { type: 'string', description: 'Para rol driver: Comprobante o licencia de conducir en Base64 o Data URL (no requerido para clientes)' },
      comprobanteFileName: { type: 'string', example: 'licencia_conducir.pdf' },
      comprobanteContentType: { type: 'string', example: 'application/pdf' },
    },
  },
  RegistrationRequestStatusResponse: {
    type: 'object',
    properties: {
      exists: { type: 'boolean', example: true },
      email: { type: 'string', example: 'cliente.nuevo@gmail.com' },
      status: { type: 'string', enum: ['PENDING_VERIFICATION', 'APPROVED', 'REJECTED'], example: 'PENDING_VERIFICATION' },
      is_verified: { type: 'boolean', example: false },
      is_email_verified: { type: 'boolean', example: false },
      is_phone_verified: { type: 'boolean', example: false },
      requires_otp: { type: 'boolean', example: true },
    },
  },
  UpdateContactRequest: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email', example: 'nuevo.correo@gmail.com' },
      phone: { type: 'string', example: '+56999887766' },
    },
  },
  ReuploadComprobanteRequest: {
    type: 'object',
    required: ['comprobante'],
    properties: {
      comprobante: { type: 'string', description: 'Archivo codificado en Base64 o Data URL' },
      comprobanteFileName: { type: 'string', example: 'nuevo_comprobante.pdf' },
      comprobanteContentType: { type: 'string', example: 'application/pdf' },
    },
  },
  SendOtpRequest: {
    type: 'object',
    required: ['email'],
    description: 'El código de verificación tiene un único canal: el correo. Un teléfono o un `channel` distinto se ignoran.',
    properties: {
      email: { type: 'string', format: 'email', example: 'cliente.nuevo@gmail.com' },
      identifier: { type: 'string', description: 'Alias de `email`.', example: 'cliente.nuevo@gmail.com' },
      channel: { type: 'string', enum: ['email'], example: 'email' },
    },
  },
  SendOtpResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Código enviado. Vence en 10 minutos.' },
      deliveryId: { type: 'string', example: 'otp_1771344928000' },
      email: { type: 'string', example: 'cliente.nuevo@gmail.com' },
      channel: { type: 'string', enum: ['email'], example: 'email' },
      delivered: { type: 'boolean', example: true },
      devOtpCode: { type: 'string', description: 'Solo fuera de producción y con activación explícita.', example: '654321' },
    },
  },
  VerifyOtpRequest: {
    type: 'object',
    required: ['code'],
    properties: {
      target: { type: 'string', example: 'cliente.nuevo@gmail.com' },
      email: { type: 'string', example: 'cliente.nuevo@gmail.com' },
      code: { type: 'string', description: 'Código OTP de 6 dígitos numéricos', example: '482910' },
    },
  },
  VerifyOtpResponse: {
    type: 'object',
    properties: {
      message: { type: 'string', example: 'Información validada por OTP. Registro aprobado y cuenta activada exitosamente.' },
      status: { type: 'string', example: 'APPROVED' },
      account: {
        type: 'object',
        properties: {
          email: { type: 'string', example: 'cliente.nuevo@gmail.com' },
          status: { type: 'string', example: 'APPROVED' },
          isActive: { type: 'boolean', example: true },
          is_verified: { type: 'boolean', example: true },
          activatedAt: { type: 'string', format: 'date-time' },
        },
      },
      statusToken: { type: 'string', description: 'Token de acceso seguro al perfil de onboarding' },
    },
  },
  WhatsAppNotificationRequest: {
    type: 'object',
    required: ['phone', 'notificationType'],
    properties: {
      phone: { type: 'string', example: '+56991234567' },
      notificationType: {
        type: 'string',
        enum: ['ORDER_CREATED', 'ORDER_IN_TRANSIT', 'ORDER_DELIVERED', 'DELIVERY_INCIDENT'],
        example: 'ORDER_CREATED',
      },
      parameters: {
        type: 'array',
        items: { type: 'string' },
        example: ['FLX-2026-8492', 'Hub Pudahuel'],
      },
    },
  },
  AdminOverrideActivateRequest: {
    type: 'object',
    properties: {
      reviewedBy: { type: 'string', example: 'admin_root' },
      role: { $ref: '#/components/schemas/UserRole', example: 'client' },
      notes: { type: 'string', example: 'Aprobación manual autorizada por jefatura de operaciones' },
    },
  },
  AdminOverrideActivateResponse: {
    type: 'object',
    properties: {
      message: { type: 'string', example: 'Registro forzado/activado manualmente por administrador' },
      email: { type: 'string', example: 'cliente.nuevo@gmail.com' },
      reviewedBy: { type: 'string', example: 'admin_root' },
      assignedRole: { $ref: '#/components/schemas/UserRole' },
      status: { type: 'string', example: 'APPROVED' },
    },
  },
  MercadoPagoPreferenceRequest: {
    type: 'object',
    required: ['orderId', 'amount', 'payerEmail'],
    properties: {
      orderId: { type: 'string', example: 'ord_1771344928' },
      trackingNumber: { type: 'string', example: 'FLX-2026-8492' },
      amount: { type: 'number', example: 14500 },
      payerEmail: { type: 'string', format: 'email', example: 'cliente@gmail.com' },
      payerName: { type: 'string', example: 'Juan Pérez' },
    },
  },
  MercadoPagoPreferenceResponse: {
    type: 'object',
    properties: {
      provider: { type: 'string', example: 'mercadopago' },
      preferenceId: { type: 'string', example: 'pref_mp_1771344928000' },
      initPoint: { type: 'string', example: 'https://www.mercadopago.cl/checkout/v1/redirect?pref_id=pref_mp_1771344928000' },
      sandboxInitPoint: { type: 'string', example: 'https://sandbox.mercadopago.cl/checkout/v1/redirect?pref_id=pref_mp_1771344928000' },
      payload: { type: 'object' },
    },
  },
  WebhookMercadoPagoResponse: {
    type: 'object',
    properties: {
      received: { type: 'boolean', example: true },
      provider: { type: 'string', example: 'mercadopago' },
      status: { type: 'string', example: 'approved' },
      paymentId: { type: 'string', example: '1234567890' },
      orderStatus: { type: 'string', example: 'paid' },
      transactionId: { type: 'string', example: 'TX-MP-1234567890' },
    },
  },
  WebhookFintocResponse: {
    type: 'object',
    properties: {
      received: { type: 'boolean', example: true },
      provider: { type: 'string', example: 'fintoc' },
      status: { type: 'string', example: 'succeeded' },
      orderId: { type: 'string', example: 'ord_1771344928' },
      orderStatus: { type: 'string', example: 'paid' },
      transactionId: { type: 'string', example: 'TX-FINTOC-pi_fintoc_123' },
    },
  },
  EmailVerifyAccountRequest: {
    type: 'object',
    required: ['email', 'code'],
    properties: {
      email: { type: 'string', format: 'email', example: 'cliente@flowex.cl' },
      code: { type: 'string', example: '839201' },
      name: { type: 'string', example: 'Rodrigo Fuentes' },
    },
  },
  EmailWelcomeRequest: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email', example: 'cliente@flowex.cl' },
      name: { type: 'string', example: 'Rodrigo Fuentes' },
      role: { $ref: '#/components/schemas/UserRole' },
    },
  },
  EmailOrderCreatedRequest: {
    type: 'object',
    required: ['email', 'trackingNumber'],
    properties: {
      email: { type: 'string', format: 'email', example: 'cliente@flowex.cl' },
      recipientName: { type: 'string', example: 'María López' },
      trackingNumber: { type: 'string', example: 'FLX-2026-8492' },
      deliveryCode: { type: 'string', description: 'PIN de 4 dígitos para entrega al conductor', example: '4920' },
      totalCost: { type: 'number', example: 8900 },
    },
  },
  EmailOrderStatusUpdateRequest: {
    type: 'object',
    required: ['email', 'trackingNumber', 'newStatus'],
    properties: {
      email: { type: 'string', format: 'email', example: 'cliente@flowex.cl' },
      recipientName: { type: 'string', example: 'María López' },
      trackingNumber: { type: 'string', example: 'FLX-2026-8492' },
      newStatus: { $ref: '#/components/schemas/OrderStatus' },
      details: { type: 'string', example: 'El paquete se encuentra en el vehículo de reparto rumbo a su domicilio' },
    },
  },
  OrderCreateRequest: {
    type: 'object',
    required: [
      'senderName',
      'senderPhone',
      'senderAddress',
      'senderCommune',
      'recipientName',
      'recipientPhone',
      'recipientAddress',
      'recipientCommune',
      'packagesCount',
      'packageType',
      'weightKg',
      'declaredValue',
      'shippingType',
    ],
    description: 'Contrato para creación dinámica de órdenes y envíos (POST /orders). Las direcciones de recolección/origen y entrega/destino se configuran individualmente por pedido en este endpoint, eliminando la necesidad de direcciones fijas en el registro de cliente.',
    properties: {
      senderName: { type: 'string', example: 'Juan Pérez Silva' },
      senderPhone: { type: 'string', example: '+56991234567' },
      senderEmail: { type: 'string', format: 'email', example: 'juan.cliente@gmail.com' },
      senderAddress: { type: 'string', description: 'Dirección física dinámica de retiro (calle, número)', example: 'Av. Providencia 1234' },
      senderDeptOrOffice: { type: 'string', example: 'Oficina 502' },
      senderCommune: { type: 'string', description: 'Comuna de recolección', example: 'Providencia' },
      senderRegion: { type: 'string', description: 'Región de recolección', example: 'Región Metropolitana' },
      senderReference: { type: 'string', example: 'Frente a estación Metro Manuel Montt' },
      recipientName: { type: 'string', example: 'María López González' },
      recipientPhone: { type: 'string', example: '+56987654321' },
      recipientEmail: { type: 'string', format: 'email', example: 'maria.destinatario@gmail.com' },
      recipientAddress: { type: 'string', description: 'Dirección física dinámica de entrega (calle, número)', example: 'Av. Las Condes 10200' },
      recipientDeptOrOffice: { type: 'string', example: 'Depto 401' },
      recipientCommune: { type: 'string', description: 'Comuna de entrega', example: 'Las Condes' },
      recipientRegion: { type: 'string', description: 'Región de entrega', example: 'Región Metropolitana' },
      recipientReference: { type: 'string', example: 'Condominio Los Alerces, Torre B' },
      packagesCount: { type: 'integer', example: 1 },
      packageType: { type: 'string', example: 'caja_mediana' },
      weightKg: { type: 'number', example: 2.5 },
      declaredValue: { type: 'number', example: 45000 },
      shippingType: { type: 'string', enum: ['normal', 'express', 'same_day'], example: 'express' },
      enteredBy: { type: 'string', enum: ['cliente', 'vendedor'], default: 'cliente' },
    },
  },
  CouponAudience: {
    type: 'string',
    enum: ['first_time_only', 'everyone', 'exclusive'],
    description: 'Audiencia objetivo para aplicación del cupón (first_time_only: solo primera compra, everyone: público general, exclusive: creadores/campañas especiales)',
  },
  Coupon: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: 'd3b07384-d113-4f9c-8a21-9988aa11bb22' },
      code: { type: 'string', example: 'INSPY15' },
      description: { type: 'string', nullable: true, example: 'Descuento lanzamiento campaña INSPY TECH' },
      discount_percentage: { type: 'number', minimum: 0.01, maximum: 15.00, example: 15.00 },
      max_discount_amount: { type: 'number', minimum: 0, maximum: 30000.00, example: 30000.00 },
      audience: { $ref: '#/components/schemas/CouponAudience' },
      usage_limit_total: { type: 'integer', nullable: true, example: 100 },
      usage_limit_per_user: { type: 'integer', example: 1 },
      current_uses_count: { type: 'integer', example: 12 },
      starts_at: { type: 'string', format: 'date-time', nullable: true },
      expires_at: { type: 'string', format: 'date-time', nullable: true },
      is_active: { type: 'boolean', example: true },
      creator_attribution: { type: 'string', nullable: true, example: 'Eduardo Dassori' },
      created_by: { type: 'string', nullable: true },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  },
  CouponValidationRequest: {
    type: 'object',
    required: ['code', 'subtotal'],
    properties: {
      code: { type: 'string', example: 'INSPY15' },
      subtotal: { type: 'number', minimum: 0, example: 25000 },
    },
  },
  CouponValidationResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      coupon: {
        type: 'object',
        properties: {
          valid: { type: 'boolean', example: true },
          couponId: { type: 'string', format: 'uuid' },
          code: { type: 'string', example: 'INSPY15' },
          discountPercentage: { type: 'number', example: 15.00 },
          maxDiscountAmount: { type: 'number', example: 30000.00 },
          originalAmount: { type: 'number', example: 25000 },
          discountAmount: { type: 'number', example: 3750 },
          finalAmount: { type: 'number', example: 21250 },
          audience: { $ref: '#/components/schemas/CouponAudience' },
        },
      },
    },
  },
  CouponReleaseRequest: {
    type: 'object',
    required: ['orderId'],
    properties: {
      orderId: { type: 'string', example: 'ord_123456789' },
      reason: { type: 'string', example: 'USER_CANCELLED_CHECKOUT' },
    },
  },
  CouponCreateRequest: {
    type: 'object',
    required: ['code', 'discountPercentage'],
    properties: {
      code: { type: 'string', example: 'PROMO15' },
      description: { type: 'string', example: 'Cupón especial de bienvenida' },
      discountPercentage: { type: 'number', minimum: 0.01, maximum: 15.00, example: 15.00 },
      maxDiscountAmount: { type: 'number', minimum: 0, maximum: 30000.00, example: 30000.00 },
      targetAudience: { $ref: '#/components/schemas/CouponAudience' },
      validityDays: { type: 'integer', minimum: 1, example: 30 },
      maxTotalUses: { type: 'integer', minimum: 1, example: 50 },
      creatorAttribution: { type: 'string', example: 'Eduardo Dassori' },
    },
  },
  CouponBatchCreateRequest: {
    type: 'object',
    required: ['prefix', 'quantity', 'discountPercentage'],
    properties: {
      prefix: { type: 'string', example: 'INSPY' },
      quantity: { type: 'integer', minimum: 1, maximum: 500, example: 50 },
      discountPercentage: { type: 'number', minimum: 0.01, maximum: 15.00, example: 15.00 },
      maxDiscountAmount: { type: 'number', minimum: 0, maximum: 30000.00, example: 30000.00 },
      targetAudience: { $ref: '#/components/schemas/CouponAudience' },
      validityDays: { type: 'integer', minimum: 1, example: 30 },
      creatorAttribution: { type: 'string', example: 'INSPY TECH SpA' },
    },
  },
  CouponImportCsvRequest: {
    type: 'object',
    required: ['coupons', 'discountPercentage'],
    properties: {
      coupons: {
        type: 'array',
        items: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string', example: 'CREATOR001' },
            creatorAttribution: { type: 'string', example: 'Creador Influencer' },
            maxTotalUses: { type: 'integer', example: 100 },
          },
        },
      },
      discountPercentage: { type: 'number', minimum: 0.01, maximum: 15.00, example: 15.00 },
      maxDiscountAmount: { type: 'number', minimum: 0, maximum: 30000.00, example: 30000.00 },
      targetAudience: { $ref: '#/components/schemas/CouponAudience' },
      validityDays: { type: 'integer', minimum: 1, example: 30 },
    },
  },
  CouponUpdateRequest: {
    type: 'object',
    properties: {
      isActive: { type: 'boolean', example: false },
      validityDaysExtension: { type: 'integer', minimum: 1, example: 15 },
      maxTotalUses: { type: 'integer', minimum: 1, example: 200 },
    },
  },
  StandardSuccessResponse: {
    type: 'object',
    properties: {
      message: { type: 'string', example: 'Operación ejecutada con éxito' },
    },
  },
  StandardErrorResponse: {
    type: 'object',
    properties: {
      message: { type: 'string', example: 'Descripción detallada del error de validación o servidor' },
      error: { type: 'string', example: 'BAD_REQUEST' },
    },
  },
}

export const operationOverrides = {
  // ── Auth API Lambda
  auth_post_login: {
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
    },
    responses: {
      200: {
        description: 'Login exitoso. Devuelve tokens y establece cookies HttpOnly.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } },
      },
      400: {
        description: 'Credenciales incompletas o inválidas.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
    },
  },
  auth_post_logout: {
    security: [{ bearerAuth: [] }, { cookieAccessAuth: [] }],
    responses: {
      200: {
        description: 'Sesión finalizada. Cookies eliminadas.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardSuccessResponse' } } },
      },
      401: {
        description: 'Token no provisto.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
    },
  },
  auth_post_refresh: {
    requestBody: {
      required: false,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshTokenRequest' } } },
    },
    security: [{ cookieRefreshAuth: [] }],
    responses: {
      200: {
        description: 'Access Token renovado correctamente.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshTokenResponse' } } },
      },
      401: {
        description: 'Refresh token ausente, expirado o manipulado.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
    },
  },
  auth_get_validate: {
    security: [{ bearerAuth: [] }, { cookieAccessAuth: [] }],
    responses: {
      200: {
        description: 'Token válido con claims activos.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidateResponse' } } },
      },
      401: {
        description: 'Token expirado o inválido.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
    },
  },
  auth_post_change_password: {
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ChangePasswordRequest' } } },
    },
    responses: {
      200: {
        description: 'Contraseña actualizada exitosamente.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardSuccessResponse' } } },
      },
      400: {
        description: 'Campos requeridos faltantes.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
      401: {
        description: 'Token inválido o expirado.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
    },
  },
  auth_get_user_consent: {
    security: [{ bearerAuth: [] }, { cookieAccessAuth: [] }],
    responses: {
      200: {
        description: 'Estado de consentimiento y finalidades autorizadas del usuario autenticado.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/UserConsent' } } },
      },
      401: {
        description: 'Token no provisto o inválido.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
    },
  },
  auth_post_revoke_consent: {
    security: [{ bearerAuth: [] }, { cookieAccessAuth: [] }],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/RevokeConsentRequest' } } },
    },
    responses: {
      200: {
        description: 'Consentimiento revocado exitosamente para las finalidades seleccionadas.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/UserConsent' } } },
      },
      400: {
        description: 'Intento de revocación de finalidades esenciales o lista vacía.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
      401: {
        description: 'Token no provisto o inválido.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
    },
  },

  // ── Auth Admin Lambda
  internal_get_user_consents: {
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'userId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Identificador del usuario cuyos consentimientos se inspeccionan',
      },
      {
        name: 'x-audit-reason',
        in: 'header',
        required: false,
        schema: { type: 'string' },
        description: 'Motivo o justificación de la inspección forense de datos PII',
      },
    ],
    responses: {
      200: {
        description: 'Registro forense de consentimientos y estado de custodia legal.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/UserConsent' } } },
      },
      401: {
        description: 'Token no provisto o inválido.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
      403: {
        description: 'Acceso denegado: Requiere rol admin o root.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
    },
  },
  internal_post_users: {
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/InternalUserCreateRequest' } } },
    },
    responses: {
      201: {
        description: 'Usuario interno creado exitosamente en VPC.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/InternalUserResponse' } } },
      },
      400: {
        description: 'Error de validación en los campos o rol desconocido.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
    },
  },
  internal_get_user_by_id: {
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'userId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Identificador del usuario en el sistema',
      },
    ],
    responses: {
      200: {
        description: 'Datos del usuario interno.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/InternalUserResponse' } } },
      },
    },
  },
  internal_put_user_by_id: {
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'userId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
      },
    ],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/InternalUserUpdateRequest' } } },
    },
    responses: {
      200: {
        description: 'Usuario actualizado.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardSuccessResponse' } } },
      },
    },
  },
  internal_delete_user_by_id: {
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'userId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
      },
    ],
    responses: {
      200: {
        description: 'Usuario eliminado del sistema.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardSuccessResponse' } } },
      },
    },
  },

  // ── Registration Public Lambda
  registration_post_client: {
    summary: 'Registro público de cliente (sin dirección fija requerida)',
    description: 'Registra un nuevo cliente validando RUT Módulo 11, teléfono chileno E.164 y contraseña. No requiere direcciones fijas (calle, número, comuna o región) al momento del registro; los domicilios de retiro y entrega se suministran dinámicamente en cada orden mediante POST /orders.',
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/RegistrationClientCreate' } } },
    },
    responses: {
      201: {
        description: 'Solicitud de cliente registrada exitosamente. Requiere verificación OTP.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string', example: 'Solicitud de cliente registrada correctamente. Proceda a validar mediante OTP.' },
                request: { $ref: '#/components/schemas/RegistrationRequestStatusResponse' },
                requires_otp: { type: 'boolean', example: true },
              },
            },
          },
        },
      },
      400: {
        description: 'Fallo de validación en campos obligatorios, RUT (Módulo 11), teléfono E.164 o contraseña.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
      403: {
        description: 'Consentimiento no otorgado.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
    },
  },
  registration_post_invite: {
    summary: 'Registro mediante token de invitación (Admin / Chofer)',
    description: 'Registra usuarios internos (administradores o choferes) mediante validación de tokens de invitación autorizados (INV-ADM-... o INV-DRV-...) y captura de datos vehiculares en el caso de conductores.',
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/RegistrationInviteCreate' } } },
    },
    responses: {
      201: {
        description: 'Solicitud por invitación registrada. Pendiente de validación OTP.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string', example: 'Solicitud de driver registrada correctamente mediante invitación. Proceda a validar mediante OTP.' },
                request: { $ref: '#/components/schemas/RegistrationRequestStatusResponse' },
                requires_otp: { type: 'boolean', example: true },
              },
            },
          },
        },
      },
      400: {
        description: 'Token de invitación inválido o datos de chofer incompletos.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
      403: {
        description: 'Consentimiento no otorgado.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
    },
  },
  registration_post_requests: {
    summary: 'Crear solicitud de registro pública (Clientes/Conductores con validación RUT)',
    description: 'Crea una solicitud de registro general. Para clientes, las direcciones físicas (calle, número, comuna, región) son opcionales y no requeridas, dado que las direcciones de recolección y entrega se configuran dinámicamente por envío en POST /orders.',
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/RegistrationRequestCreate' } } },
    },
    responses: {
      201: {
        description: 'Solicitud de registro creada. Pendiente de verificación OTP.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string', example: 'Solicitud registrada correctamente. Proceda a validar mediante OTP.' },
                request: { $ref: '#/components/schemas/RegistrationRequestStatusResponse' },
                requires_otp: { type: 'boolean', example: true },
              },
            },
          },
        },
      },
      400: {
        description: 'Fallo de validación en RUT (Módulo 11), teléfono E.164 o contraseña.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
      403: {
        description: 'Consentimiento no otorgado.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
    },
  },
  registration_get_request_status: {
    parameters: [
      {
        name: 'email',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'email' },
        description: 'Correo electrónico del solicitante',
      },
    ],
    responses: {
      200: {
        description: 'Estado de avance de la solicitud de registro.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/RegistrationRequestStatusResponse' } } },
      },
    },
  },
  registration_put_update_contact: {
    parameters: [
      {
        name: 'email',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'email' },
      },
    ],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateContactRequest' } } },
    },
    responses: {
      200: {
        description: 'Contacto actualizado correctamente.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardSuccessResponse' } } },
      },
    },
  },
  registration_put_reupload_comprobante: {
    parameters: [
      {
        name: 'email',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'email' },
      },
    ],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ReuploadComprobanteRequest' } } },
    },
    responses: {
      200: {
        description: 'Comprobante almacenado en S3 exitosamente.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardSuccessResponse' } } },
      },
    },
  },

  // ── OTP Service Lambda
  otp_post_send: {
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/SendOtpRequest' } } },
    },
    responses: {
      200: {
        description: 'Código emitido y enviado al correo.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/SendOtpResponse' } } },
      },
    },
  },
  otp_post_verify: {
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/VerifyOtpRequest' } } },
    },
    responses: {
      200: {
        description: 'OTP validado con éxito. Cuenta activada y Status Token generado.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/VerifyOtpResponse' } } },
      },
      400: {
        description: 'Código OTP erróneo o expirado.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
    },
  },
  notifications_post_whatsapp: {
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/WhatsAppNotificationRequest' } } },
    },
    responses: {
      200: {
        description: 'Notificación de plantilla WhatsApp enviada al destinatario.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardSuccessResponse' } } },
      },
    },
  },

  // ── Admin Overrides Lambda
  admin_post_override_activate_registration: {
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'email',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'email' },
      },
    ],
    requestBody: {
      required: false,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/AdminOverrideActivateRequest' } } },
    },
    responses: {
      200: {
        description: 'Cuenta activada manualmente por administrador.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/AdminOverrideActivateResponse' } } },
      },
      403: {
        description: 'Acceso denegado: Requiere rol admin o root.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
    },
  },

  // ── Payments API Lambda
  payments_post_mercadopago_preference: {
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/MercadoPagoPreferenceRequest' } } },
    },
    responses: {
      200: {
        description: 'Preferencia de Checkout Pro generada.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/MercadoPagoPreferenceResponse' } } },
      },
      400: {
        description: 'Monto, email o identificador de orden faltantes.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
    },
  },
  payments_post_webhook_mercadopago: {
    requestBody: {
      required: false,
      content: { 'application/json': { schema: { type: 'object' } } },
    },
    responses: {
      200: {
        description: 'Notificación IPN recibida y procesada.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/WebhookMercadoPagoResponse' } } },
      },
    },
  },
  payments_post_webhook_fintoc: {
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object' } } },
    },
    responses: {
      200: {
        description: 'Evento de Fintoc procesado con verificación de firma.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/WebhookFintocResponse' } } },
      },
    },
  },

  // ── Notification Lambda
  notifications_post_email_verify_account: {
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/EmailVerifyAccountRequest' } } },
    },
    responses: {
      200: {
        description: 'Correo HTML de verificación despachado por Amazon SES.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardSuccessResponse' } } },
      },
    },
  },
  notifications_post_email_welcome: {
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/EmailWelcomeRequest' } } },
    },
    responses: {
      200: {
        description: 'Correo de bienvenida enviado.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardSuccessResponse' } } },
      },
    },
  },
  notifications_post_email_order_created: {
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/EmailOrderCreatedRequest' } } },
    },
    responses: {
      200: {
        description: 'Comprobante de envío con tracking y PIN de entrega despachado.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardSuccessResponse' } } },
      },
    },
  },
  notifications_post_email_order_status_update: {
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/EmailOrderStatusUpdateRequest' } } },
    },
    responses: {
      200: {
        description: 'Actualización de tracking despachada al cliente.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardSuccessResponse' } } },
      },
    },
  },

  // ── Coupons (Auth Admin Lambda)
  coupons_post_validate: {
    summary: 'Validar y pre-aplicar cupón promocional en checkout (Exclusivo rol client)',
    description: 'Valida la aplicabilidad de un cupón según vigencia, límite de uso, tope de $30.000 CLP y 15% de descuento máximo. Exclusivo para clientes.',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/CouponValidationRequest' } } },
    },
    responses: {
      200: {
        description: 'Cupón válido y descuento calculado.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/CouponValidationResponse' } } },
      },
      400: {
        description: 'Cupón no válido, expirado o agotado.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
      403: {
        description: 'Acceso denegado: Exclusivo para rol client.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
    },
  },
  coupons_post_release: {
    summary: 'Liberar cupón reservado por cancelación o abandono (Exclusivo rol client)',
    description: 'Libera la reserva temporal de un cupón para que el cliente pueda volver a utilizarlo si el pago no se completó.',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/CouponReleaseRequest' } } },
    },
    responses: {
      200: {
        description: 'Reserva de cupón liberada exitosamente.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardSuccessResponse' } } },
      },
      400: {
        description: 'Falta orderId u orden no posee reserva.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
      403: {
        description: 'Acceso denegado: Exclusivo para rol client.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
    },
  },
  root_post_coupons: {
    summary: 'Crear cupón promocional individual (Exclusivo rol root)',
    description: 'Crea un cupón único con restricciones financieras de máx 15% y $30.000 CLP. Exclusivo para el rol root.',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/CouponCreateRequest' } } },
    },
    responses: {
      201: {
        description: 'Cupón creado exitosamente.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                coupon: { $ref: '#/components/schemas/Coupon' },
              },
            },
          },
        },
      },
      400: {
        description: 'Parámetros inválidos o superación de topes (máx 15%, máx $30.000 CLP).',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
      403: {
        description: 'Acceso denegado: Exclusivo para rol root.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
    },
  },
  root_post_coupons_batch: {
    summary: 'Generación masiva de cupones con prefijo (Exclusivo rol root)',
    description: 'Genera un lote de cupones con prefijo unificado (hasta 500 unidades) para activaciones o convenios de creadores. Exclusivo para root.',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/CouponBatchCreateRequest' } } },
    },
    responses: {
      201: {
        description: 'Lote de cupones generado exitosamente.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                count: { type: 'integer', example: 50 },
                coupons: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Coupon' },
                },
              },
            },
          },
        },
      },
      400: {
        description: 'Parámetros de lote inválidos.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
      403: {
        description: 'Acceso denegado: Exclusivo para rol root.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
    },
  },
  root_post_coupons_import_csv: {
    summary: 'Importar cupones de creadores vía CSV (Exclusivo rol root)',
    description: 'Permite la carga de listas masivas de códigos personalizados de influencers/creadores respetando topes comerciales.',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/CouponImportCsvRequest' } } },
    },
    responses: {
      201: {
        description: 'Importación de cupones completada.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                importedCount: { type: 'integer', example: 25 },
                coupons: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Coupon' },
                },
              },
            },
          },
        },
      },
      400: {
        description: 'Formato CSV o datos de cupones inválidos.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
      403: {
        description: 'Acceso denegado: Exclusivo para rol root.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
    },
  },
  root_get_coupons: {
    summary: 'Listar cupones y KPIs de rendimiento (Exclusivo rol root)',
    description: 'Devuelve la lista paginada de cupones con métricas consolidadas de canjes, descuentos acumulados y creadores asociados.',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'page',
        in: 'query',
        required: false,
        schema: { type: 'integer', default: 1 },
        description: 'Número de página actual (1-indexed)',
      },
      {
        name: 'isActive',
        in: 'query',
        required: false,
        schema: { type: 'boolean' },
        description: 'Filtrar por estado activo/inactivo',
      },
      {
        name: 'creator',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Filtrar por nombre o atribución de creador',
      },
      {
        name: 'limit',
        in: 'query',
        required: false,
        schema: { type: 'integer', default: 50 },
      },
      {
        name: 'offset',
        in: 'query',
        required: false,
        schema: { type: 'integer', default: 0 },
      },
    ],
    responses: {
      200: {
        description: 'Listado de cupones y métricas de campaña.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                data: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Coupon' },
                },
                total: { type: 'integer', example: 120 },
                coupons: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Coupon' },
                },
                meta: { $ref: '#/components/schemas/PaginationMeta' },
                metrics: {
                  type: 'object',
                  properties: {
                    totalCoupons: { type: 'integer', example: 120 },
                    activeCoupons: { type: 'integer', example: 110 },
                    totalRedemptions: { type: 'integer', example: 840 },
                    totalDiscountGranted: { type: 'number', example: 2520000 },
                  },
                },
              },
            },
          },
        },
      },
      403: {
        description: 'Acceso denegado: Exclusivo para rol root.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
    },
  },
  root_patch_coupon_by_id: {
    summary: 'Actualizar cupón o prorrogar vigencia (Exclusivo rol root)',
    description: 'Permite pausar/desactivar un cupón, extender su vigencia o aumentar el límite de usos.',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: 'ID único del cupón a actualizar',
      },
    ],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/CouponUpdateRequest' } } },
    },
    responses: {
      200: {
        description: 'Cupón actualizado exitosamente.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                coupon: { $ref: '#/components/schemas/Coupon' },
              },
            },
          },
        },
      },
      400: {
        description: 'Datos de actualización inválidos.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
      403: {
        description: 'Acceso denegado: Exclusivo para rol root.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
    },
  },
  internal_get_users: {
    tags: ['Users Administration'],
    summary: 'Listar usuarios internos del sistema con paginación Importal y filtros',
    description: 'Consulta el listado administrativo de usuarios en VPC con soporte de búsqueda por texto libre y filtros por rol y estado. Retorna el formato estándar de paginación Importal con el objeto dual data/users y metadatos calculados.',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'page',
        in: 'query',
        required: false,
        schema: { type: 'integer', default: 1 },
        description: 'Número de página actual (1-indexed)',
      },
      {
        name: 'limit',
        in: 'query',
        required: false,
        schema: { type: 'integer', default: 50 },
        description: 'Cantidad máxima de registros por página (máximo 100)',
      },
      {
        name: 'offset',
        in: 'query',
        required: false,
        schema: { type: 'integer', default: 0 },
        description: 'Desplazamiento alternativo para compatibilidad hacia atrás',
      },
      {
        name: 'role',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['all', 'root', 'admin', 'driver', 'client'], default: 'all' },
        description: 'Filtrar por rol de usuario dentro de la plataforma',
      },
      {
        name: 'status',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['all', 'active', 'blocked'], default: 'all' },
        description: 'Filtrar por estado activo o inactivo/bloqueado',
      },
      {
        name: 'search',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Término de búsqueda libre por nombre, correo electrónico, teléfono o RUT',
      },
    ],
    responses: {
      200: {
        description: 'Lista paginada de usuarios internos con compatibilidad dual data/users.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                data: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/InternalUserSummary' },
                },
                users: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/InternalUserSummary' },
                },
                total: { type: 'integer', example: 45 },
                limit: { type: 'integer', example: 50 },
                offset: { type: 'integer', example: 0 },
                meta: { $ref: '#/components/schemas/PaginationMeta' },
              },
            },
          },
        },
      },
      401: {
        description: 'No autenticado o token ausente/expirado.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
      403: {
        description: 'Acceso denegado: Requiere privilegios de rol root o admin.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
    },
  },
  orders_get_orders: {
    tags: ['Orders & Dispatch'],
    summary: 'Listar órdenes de despacho con paginación Importal y filtrado por rol',
    description: 'Obtiene las órdenes de despacho registradas con alcance acotado según el rol del solicitante (los clientes ven únicamente sus pedidos, conductores sus órdenes de ruta y administradores todas). Retorna respuesta dual data/orders con metadatos de paginación.',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'page',
        in: 'query',
        required: false,
        schema: { type: 'integer', default: 1 },
        description: 'Número de página actual (1-indexed)',
      },
      {
        name: 'limit',
        in: 'query',
        required: false,
        schema: { type: 'integer', default: 20 },
        description: 'Cantidad de órdenes por página (máximo 100)',
      },
      {
        name: 'status',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Filtrar por estado del ciclo de vida del pedido',
      },
      {
        name: 'driverId',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Filtrar por conductor asignado (reservado a roles operativos)',
      },
      {
        name: 'customerId',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Filtrar por identificador de cliente',
      },
      {
        name: 'search',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Búsqueda por número de tracking, remitente, destinatario o comuna',
      },
    ],
    responses: {
      200: {
        description: 'Listado de órdenes paginado y redactado conforme al rol del usuario.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                data: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/OrderSummary' },
                },
                orders: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/OrderSummary' },
                },
                total: { type: 'integer', example: 120 },
                meta: { $ref: '#/components/schemas/PaginationMeta' },
              },
            },
          },
        },
      },
      401: {
        description: 'No autenticado o token ausente/inválido.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
    },
  },
  internal_get_orders: {
    tags: ['Orders & Dispatch'],
    summary: 'Listar todas las órdenes operativas con paginación Importal',
    description: 'Endpoint administrativo y de despacho para supervisión global de pedidos en VPC, con filtros combinados por estado, conductor o cliente y metadatos estándar de paginación.',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'page',
        in: 'query',
        required: false,
        schema: { type: 'integer', default: 1 },
        description: 'Número de página actual (1-indexed)',
      },
      {
        name: 'limit',
        in: 'query',
        required: false,
        schema: { type: 'integer', default: 20 },
        description: 'Cantidad máxima de órdenes por página (máximo 100)',
      },
      {
        name: 'status',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Filtrar por estado del pedido',
      },
      {
        name: 'driverId',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Filtrar por ID de conductor asignado',
      },
      {
        name: 'customerId',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Filtrar por ID o RUT de cliente',
      },
      {
        name: 'search',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Búsqueda por tracking, remitente, destinatario o comuna',
      },
    ],
    responses: {
      200: {
        description: 'Listado completo de órdenes paginadas para operaciones internas.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                data: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/OrderSummary' },
                },
                orders: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/OrderSummary' },
                },
                total: { type: 'integer', example: 340 },
                meta: { $ref: '#/components/schemas/PaginationMeta' },
              },
            },
          },
        },
      },
      401: {
        description: 'No autenticado o token ausente/inválido.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
      403: {
        description: 'Acceso denegado: Requiere rol admin o root.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
    },
  },
  routes_get_routes: {
    tags: ['Route Planning'],
    summary: 'Listar rutas planificadas con paginación Importal',
    description: 'Consulta las rutas planificadas de recolección y distribución. Los conductores sólo reciben las rutas asignadas a su vehículo, mientras que administradores pueden listar todas las rutas operativas.',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'page',
        in: 'query',
        required: false,
        schema: { type: 'integer', default: 1 },
        description: 'Número de página actual (1-indexed)',
      },
      {
        name: 'limit',
        in: 'query',
        required: false,
        schema: { type: 'integer', default: 20 },
        description: 'Cantidad máxima de rutas por página (máximo 100)',
      },
      {
        name: 'type',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['pickup', 'delivery', 'transfer'] },
        description: 'Filtrar por tipo de ruta logística',
      },
      {
        name: 'driverId',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Filtrar por conductor asignado (exclusivo para administradores)',
      },
    ],
    responses: {
      200: {
        description: 'Listado de rutas planificadas con pedidos y paradas ordenadas.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                data: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/RouteSummary' },
                },
                routes: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/RouteSummary' },
                },
                total: { type: 'integer', example: 8 },
                meta: { $ref: '#/components/schemas/PaginationMeta' },
              },
            },
          },
        },
      },
      401: {
        description: 'No autenticado o token ausente/inválido.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
    },
  },
  internal_get_routes: {
    tags: ['Route Planning'],
    summary: 'Listar rutas operativas con paradas ordenadas y paginación Importal',
    description: 'Consulta interna en VPC de rutas planificadas con paradas ordenadas secuencialmente por stopSequence, cálculo de distancias y paginación estándar Importal.',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'page',
        in: 'query',
        required: false,
        schema: { type: 'integer', default: 1 },
        description: 'Número de página actual (1-indexed)',
      },
      {
        name: 'limit',
        in: 'query',
        required: false,
        schema: { type: 'integer', default: 20 },
        description: 'Cantidad máxima de rutas por página (máximo 100)',
      },
      {
        name: 'type',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['pickup', 'delivery', 'transfer'] },
        description: 'Filtrar por tipo de ruta',
      },
      {
        name: 'driverId',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Filtrar por conductor asignado',
      },
    ],
    responses: {
      200: {
        description: 'Listado operativo de rutas con paradas y métricas de optimización.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                data: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/RouteSummary' },
                },
                routes: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/RouteSummary' },
                },
                total: { type: 'integer', example: 15 },
                meta: { $ref: '#/components/schemas/PaginationMeta' },
              },
            },
          },
        },
      },
      401: {
        description: 'No autenticado o token ausente/inválido.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
      403: {
        description: 'Acceso denegado: Requiere rol admin o root.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
    },
  },
  otp_get_deliveries: {
    tags: ['OTP & WhatsApp'],
    summary: 'Listar entregas y envíos OTP con paginación Importal y enmascaramiento PII',
    description: 'Consulta el registro de emisiones y entregas de códigos OTP vía Meta WhatsApp Cloud API y canales de respaldo, aplicando enmascaramiento estricto de datos de contacto (Ley N° 21.719) y formato de paginación estándar Importal.',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'page',
        in: 'query',
        required: false,
        schema: { type: 'integer', default: 1 },
        description: 'Número de página actual (1-indexed)',
      },
      {
        name: 'limit',
        in: 'query',
        required: false,
        schema: { type: 'integer', default: 20 },
        description: 'Cantidad máxima de entregas por página (máximo 100)',
      },
      {
        name: 'q',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Búsqueda por identificador, correo o dígitos telefónicos',
      },
    ],
    responses: {
      200: {
        description: 'Historial de entregas OTP con métricas de fallos y paginación Importal.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                data: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/OtpDeliveryItem' },
                },
                deliveries: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/OtpDeliveryItem' },
                },
                total: { type: 'integer', example: 88 },
                meta: { $ref: '#/components/schemas/PaginationMeta' },
                fallidos: { type: 'integer', example: 2, description: 'Cantidad de envíos en estado fallido en la página actual' },
                ttlMinutos: { type: 'integer', example: 10, description: 'Vigencia de los códigos OTP en minutos' },
                intentosMaximos: { type: 'integer', example: 5, description: 'Máximo de intentos de verificación permitidos' },
              },
            },
          },
        },
      },
      401: {
        description: 'No autenticado o token ausente/inválido.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
      403: {
        description: 'Acceso denegado: Reservado a operaciones (roles root o admin).',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardErrorResponse' } } },
      },
    },
  },
}

export function createDefaultOperation(route) {
  return {
    tags: route.tags || [route.tag],
    summary: route.summary || `${route.method.toUpperCase()} ${route.path}`,
    operationId: route.operationId,
    responses: {
      200: {
        description: 'Operación ejecutada exitosamente.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/StandardSuccessResponse' },
          },
        },
      },
    },
  }
}
