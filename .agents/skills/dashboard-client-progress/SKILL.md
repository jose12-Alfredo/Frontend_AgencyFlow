---
name: dashboard-client-progress
description: Mantén y corrige la sección "Clientes y avance" del dashboard de AgencyFlow, especialmente cuando filtros o drill-down pueden ocultar clientes.
---

# Clientes y avance del dashboard

Usa esta skill al modificar la tabla **Clientes y avance** o el detalle jerárquico que se abre desde ella. Para reglas generales de indicadores y diseño del dashboard, usa también `agencyflow-dashboard`.

## Correcciones consolidadas

### La tabla debe ser un inventario completo de clientes

- Debe mostrar todos los clientes existentes, no solo los que la respuesta de KPI devuelve con actividad.
- La fuente que garantiza la cobertura es `DashboardFilterCatalogs.clients`, cargada desde `clientCompaniesService.getAll` con paginación completa.
- Los indicadores por cliente provienen de `DashboardData.clientHealth`. Combina ambas fuentes por ID (`clientId` / `id`).
- Si un cliente del catálogo no está en `clientHealth`, conserva su fila usando: avance `null`, 0 proyectos y 0 alertas. La UI debe comunicar ausencia de avance como **“Sin datos”** / **“—”**, nunca como 0 %.

### Los filtros no deben reducir el inventario de clientes

- Los KPI, riesgos y secciones operativas sí responden al contexto seleccionado.
- La tabla de clientes conserva su lista global para el periodo elegido. Su salud se obtiene con una consulta independiente que solo incluye `year` y `month`; no debe incluir cliente, proyecto, subproyecto, área ni responsable.
- En `app/dashboard/page.tsx`, conserva esta salud global como estado separado del `data` filtrado y entrégala a `ManagerDashboard` mediante la prop `clientHealth`.
- Protege actualizaciones asíncronas con el `requestId` existente para que una respuesta anterior no reemplace datos más recientes.

### Clic en una fila: drill-down, no filtro implícito

- Clic en un cliente abre `dashboardService.getClientHierarchy(clientId, { year, month, departmentId, responsibleUserId })` dentro de `ManagerDashboard`.
- No llames a `setClientCompany` desde la fila. Hacerlo convierte el dashboard completo en una vista de un cliente y hace desaparecer los demás al cerrar el detalle.
- El modal conserva la jerarquía Cliente → Proyecto → Subproyecto → Tarea → Subtarea y puede respetar área/responsable como contexto del detalle.

## Compatibilidad temporal del backend

`getDashboardWithTemporalFallback` intenta primero la consulta con `year` y `month`. Solo ante un `ApiError` 5xx y si se incluyó un filtro temporal, reintenta sin esos parámetros. No ocultes errores 4xx ni otros errores: deben seguir siendo visibles al usuario.

## Archivos relevantes

- `app/dashboard/page.tsx`: carga de catálogos, separación entre dashboard filtrado y salud global de clientes, fallback temporal.
- `components/dashboard/ManagerDashboard.tsx`: combinación de catálogo y salud con `useMemo`, tabla y drill-down.
- `context/DashboardFiltersContext.tsx`: estado de filtros dependientes; no modificarlo para que el clic de una fila funcione.
- `types/dashboard.types.ts`: contrato de `ClientHealthItem` y jerarquía de cliente.

## Verificación mínima

1. Con dos o más clientes, abre uno y ciérralo: todas las filas deben permanecer.
2. Selecciona cliente, proyecto, área o responsable: las filas siguen mostrando todos los clientes, mientras las demás secciones sí cambian con el contexto.
3. Incluye un cliente sin actividad: debe aparecer con “Sin datos”, no 0 %.
4. Cambia de periodo y confirma que el avance de la tabla corresponde al nuevo mes.
5. Ejecuta `npx.cmd tsc --noEmit` y `npm.cmd run lint` desde PowerShell cuando la política de ejecución bloquee `npx`/`npm` sin extensión.
