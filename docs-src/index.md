---
layout: home

hero:
  name: "Flowex Docs"
  text: "Portal Técnico de la Plataforma"
  tagline: "Documentación de Microservicios Serverless, Pasarelas de Pago, Motor OTP WhatsApp y Arquitectura Cloud de Despachos"
  actions:
    - theme: brand
      text: Ver Arquitectura
      link: /architecture
    - theme: alt
      text: Referencia API (Scalar)
      link: /reference.html
  image:
    src: https://vitepress.dev/vitepress-logo-large.png
    alt: Flowex Logo

features:
  - icon: 🔐
    title: Autenticación Segura & Roles
    details: Tokens JWT, Cookies HttpOnly seguras y control de acceso basado en roles (root, admin, driver, client).
  - icon: 📲
    title: Motor OTP & Meta WhatsApp API
    details: Verificación en 2 pasos vía WhatsApp Business Cloud API, SMS y auto-activación instantánea de cuentas.
  - icon: 💳
    title: Pasarelas de Pago & Webhooks
    details: Checkout Pro de Mercado Pago, transferencias Open Banking A2A con Fintoc y conciliación por webhooks.
  - icon: 🚚
    title: Logística & Proof of Delivery (POD)
    details: Ciclo de estados de envíos en tiempo real, PIN de seguridad de 4 dígitos, firmas digitales y fotos de entrega.
  - icon: ⚡
    title: Arquitectura Serverless en AWS
    details: Microservicios desacoplados en AWS Lambdas, Amazon SQS, Amazon SES, S3 y DynamoDB orquestados con AWS CDK.
  - icon: 🇨🇱
    title: Validaciones Locales para Chile
    details: Validación estricta de RUT mediante algoritmo Módulo 11 y formateo telefónico E.164 (+569).
  - icon: 👤
    title: Módulo Estandarizado de Perfil
    details: Gestión transversal de identidad para todos los roles con libreta de direcciones, facturación DTE y consentimientos.
  - icon: 📍
    title: Libreta de Direcciones Frecuentes
    details: Administración de bodegas y sucursales con selección de dirección principal para autocompletar órdenes de despacho.
  - icon: 📄
    title: Facturación Tributaria DTE
    details: Configuración centralizada de Razón Social, RUT Empresa Módulo 11 y giro comercial para emisión automática de facturas.
  - icon: ⚖️
    title: Consentimiento Legal (Ley N° 21.719)
    details: Cumplimiento estricto de protección de datos personales con trazabilidad de IP, timestamp y control de preferencias multicanal.
---
