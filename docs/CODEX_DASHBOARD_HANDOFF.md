# AgencyFlow Dashboard — documento de relevo para Codex

Fecha de corte: 27 de agosto de 2026.

Este documento describe exclusivamente los cambios que permanecen en el código. No incluye propuestas descartadas ni cambios que no llegaron a aplicarse.

## 1. Alcance y repositorios

- Frontend: `C:\Users\jose1\RiderProjects\agencyflow-frontend`
- Backend: `C:\Users\jose1\RiderProjects\AgencyFlow\AgencyFlow`
- El dashboard conserva la jerarquía: Cliente → Proyecto → Subproyecto → Tarea → Subtarea.
- Relaciones organizacionales: Subproyecto → Área, Tarea → Responsable, Subtarea → Responsable(s).
- Para continuar este trabajo se deben usar las skills `agencyflow-dashboard` y `frontend-design`.

No fue posible usar `git status` para reconstruir el historial porque las carpetas inspeccionadas no se reconocieron como repositorios Git. Por ello, este inventario se basa en el estado efectivo de los archivos y en las verificaciones ejecutadas.

## 2. Estado actual del frontend

### 2.1. Contexto compartido de filtros

`context/DashboardFiltersContext.tsx` mantiene el estado global de:

- `clientCompanyId`
- `projectId`
- `subProjectId`
- `departmentId`
- `responsibleUserId`
- `period`

También expone proyectos y subproyectos visibles, cantidad de filtros activos, limpieza y reintento.

Dependencias implementadas:

- Al cambiar Cliente se limpian Proyecto y Subproyecto.
- Al cambiar Proyecto se limpia Subproyecto.
- Proyecto muestra únicamente opciones compatibles con el cliente.
- Subproyecto muestra únicamente opciones compatibles con el proyecto.

### 2.2. Barra de filtros

`components/dashboard/DashboardFiltersBar.tsx` contiene los filtros Cliente, Proyecto, Subproyecto, Área, Responsable y Periodo.

- Diseño responsive: 1 columna en móvil, 2 en `sm`, 3 en `lg` y 6 en `xl`.
- El periodo permanece en `Todo el historial` y está deshabilitado.
- La desactivación es deliberada: todavía no existe una definición de negocio suficiente para calcular correctamente métricas planificadas dentro de un periodo.
- No se hardcodearon catálogos.

### 2.3. Obtención de catálogos y actualización del dashboard

`app/dashboard/page.tsx`:

- carga todas las páginas disponibles de los servicios existentes de clientes, proyectos, subproyectos, áreas y usuarios;
- excluye del selector de responsables a usuarios con rol `Cliente`;
- envuelve el dashboard en `DashboardFiltersProvider`;
- vuelve a consultar `/api/dashboard` al cambiar filtros soportados;
- conserva los datos anteriores mientras llega una nueva respuesta;
- ignora respuestas obsoletas usando un identificador de solicitud;
- evita duplicar la solicitud inicial;
- si una actualización filtrada falla, conserva el dashboard anterior y muestra el error sin desmontar toda la vista.

`services/dashboard.service.ts` define `DashboardQuery`, serializa solamente los cinco identificadores opcionales soportados y permite cancelar solicitudes mediante `AbortSignal`.

### 2.4. Encabezado y KPI visibles

`components/dashboard/ManagerDashboard.tsx` muestra actualmente el encabezado:

- `Dashboard gerencial · Control de producción`
- `Salud del flujo de trabajo`
- `Atrasos, velocidad de entrega, finalización y posibles bloqueos.`

Las cuatro tarjetas visibles son compactas y mantienen la identidad visual del sistema. Usan una columna en móvil, 2 × 2 desde `sm` y cuatro columnas desde `xl`.

#### Tareas atrasadas

- Valor principal: `overdueTaskCount`.
- La antigüedad máxima se deriva de las fechas reales presentes en `overdueTasks`.
- Si el contrato nuevo informa subtareas atrasadas, se muestran como contexto separado.
- La acción se muestra únicamente cuando existen tareas atrasadas.

#### Tiempo de ciclo promedio

- Usa el valor existente `averageCycleTimeDays`; no se cambió el cálculo de backend.
- `null` o ausencia de dato se presenta como `—` y `Sin datos suficientes`.
- Valores menores de un día se convierten visualmente a horas.
- Un valor redondeado por backend a cero se muestra como `< 0,1 d`, no como `0 d`.
- El texto contextual indica `Desde que inicia hasta que se completa`, que corresponde al historial utilizado por el backend.

#### Tasa de finalización

- Muestra porcentaje y numerador/denominador cuando existen.
- Definición vigente: subtareas completadas sobre el total de subtareas incluidas por el filtro.
- Existe compatibilidad temporal con el contrato viejo: los conteos se reconstruyen desde la distribución del flujo cuando el backend activo aún no devuelve los campos nuevos.
- Si el denominador es cero se muestra ausencia de datos, no un cero engañoso.
- La acción de detalle solo aparece sin filtros activos porque el modal heredado todavía no es completamente consciente del contexto filtrado.

