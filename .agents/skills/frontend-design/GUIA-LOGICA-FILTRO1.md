# Coordinación frontend: asignación de tareas y subtareas

## Regla de negocio

Un usuario cuyo `roleName` sea exactamente `Cliente` no puede ser responsable
de una tarea ni de una subtarea. La asignación puede quedar vacía (`null`).

El backend aplica esta regla aunque el cliente HTTP envíe manualmente el ID de
un cliente. Por ello, el filtrado de la interfaz es una ayuda de uso y no el
mecanismo de seguridad.

## Contrato disponible

No se modificaron los cuerpos de las solicitudes ni las respuestas. En los
flujos siguientes, `assignedUserId` acepta el GUID de un usuario interno o
`null`:

| Recurso | Operación |
| --- | --- |
| Tarea | `POST /api/tasks` |
| Tarea | `PUT /api/tasks/{id}` |
| Tarea | `PATCH /api/tasks/{id}/assignee` con `{ "assignedUserId": "guid-o-null" }` |
| Subtarea | `POST /api/subtasks` |
| Subtarea | `PUT /api/subtasks/{id}` |

Para cargar las opciones del selector de responsable, usar `GET /api/users`.
Cada elemento contiene, entre otros, `id`, `firstName`, `lastName` y
`roleName`. No usar `GET /api/users/clients`, pues ese endpoint devuelve
precisamente los usuarios que no son elegibles.

## Comportamiento que debe implementar el frontend

1. Al construir el selector de responsable de tareas y subtareas, excluir los
   usuarios cuyo `roleName === "Cliente"`.
2. Mantener una opción explícita como **Sin responsable**, que envíe
   `assignedUserId: null`; no convertirla en una cadena vacía.
3. Aplicar el mismo filtro tanto al crear como al editar, y en cualquier
   interfaz de reasignación rápida de tareas.
4. Si un registro histórico llega con un responsable que ahora es cliente,
   mostrarlo sin seleccionarlo como opción válida y pedir elegir un usuario
   interno o dejarlo sin responsable. La migración de backend ya normaliza las
   asignaciones antiguas a `null`, pero este manejo evita errores visuales ante
   datos desactualizados.
5. No asumir que el filtro de la interfaz sustituye la validación del servidor.

## Respuesta ante rechazo

Si se intenta enviar un cliente como responsable, el backend responde HTTP
`400 Bad Request` con este cuerpo:

```json
{
  "message": "El responsable indicado no pertenece al equipo activo."
}
```

La interfaz debe mostrar `message` cerca del selector o como notificación y
conservar el formulario para que la persona elija otra opción. Este mismo error
también cubre un usuario inexistente, eliminado o con rol eliminado; no debe
mostrarse como un error técnico genérico.

## Criterios de coordinación

- Un usuario interno activo se puede asignar y la API responde `201` al crear
  o `200` al actualizar.
- Un cliente no debe aparecer en el selector; si se fuerza su GUID, la API
  responde `400` con el mensaje anterior.
- `assignedUserId: null` es válido y debe poder guardarse correctamente.
- La regla no cambia la autorización por roles de la aplicación: las rutas
  requieren JWT, pero la elegibilidad del responsable se determina por
  `roleName`, no por el rol del usuario que realiza la petición.
