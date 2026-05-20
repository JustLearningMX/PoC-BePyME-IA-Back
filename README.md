# PoC-BePyME-IA-Back

Backend en NestJS para integrar Qlik Sense / Qlik Cloud con el proyecto PoC BePyME IA. Expone endpoints para consultar salud del servicio, crear threads, consumir respuestas en streaming y consultar información de asistentes o usuarios de Qlik.

## Requisitos

- Node.js 22 o superior recomendado.
- npm.
- Un archivo `.env` en la raíz del proyecto.
- Credenciales válidas de Qlik Cloud o un token de API configurado.

## Instalación

```bash
npm install
```

## Configuración

Copia `.env.example` a `.env` y completa los valores necesarios.

```bash
copy .env.example .env
```

Variables principales:

- `PORT`: puerto del backend.
- `QLIK_HOST`: host base de Qlik Cloud.
- `QLIK_ASSISTANT_ID`: asistente por defecto.
- `CLOUD_ASSISTANT_ID`: identificador auxiliar usado por el proyecto.
- `QLIK_WEB_INTEGRATION_ID`: integración web configurada en Qlik.
- `QLIK_TOKEN`: token de acceso para llamadas directas a Qlik.
- `QLIK_OAUTH_CLIENT_ID` y `QLIK_OAUTH_CLIENT_SECRET`: credenciales OAuth para el flujo server-side.
- `QLIK_OAUTH_REDIRECT_URI`: callback OAuth.
- `BACKEND_ORIGIN`: origen esperado del backend.
- `FRONTEND_ORIGIN`: origen permitido para CORS.
- `BEPYME_QLIK_SPACE_ID`: espacio de Qlik usado por la solución.
- `BEPYME_QLIK_APP_ID`: app de Qlik usada por la solución.

## Ejecución

Desarrollo:

```bash
npm run start:dev
```

Producción:

```bash
npm run build
npm start
```

El servidor arranca en `http://localhost:<PORT>` y expone el prefijo global `api/v1` para la mayoría de las rutas.

## Endpoints

### Salud

- `GET /api/v1/health`

### Variables de entorno expuestas para diagnóstico

- `GET /api/v1/debug/env`

### Threads

- `POST /api/v1/threads`

Body opcional:

```json
{
  "question": "¿Cómo está funcionando el proyecto?",
  "assistantId": "opcional"
}
```

### Streaming de respuestas

- `ALL /api/v1/stream`
- `ALL /stream-answers`

Parámetros esperados por query o body:

```json
{
  "question": "Texto de la pregunta",
  "threadId": "id-del-thread",
  "assistantId": "opcional"
}
```

### Asistentes

- `GET /api/v1/assistant?assistantId=...`

### Usuarios

- `GET /api/v1/users/me`
- `GET /api/v1/users/:id`

Para los endpoints de usuarios, envía el token en el header `Authorization: Bearer <token>`.

## Comportamiento CORS

El backend permite por defecto estos orígenes:

- `http://127.0.0.1:5500`
- `http://localhost:5500`
- `http://localhost:4200`
- `https://justlearningmx.github.io`

Si `FRONTEND_ORIGIN` está definido en `.env`, también se agrega a la lista permitida.

## Notas técnicas

- NestJS aplica validación global con `ValidationPipe`.
- La ruta `stream-answers` se mantiene sin el prefijo `api/v1` por compatibilidad.
- El servicio valida que `QLIK_HOST` y `QLIK_TOKEN` estén configurados para ejecutar llamadas a Qlik.

## Estructura

```text
src/
  app.module.ts
  main.ts
  qlik/
    dto/
    entities/
    qlik.controller.ts
    qlik.module.ts
    qlik.service.ts
```
