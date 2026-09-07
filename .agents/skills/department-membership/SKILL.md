---
name: department-membership
description: Integra y mantiene áreas, integrantes y directores de AgencyFlow mediante Department y DepartmentUser.
---

# Áreas, integrantes y directores

Usa esta skill al construir o modificar pantallas, servicios o formularios que administren áreas y sus integrantes. Un área es un `Department`; su membresía es un `DepartmentUser`.

## Reglas de dominio

- Una persona puede pertenecer a varias áreas, pero solo una vez a cada área.
- `DepartmentUser.isDirector` identifica si la persona dirige **esa área**. Nunca se debe inferir desde `userRoleName`.
- Un área puede tener cero, uno o varios directores.
- `isDirector: true` solo es válido para personas cuyo rol se llama exactamente `Director`.
- Quitar una membresía no elimina al usuario ni al área.

## Endpoints y contratos

Todos requieren `Authorization: Bearer <token JWT>`.

| Operación | Endpoint | Regla relevante |
| --- | --- | --- |
| Listar áreas | `GET /api/departments?page=1&pageSize=100` | Usar `items[].id` como `departmentId`. |
| Buscar rol Director | `GET /api/roles?page=1&pageSize=100` | Localizar el rol con `name === "Director"`. |
| Listar candidatos a director | `GET /api/users?page=1&pageSize=100&roleId={directorRoleId}` | Mostrar solo estos usuarios al crear/ascender directores. |
| Listar membresías | `GET /api/department-users?page=1&pageSize=100&departmentId={id}` | También admite `userId` e `isDirector`; los filtros se combinan. |
| Crear membresía | `POST /api/department-users` | Enviar `userId`, `departmentId` e `isDirector`. |
| Actualizar membresía | `PUT /api/department-users/{departmentUserId}` | Enviar los tres campos completos; usar el ID de la asignación, no el `userId`. |
| Quitar membresía | `DELETE /api/department-users/{departmentUserId}` | Éxito: 204 sin contenido. |

La respuesta de listado de membresías es paginada. Carga todas las páginas si la interfaz debe mostrar la lista completa.

## Flujo de la pantalla de área

1. Carga el área con `GET /api/departments/{id}`.
2. Carga sus membresías por `departmentId` y divide visualmente por `isDirector`.
3. Para añadir o ascender un director, consulta antes los usuarios con rol `Director`.
4. Para varios directores, envía un `POST` por persona con el mismo `departmentId` e `isDirector: true`.
5. Tras `POST`, `PUT` o `DELETE`, vuelve a cargar las membresías.

## Estados y errores que la UI debe tratar

- `400`: un usuario sin rol Director no puede enviarse con `isDirector: true`; mostrar el mensaje de API.
- `400`: usuario o departamento inexistente; mostrar el mensaje de API.
- `409`: la persona ya pertenece al área; evitar duplicados en UI y mostrar el mensaje de API.
- `401`: token ausente o inválido; seguir el manejo global de autenticación.
- `404`: la asignación `DepartmentUser` no existe para acciones por ID; refrescar la lista y comunicarlo.

No optimices estas reglas sustituyendo `isDirector` por el rol global del usuario: una persona con rol Director puede ser integrante normal en un área.
