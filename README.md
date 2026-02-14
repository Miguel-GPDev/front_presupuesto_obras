# Front Presupuesto Obras (Angular)

Aplicación Angular para crear presupuestos de obra con capítulos y partidas.

## Funcionalidad

- Crear un presupuesto nuevo con nombre y descripción.
- Añadir capítulos con:
  - nombre,
  - referencia/número,
  - descripción.
- Añadir partidas por capítulo con:
  - descripción,
  - unidad de medida,
  - cantidad,
  - precio,
  - total automático (cantidad x precio).
- Cálculo automático de totales por capítulo y total general del presupuesto.
- Envío del presupuesto al backend (`POST /api/presupuestos`).

## Configuración del backend

La URL del backend está en:

`src/environments/environment.ts`

```ts
apiBaseUrl: 'http://localhost:3000/api'
```

Ajústala según tu backend de presupuestos de obra.

## Scripts

```bash
npm install
npm start
```