#### Posibles cuellos de botella

- Conserva `bottleneckCount` y agrupa los elementos reales por estado.
- La etiqueta dice `Posibles cuellos de botella` porque la regla actual no demuestra una acumulación temporal real.
- La acción aparece únicamente cuando el conteo es mayor que cero.

### 2.5. Carga y disponibilidad del equipo

El rediseño que ya permanece en `ManagerDashboard.tsx`:

- mantiene visibles a las personas sin tareas ni subtareas activas;
- muestra `Disponible para nuevas asignaciones` en lugar de `0%`;
- separa tareas y subtareas activas/completadas;
- muestra estados activos sin ocultar las completadas;
- muestra atrasos únicamente cuando existen;
- muestra avance promedio únicamente cuando hay trabajo activo;
- conserva la expansión de detalles y la reasignación de tareas existente.

## 3. Estado actual del backend

### 3.1. Endpoint y contrato

`Controllers/DashboardController.cs` recibe opcionalmente `DashboardFilterDto` mediante query string.

Parámetros soportados:

- `clientCompanyId`
- `projectId`
- `subProjectId`
- `departmentId`
- `responsibleUserId`

Sin parámetros, `/api/dashboard` conserva el resumen general.

`DTOs/Dashboard/DashboardDto.cs` incorpora el DTO de filtros y los campos KPI:

- `overdueSubTaskCount`
- `completedSubTaskCount`
- `totalSubTaskCount`
- `atRiskProjectCount`
- `atRiskSubProjectCount`
- `availablePersonCount`

### 3.2. Aplicación de filtros

`Services/DashboardService.cs` centraliza el contexto mediante `MatchesFilter` y `MatchesHierarchyFilter`.

- Las tareas padre y las subtareas se filtran por separado.
- Los filtros respetan Cliente → Proyecto → Subproyecto.
- Área se resuelve desde el subproyecto.
- Responsable se aplica sobre el responsable real de cada unidad de trabajo.
- Se usan identificadores distintos para evitar duplicar unidades por relaciones o joins.

### 3.3. Definiciones vigentes de KPI

#### Finalización

`subtareas completadas / total de subtareas filtradas`.

No representa tareas padre ni una planificación temporal. El periodo todavía no se aplica.

#### Atrasos

- Tareas atrasadas: tareas padre vencidas y no completadas.
- Subtareas atrasadas: subtareas vencidas y no completadas.
- Se devuelven en conteos separados para no sumar unidades conceptualmente distintas en una cifra ambigua.

#### Proyectos y subproyectos en riesgo

Reutiliza la regla de salud de subproyecto ya existente:

- tiene una subtarea atrasada; o
- el subproyecto venció y su progreso es menor a 100%.

Los proyectos se cuentan de forma distinta a partir de los subproyectos en riesgo. Esta información existe en el contrato, pero no reemplazó las cuatro tarjetas solicitadas actualmente.

#### Personas disponibles

Una persona está disponible solamente si globalmente tiene:

- cero tareas padre activas; y
- cero subtareas activas.

Los filtros de Área y Responsable limitan el conjunto de personas evaluadas. Cliente, Proyecto y Subproyecto no convierten falsamente en disponible a alguien que tenga trabajo activo fuera del filtro seleccionado.

#### Tiempo de ciclo promedio

Conserva la lógica existente basada en el historial desde el inicio del trabajo hasta su finalización. El backend devuelve días redondeados a una décima, por lo que no siempre es posible recuperar las horas exactas de ciclos muy cortos.

#### Posibles cuellos de botella

La regla heredada cuenta subtareas en estados `En revisión` o `Pausada`. No considera antigüedad, acumulación anormal ni umbral de permanencia. Por eso la interfaz no lo presenta como un cuello de botella confirmado.

### 3.4. Secciones que todavía no responden completamente a filtros

Por alcance, las demás secciones del dashboard permanecen mayormente generales. Las listas de detalle de atrasos y posibles cuellos de botella usan los conjuntos filtrados, pero todavía no se conectaron de forma sistemática:

- Clientes
- Proyectos
- Subproyectos
- Productividad por área
- Distribución del flujo completa
- Vencimientos
- Trabajo estancado
- Tendencias

## 4. Archivos modificados que forman parte del estado vigente

### Frontend

- `app/dashboard/page.tsx`
- `components/dashboard/DashboardFiltersBar.tsx`
- `components/dashboard/ManagerDashboard.tsx`
- `context/DashboardFiltersContext.tsx`
- `services/dashboard.service.ts`
- `types/dashboard.types.ts`
- `docs/CODEX_DASHBOARD_HANDOFF.md`

### Backend

