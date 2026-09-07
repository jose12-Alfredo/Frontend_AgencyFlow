# API de permisos por rol

Todas las rutas salvo `POST /api/users/login` requieren `Authorization: Bearer <JWT>`. El backend obtiene actor y rol exclusivamente de los claims `NameIdentifier` y `Role`.

## Modelo

| Rol | Permisos |
|---|---|
| SuperUsuario, Gerente | Lectura/escritura completas; administran usuarios, roles, areas, clientes y accesos. |
| Director | Solo proyectos concedidos; dentro de ellos solo trabajo de areas con `DepartmentUser` activo e `isDirector=true`. Crea integrantes Operativo 1, Operativo 2 o Pasante en esas areas. |
| Otros roles | Sin endpoints administrativos o de direccion. |

Acceso a proyecto y direccion de area son independientes. Las colecciones se filtran en base de datos antes de contar y paginar. El detalle completo omite subproyectos de areas no dirigidas.

## Endpoints

| Metodo y ruta | Roles | Parametros/cuerpo |
|---|---|---|
| GET `/api/projects` | Administrativos, Director | `page` 1+, `pageSize` 1..100, `titulo`, `projectTypeId`, `clientUserId`, `startDateFrom`, `startDateTo` |
| GET `/api/projects/{id}` y `/{id}/full` | Administrativos o Director autorizado | GUID |
| POST/PUT/DELETE `/api/projects[/{id}]` | Administrativos | DTO de proyecto |
| GET/POST/PUT/DELETE `/api/subprojects[/{id}]` | Administrativos o Director con proyecto+area | GET: `page,pageSize,titulo,projectId,departmentId,status,assignedUserId` |
| GET/POST/PUT/DELETE `/api/tasks[/{id}]` | Igual | GET: `page,pageSize,titulo,clientCompanyId,projectId,subProjectId,status,assignedUserId` |
| PATCH `/api/tasks/{id}/assignee` | Igual | `{assignedUserId}` (GUID o null) |
| GET/POST/PUT/DELETE `/api/subtasks[/{id}]` | Igual | GET: `page,pageSize,titulo,taskItemId,status,assignedUserId` |
| PATCH `/api/subtasks/{id}/assignee` | Igual | `{assignedUserId}` (GUID o null) |
| GET/POST `/api/subtasks/{subTaskId}/comments` | Igual | POST `{content}` |
| DELETE `/api/subtasks/{subTaskId}/comments/{commentId}` | Igual; conserva regla de autor | GUIDs |
| GET/POST `/api/project-director-accesses` | Gerente, SuperUsuario | GET: `page,pageSize,projectId,directorUserId`; POST abajo |
| DELETE `/api/project-director-accesses/{id}` | Gerente, SuperUsuario | ID del acceso |
| POST `/api/director/team-members` | Director | Alta atomica abajo |
| CRUD `/api/users`, `/api/roles`, `/api/departments`, `/api/department-users`, `/api/client-companies`, `/api/project-types` | Gerente, SuperUsuario | Filtros/DTO existentes |
| `/api/dashboard`, `/api/dashboard/clients/{clientId}/hierarchy`, `/api/productivity/delays` | Gerente, SuperUsuario | Filtros existentes |

## Conceder y revocar acceso

```json
POST /api/project-director-accesses
{"projectId":"66666666-6666-6666-6666-666666666601","directorUserId":"44444444-4444-4444-4444-444444444402"}
```

Respuesta `201`:

```json
{"id":"bdb2e8f5-9a1e-4e38-9a58-571984378b23","projectId":"66666666-6666-6666-6666-666666666601","projectTitle":"Campana de lanzamiento Honor X10","directorUserId":"44444444-4444-4444-4444-444444444402","directorName":"Vanet Garcia","grantedByUserId":"44444444-4444-4444-4444-444444444401","createdAt":"2026-08-31T16:40:43Z"}
```

`GET /api/project-director-accesses?page=1&pageSize=10&projectId={guid}`:

```json
{"totalItems":1,"page":1,"pageSize":10,"items":[{"id":"bdb2e8f5-9a1e-4e38-9a58-571984378b23","projectId":"66666666-6666-6666-6666-666666666601","projectTitle":"Campana de lanzamiento Honor X10","directorUserId":"44444444-4444-4444-4444-444444444402","directorName":"Vanet Garcia","grantedByUserId":"44444444-4444-4444-4444-444444444401","createdAt":"2026-08-31T16:40:43Z"}]}
```

`DELETE /api/project-director-accesses/{accessId}` devuelve `204` y hace borrado logico. Solo puede existir un acceso activo por proyecto+director.

## Crear integrante

```json
POST /api/director/team-members
{"firstName":"Eva","lastName":"Lopez","phone":"+59170000000","email":"eva@agency.test","password":"clave-segura","roleId":"11111111-1111-1111-1111-111111111106","clientCompanyId":null,"departmentId":"22222222-2222-2222-2222-222222222203"}
```

Respuesta `201`:

```json
{"id":"70e8f8cd-42f8-43be-bbd9-52a58d967444","firstName":"Eva","lastName":"Lopez","phone":"+59170000000","email":"eva@agency.test","roleId":"11111111-1111-1111-1111-111111111106","roleName":"Pasante","clientCompanyId":null,"clientCompanyName":null}
```

Usuario y pertenencia `isDirector=false` se guardan juntos. El area debe ser dirigida por el actor. Roles permitidos: Operativo 1, Operativo 2, Pasante.

## Asignar trabajo

```json
PATCH /api/tasks/88888888-8888-8888-8888-888888888801/assignee
{"assignedUserId":"44444444-4444-4444-4444-444444444409"}
```

Responde `200` con el `TaskItemDto` completo. Un Director solo asigna usuarios activos, no Cliente, con pertenencia activa al area. Administrativos asignan cualquier usuario activo no Cliente. `null` desasigna; trabajo sin responsable solo puede quedar Pendiente.

## Errores y restricciones

```json
// 400
{"message":"El responsable indicado no pertenece al equipo activo del area."}
// 401
{"message":"Autenticacion requerida o token invalido."}
// 403
{"message":"No tiene permiso para realizar esta accion."}
// 404
{"message":"El acceso indicado no existe."}
// 409
{"message":"El director ya tiene acceso activo al proyecto."}
```

Otros `400`: modelo invalido, correo invalido, contrasena menor a 8 caracteres, rol/proyecto/area inexistente. `page >= 1`; `pageSize` 1..100. Un usuario no puede tener dos pertenencias activas a la misma area.

## Frontend

Pantallas afectadas: sesion/interceptor, proyectos y detalle completo, subproyectos, tareas, subtareas, comentarios, selectores de responsables, equipo, areas/directores, accesos, dashboards y productividad. Botones administrativos solo para Gerente/SuperUsuario. Director muestra acciones de trabajo solo en alcance y “Crear integrante” desde areas dirigidas.

En `401`, limpiar sesion y redirigir a login. En `403`, conservar sesion y mostrar `message`. La visibilidad de botones es UX, no seguridad. La paginacion usa `totalItems/page/pageSize` ya autorizados.

Criterios: ninguna llamada protegida sin Bearer; Director no ve datos fuera de alcance; selector de responsable usa miembros activos del area; se distinguen 400/401/403/404/409; revocar retira el proyecto al refrescar; alta atomica aparece en el area; acciones administrativas no aparecen para otros roles.
