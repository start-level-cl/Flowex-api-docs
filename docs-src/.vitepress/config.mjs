import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(
  defineConfig({
    title: 'Flowex Docs',
    description: 'Documentación técnica y arquitectura de la plataforma Flowex - Serverless, Lambdas, Pasarelas de Pago, WhatsApp OTP y Envíos',
    outDir: '../docs',
    cleanUrls: true,
    markdown: {
      math: true,
    },
    themeConfig: {
      nav: [
        { text: 'Inicio', link: '/' },
        { text: 'Arquitectura', link: '/architecture' },
        {
          text: 'Guías',
          items: [
            { text: 'Autenticación (Auth)', link: '/auth' },
            { text: 'Perfil de Usuario y Libreta', link: '/profile' },
            { text: 'Registro y Validación RUT', link: '/registration' },
            { text: 'Motor OTP y WhatsApp', link: '/otp-whatsapp' },
            { text: 'Pasarelas de Pago (Mercado Pago & Fintoc)', link: '/payments-webhooks' },
            { text: 'Notificaciones (Amazon SES / SQS)', link: '/notifications-ses' },
            { text: 'Consent Worker y Auditoría PII', link: '/consent-worker' },
            { text: 'Gestión de Pedidos, Rutas y POD', link: '/orders-dispatch' },
            { text: 'Capa Compartida (Shared Layer)', link: '/shared-layer' },
            { text: 'Arquitectura Serverless Lambdas', link: '/lambdas' },
            { text: 'Administración y Overrides', link: '/admin-api' },
          ],
        },
        { text: 'Referencia API ↗', link: '/reference.html', target: '_blank' },
      ],
      sidebar: [
        {
          text: 'Información General',
          items: [
            { text: 'Introducción a Flowex', link: '/' },
            { text: 'Arquitectura Global del Sistema', link: '/architecture' },
          ],
        },
        {
          text: 'Autenticación, Perfil y Onboarding',
          items: [
            { text: 'Autenticación y Sesiones JWT', link: '/auth' },
            { text: 'Módulo Estandarizado de Perfil', link: '/profile' },
            { text: 'Registro y Validación RUT (Módulo 11)', link: '/registration' },
            { text: 'Motor OTP y Meta WhatsApp API', link: '/otp-whatsapp' },
            { text: 'Consent Worker y Auditoría PII', link: '/consent-worker' },
          ],
        },
        {
          text: 'Transacciones y Operaciones',
          items: [
            { text: 'Pasarelas de Pago y Webhooks', link: '/payments-webhooks' },
            { text: 'Notificaciones SES y Workers SQS', link: '/notifications-ses' },
            { text: 'Pedidos, Rutas y Proof of Delivery', link: '/orders-dispatch' },
          ],
        },
        {
          text: 'Infraestructura y Referencia',
          items: [
            { text: 'Capa Compartida (Shared Layer)', link: '/shared-layer' },
            { text: 'Matriz de Lambdas AWS', link: '/lambdas' },
            { text: 'Administración VPC y Overrides', link: '/admin-api' },
          ],
        },
      ],
      socialLinks: [
        { icon: 'github', link: 'https://github.com/start-level-cl/Flowex-api-docs' },
      ],
      footer: {
        message: 'Portal de Documentación Técnica - Flowex',
        copyright: 'Copyright © 2026 Flowex Engineering',
      },
    },
  }),
)
