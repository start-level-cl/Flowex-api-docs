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
    description: 'Servicio de notificaciones transaccionales vía Amazon SES (HTML emails) y SMS',
  },
  {
    name: 'Users Administration',
    description: 'Gestión CRUD interna de usuarios en VPC (Roles: root, admin, driver, client)',
  },
  {
    name: 'Admin Overrides',
    description: 'Endpoints y eventos administrativos para activación forzada o resolución manual de registros',
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
  RegistrationRequestCreate: {
    type: 'object',
    required: ['email', 'name', 'rut', 'phone', 'password', 'consentimiento'],
    properties: {
      email: { type: 'string', format: 'email', example: 'cliente.nuevo@gmail.com' },
      name: { type: 'string', example: 'Andrea Morales' },
      rut: { type: 'string', description: 'RUT chileno validado por Módulo 11', example: '19876543-2' },
      phone: { type: 'string', description: 'Teléfono formato E.164 (+569...)', example: '+56991234567' },
      password: { type: 'string', format: 'password', description: 'Contraseña segura (mínimo 8 caracteres, mayúscula, minúscula, número y símbolo)' },
      role: { $ref: '#/components/schemas/UserRole', default: 'client' },
      consentimiento: { type: 'boolean', description: 'Consentimiento informado obligatorio', example: true },
      housingType: { $ref: '#/components/schemas/HousingType' },
      streetAndNumber: { type: 'string', example: 'Av. Providencia 1234' },
      deptOrOffice: { type: 'string', example: 'Oficina 502' },
      region: { type: 'string', example: 'Región Metropolitana' },
      comuna: { type: 'string', example: 'Providencia' },
      reference: { type: 'string', example: 'Frente a estación Metro Manuel Montt' },
      agency: { type: 'string', example: 'Sucursal Central' },
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
      comprobante: { type: 'string', description: 'Comprobante opcional en Base64 o Data URL' },
      comprobanteFileName: { type: 'string', example: 'comprobante_residencia.pdf' },
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
    properties: {
      target: { type: 'string', description: 'Correo o teléfono destino', example: 'cliente.nuevo@gmail.com' },
      email: { type: 'string', example: 'cliente.nuevo@gmail.com' },
      phone: { type: 'string', example: '+56991234567' },
      channel: { type: 'string', enum: ['sms', 'whatsapp', 'email', 'both'], example: 'both' },
    },
  },
  SendOtpResponse: {
    type: 'object',
    properties: {
      message: { type: 'string', example: 'OTP generado y enviado por SMS/WhatsApp/Email correctamente' },
      email: { type: 'string', example: 'cliente.nuevo@gmail.com' },
      phone: { type: 'string', example: '+56991234567' },
      channel: { type: 'string', example: 'both' },
      mockOtpCode: { type: 'string', example: '654321' },
    },
  },
  SendWhatsAppOtpRequest: {
    type: 'object',
    required: ['phone'],
    properties: {
      phone: { type: 'string', example: '+56991234567' },
    },
  },
  SendWhatsAppOtpResponse: {
    type: 'object',
    properties: {
      message: { type: 'string', example: 'Código OTP enviado por WhatsApp exitosamente' },
      phone: { type: 'string', example: '+56991234567' },
      channel: { type: 'string', example: 'whatsapp' },
      otp: { type: 'string', example: '482910' },
      whatsappResponse: { type: 'object' },
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
        example: ['FLX-2026-8492', 'Hub Central Quilicura'],
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
  FintocPaymentIntentRequest: {
    type: 'object',
    required: ['orderId', 'amount', 'payerEmail'],
    properties: {
      orderId: { type: 'string', example: 'ord_1771344928' },
      trackingNumber: { type: 'string', example: 'FLX-2026-8492' },
      amount: { type: 'number', example: 14500 },
      payerEmail: { type: 'string', format: 'email', example: 'cliente@gmail.com' },
    },
  },
  FintocPaymentIntentResponse: {
    type: 'object',
    properties: {
      provider: { type: 'string', example: 'fintoc' },
      paymentIntentId: { type: 'string', example: 'pi_fintoc_1771344928000' },
      widgetToken: { type: 'string', example: 'wt_a1b2c3d4e5f6g7h8i9j0' },
      checkoutUrl: { type: 'string', example: 'https://checkout.fintoc.com/p/wt_a1b2c3d4e5f6g7h8i9j0' },
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
  SmsVerifyPhoneRequest: {
    type: 'object',
    required: ['phone', 'code'],
    properties: {
      phone: { type: 'string', example: '+56987654321' },
      code: { type: 'string', example: '839201' },
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

  // ── Auth Admin Lambda
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
  registration_post_requests: {
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
                message: { type: 'string' },
                request: { $ref: '#/components/schemas/RegistrationRequestStatusResponse' },
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
        description: 'OTP despachado por SMS/WhatsApp/Email.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/SendOtpResponse' } } },
      },
    },
  },
  otp_post_send_whatsapp: {
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/SendWhatsAppOtpRequest' } } },
    },
    responses: {
      200: {
        description: 'OTP enviado por Meta WhatsApp Cloud API.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/SendWhatsAppOtpResponse' } } },
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
  payments_post_fintoc_payment_intent: {
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/FintocPaymentIntentRequest' } } },
    },
    responses: {
      200: {
        description: 'Intención de pago Fintoc A2A generada.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/FintocPaymentIntentResponse' } } },
      },
      400: {
        description: 'Parámetros obligatorios ausentes.',
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
  notifications_post_sms_verify_phone: {
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/SmsVerifyPhoneRequest' } } },
    },
    responses: {
      200: {
        description: 'Mensaje de texto SMS despachado.',
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
