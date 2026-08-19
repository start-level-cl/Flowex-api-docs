# Plan de Arquitectura y Documentación - Flowex API Docs

## Objetivos
1. Centralizar la especificación OpenAPI 3.1.0 interactiva para el 100% de los microservicios y funciones Lambda de Flowex.
2. Proveer un portal de guías técnicas enriquecido con diagramas Mermaid, tablas de estado, flujos transaccionales y matrices de lambdas.
3. Generar definiciones de tipos TypeScript (`generated/api-types.d.ts`) para sincronización transparente con `Flowex-frontend`.
4. Automatizar el despliegue estático de la documentación hacia Vercel mediante GitHub Actions.

## Entregables
- [x] Extracción dinámica de endpoints en `scripts/lib/route-extractor.mjs`.
- [x] Esquemas, modelos de datos, tags y configuraciones en `scripts/lib/spec-config.mjs`.
- [x] Generador de OpenAPI 3.1.0 (`generated/openapi.json` y `generated/openapi.yaml`) en `scripts/build-openapi.mjs`.
- [x] Validador de consistencia de rutas en `scripts/validate-openapi.mjs`.
- [x] Generador de tipos TypeScript en `scripts/lib/typegen.mjs`.
- [x] Portal estático VitePress + Mermaid con navegación estructurada y tema oscuro en `docs-src/`.
- [x] Interfaz interactiva Scalar API Reference en `docs-src/public/reference.html`.
- [x] Configuración y workflow de despliegue en Vercel (`vercel.json`, `.github/workflows/vercel-deploy.yml`).
- [x] Inicialización del repositorio git vinculado a `https://github.com/start-level-cl/Flowex-api-docs.git`.
