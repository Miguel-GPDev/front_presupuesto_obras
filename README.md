# Front Presupuesto Obras (Angular)

Aplicación Angular para gestionar presupuestos de obra por usuario.

## Flujo funcional

1. Registro de usuario.
2. Inicio de sesión para recuperar presupuestos del usuario.
3. Home con listado de presupuestos del usuario autenticado.
4. Apertura de un presupuesto existente para seguir editándolo.
5. Creación de un presupuesto nuevo.
6. Edición de capítulos y partidas con cálculo automático de totales.

## Estructura de presupuesto

- Presupuesto: nombre, descripción y total.
- Capítulo: nombre, referencia/número, descripción y total.
- Partida: descripción, unidad de medida, cantidad, precio y total (`cantidad x precio`).

## Endpoints esperados de backend

Con `apiBaseUrl` configurado en `src/environments/environment.ts`:

- `POST /auth/register`
- `POST /auth/login`
- `GET /presupuestos/mis`
- `GET /presupuestos/:id`
- `POST /presupuestos`
- `PUT /presupuestos/:id`

## Configuración del backend

Archivo:

`src/environments/environment.ts`

```ts
apiBaseUrl: 'http://localhost:3000/api'
```

## Scripts

```bash
npm install
npm start
```
