# Contrato API: Gantt

La API debe resolver permisos y alcance antes de construir el árbol. El frontend no filtra ni inventa visibilidad: solo representa los nodos recibidos.

## Endpoints

- `GET /api/projects/{id}/gantt` devuelve el proyecto solicitado como raíz, con `subproject`, `task` y `subtask` anidados.
- `GET /api/subprojects/{id}/gantt` devuelve el subproyecto solicitado como raíz, con `task` y `subtask` anidados.

Ambos responden `200 OK` con un único `GanttNode` y usan los códigos de autorización y existencia actuales de la API (`401`, `403`, `404`). Los nodos no visibles para el usuario autenticado no deben aparecer, ni siquiera como contadores o nodos vacíos.

```ts
type GanttNode = {
  id: string;
  type: "project" | "subproject" | "task" | "subtask";
  title: string;
  startDate: string | null; // YYYY-MM-DD, fecha local sin hora
  endDate: string | null;  // null significa “sin fecha de fin”
  status: string;
  responsibleName: string | null;
  progressPercentage: number | null; // 0 a 100 cuando se conoce
  children: GanttNode[];
};
```

`endDate: null` no debe sustituirse por la fecha actual ni por una fecha estimada. La UI lo mostrará como “Sin fecha de fin” y no dibujará una barra con duración inventada. `children` siempre está presente, incluso en una hoja.

El proyecto y el subproyecto derivan su intervalo de las fechas reales de sus
tareas y subtareas visibles: el inicio más temprano y el fin más tardío. Solo los
descendientes que tienen ambas fechas forman parte de ese intervalo. Si no existe
ningún intervalo completo, ambos valores son `null`; el frontend muestra “Sin
fechas asignadas” y no dibuja una barra ficticia.

El contrato no requiere enviar permisos, IDs de responsables, detalles de edición ni métricas adicionales. El frontend consulta estos endpoints mediante `ganttService`. Si el endpoint Gantt responde `404` o `501` y el detalle base existe, muestra “Pendiente de API”; otros errores ofrecen reintento.