- `C:\Users\jose1\RiderProjects\AgencyFlow\AgencyFlow\Controllers\DashboardController.cs`
- `C:\Users\jose1\RiderProjects\AgencyFlow\AgencyFlow\DTOs\Dashboard\DashboardDto.cs`
- `C:\Users\jose1\RiderProjects\AgencyFlow\AgencyFlow\Services\DashboardService.cs`
- `C:\Users\jose1\RiderProjects\AgencyFlow\AgencyFlow\docs\BACKEND_HANDOFF.md`

## 5. Verificaciones realizadas

Frontend, ejecutado el 27 de agosto de 2026:

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
```

Resultado: las tres comprobaciones terminaron correctamente. El build generó `/dashboard` sin errores.

Backend, ejecutado durante la implementación anterior:

- La compilación hacia una carpeta temporal terminó con 0 errores y 0 advertencias.
- La salida normal estaba bloqueada por el proceso activo del backend, PID 28872.
- `dotnet test` terminó con código 0, pero no se encontró una suite/proyecto de pruebas útil.

No se completó una validación visual exhaustiva con navegador en todos los breakpoints. La ausencia de scroll horizontal se revisó a nivel de estructura responsive y compilación, pero debe confirmarse en ejecución real.

## 6. Incidente de ejecución ya corregido

El frontend dejó de levantar correctamente porque el proceso de backend seguía ejecutando un binario antiguo. Ese contrato no devolvía algunos campos KPI nuevos y `ManagerDashboard` intentaba usar uno de ellos directamente.

Se añadió compatibilidad defensiva en el frontend para el contrato anterior. Después del ajuste, `/dashboard` respondió HTTP 200 y no aparecieron nuevos errores de ejecución en el log del servidor de desarrollo.

Esta compatibilidad no sustituye el reinicio del backend: el proceso activo debe reiniciarse para cargar el contrato y los cálculos nuevos.

## 7. Trabajo pendiente, en orden recomendado

1. Reiniciar el backend y confirmar que la instancia activa devuelve todos los campos KPI nuevos.
2. Hacer pruebas autenticadas de `/dashboard` y de la interfaz con:
   - sin filtros;
   - Cliente;
   - Cliente + Proyecto;
   - Cliente + Proyecto + Subproyecto;
   - Área;
   - Responsable;
   - combinaciones válidas.
3. Revisar en la pestaña de red que cada cambio de filtros produzca una sola solicitud efectiva y que una respuesta obsoleta no reemplace datos nuevos.
4. Probar visualmente móvil, tablet y desktop, incluida navegación por teclado, foco, contraste y ausencia de scroll horizontal.
5. Definir con negocio una regla real de cuello de botella. Debe considerar permanencia, acumulación o un umbral acordado; no implementar uno arbitrario.
6. Definir la semántica del periodo: fecha de inclusión, fecha de completado, denominador de trabajo planificado, zona horaria y comportamiento de atrasos. Solo entonces habilitar el filtro temporal.
7. Si se requieren horas exactas en tiempo de ciclo, aumentar la precisión del contrato de backend o devolver minutos/horas; actualmente el redondeo a décimas de día pierde información.
8. Hacer que el modal de detalle de finalización reciba el mismo contexto de filtros antes de habilitar su acción con filtros activos.
9. Conectar las demás secciones al contexto compartido una por una y únicamente con autorización para la siguiente fase.
10. Añadir pruebas automatizadas de backend para jerarquía, responsable, área, disponibilidad y prevención de duplicados.

## 8. Precauciones para continuar

- No reemplazar la tasa de finalización por una fórmula distinta sin cambiar explícitamente su definición de negocio.
- No sumar tareas y subtareas atrasadas en una única cifra sin explicar que son unidades distintas.
- No declarar disponible a una persona basándose solo en el contexto visible o en un progreso de 0%.
- No considerar automáticamente toda subtarea en revisión como cuello de botella confirmado.
- No habilitar el periodo únicamente en la interfaz.
- No volver a consultar catálogos o crear lógica de filtros duplicada dentro de cada tarjeta.
- No rediseñar otras secciones si el alcance solicitado es únicamente encabezado y KPI.
- Mantener compatibilidad de `/api/dashboard` sin filtros.

## 9. Prompt listo para un nuevo chat de Codex

Copiar y pegar lo siguiente:

```text
Usa las skills `agencyflow-dashboard` y `frontend-design`.

Continúa el dashboard gerencial de AgencyFlow desde el estado documentado en:
`docs/CODEX_DASHBOARD_HANDOFF.md`.

Antes de modificar código:
1. lee el documento completo;
2. inspecciona los archivos que menciona;
3. verifica si el backend activo ya devuelve el contrato KPI nuevo;
4. no repitas cambios que ya quedaron implementados;
5. conserva la compatibilidad sin filtros.

Primero completa las verificaciones pendientes del apartado 7. No continúes con
otra fase ni conectes nuevas secciones sin mi autorización.

Al terminar, dime:
- qué estado encontraste;
- qué verificaste;
- qué problema real permanece;
- qué archivos modificaste;
- qué comandos ejecutaste.
```

