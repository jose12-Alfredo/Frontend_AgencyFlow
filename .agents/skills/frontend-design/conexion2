# API de jerarquía de cliente para dashboard

## Propósito

Expone bajo demanda el árbol navegable de un cliente para el dashboard
gerencial: Cliente → Proyecto → Subproyecto/área → Tarea → Subtarea. No forma
parte de la carga de `GET /api/dashboard` general.

## Ruta y autenticación

```http
GET /api/dashboard/clients/{clientId}/hierarchy?year=2026&month=8
Authorization: Bearer <JWT>
```

Requiere la misma autenticación JWT que el resto del dashboard.

### Parámetros

| Parámetro | Obligatorio | Regla |
| --- | --- | --- |
| `clientId` | Sí | GUID de una empresa cliente activa. |
| `year` | Sí | Entero de 2000 a 9999. |
| `month` | Sí | Entero de 1 a 12. |
| `departmentId` | No | Limita los subproyectos al área indicada. |
| `responsibleUserId` | No | Limita tareas/subtareas al responsable, preservando padres de contexto. |

## Regla mensual única

Un proyecto, subproyecto, tarea o subtarea pertenece al mes si su intervalo
planificado se solapa con él:

```text
startDate <= último día del mes
AND (endDate es null OR endDate >= primer día del mes)
```

Así, el trabajo abierto iniciado antes del mes permanece visible en ese mes.

## Progreso

- Subtarea: `100` solo con estado `Completada`; en otro estado `0`.
- Tarea con subtareas retornadas: promedio de subtareas completadas.
- Tarea sin subtareas retornadas: `ownProgressPercentage`.
- Subproyecto, proyecto y cliente: promedio simple de sus hijos calculables.
- Cuando no existe ningún elemento calculable, el progreso es `null`, nunca
  `0` artificial.

## Respuesta

```json
{
  "clientId": "33333333-3333-3333-3333-333333333301",
  "clientName": "Tigo",
  "representativeUserId": "44444444-4444-4444-4444-444444444401",
  "representativeUserName": "Gabriel Aguilar",
  "progressPercentage": 72,
  "projects": [
    {
      "projectId": "66666666-6666-6666-6666-666666666601",
      "title": "Campaña Q3",
      "progressPercentage": 65,
      "assignedUserId": null,
      "assignedUserName": null,
      "subProjects": [
        {
          "subProjectId": "77777777-7777-7777-7777-777777777701",
          "title": "Diseño de piezas",
          "departmentId": "22222222-2222-2222-2222-222222222201",
          "departmentName": "Diseño",
          "progressPercentage": 75,
          "tasks": [
            {
              "taskId": "88888888-8888-8888-8888-888888888801",
              "title": "Banner principal",
              "status": "En curso",
              "progressPercentage": 60,
              "assignedUserId": "44444444-4444-4444-4444-444444444401",
              "assignedUserName": "Gabriel Aguilar",
              "subTasks": [
                {
                  "subTaskId": "99999999-9999-9999-9999-999999999901",
                  "title": "Adaptación Instagram",
                  "status": "Pendiente",
                  "progressPercentage": 0,
                  "assignedUserId": null,
                  "assignedUserName": null
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

Todas las colecciones (`projects`, `subProjects`, `tasks`, `subTasks`) son
arreglos: cuando no hay hijos se devuelve `[]`. `null` en responsable significa
**Sin responsable**; el frontend debe mostrar esa etiqueta, no intentar
resolver un usuario. `roleName === "Cliente"` nunca es elegible como
responsable de tarea o subtarea.

El modelo actual no tiene responsable propio para `Project`; por eso sus
campos `assignedUserId` y `assignedUserName` se devuelven como `null` hasta
que se defina esa relación. El representante de cuenta es independiente y se
obtiene de `ClientCompany.RepresentativeUserId`.

## Errores

| Estado | Ejemplo |
| --- | --- |
| `400` | `{ "message": "year y month son obligatorios; month debe estar entre 1 y 12." }` |
| `404` | `{ "message": "El cliente indicado no existe o no está disponible." }` |
| `401` | JWT ausente o inválido. |

## Ejemplos frontend

```ts
await api.get(`/api/dashboard/clients/${clientId}/hierarchy`, {
  params: { year: 2026, month: 8, departmentId, responsibleUserId }
});
```

Al cambiar cliente, año, mes, área o responsable, invalidar la consulta y
volver a pedir el árbol. No calcular porcentajes ni cargar el árbol desde
`GET /api/dashboard` general.

## Datos y rendimiento

No requiere una migración nueva. La migración previa
`20260827123000_AddManagementDashboardActivity` agrega el representante
interno opcional; debe estar aplicada para exponerlo. El servicio utiliza un
número fijo de consultas por solicitud (empresa, proyectos, subproyectos y
tareas/subtareas), sin consultas por nodo.

## Verificación

```powershell
dotnet build .\AgencyFlow.sln --no-restore
dotnet test .\AgencyFlow.Tests\AgencyFlow.Tests.csproj
```

Las pruebas xUnit están en `AgencyFlow.Tests/ClientHierarchyTests.cs`. Cubren
cliente sin proyectos (arreglos vacíos y progreso `null`) y un árbol con área,
responsable interno, subtarea sin responsable y progreso jerárquico. La
implementación usa cuatro consultas por solicitud, independientemente de la
cantidad de nodos, para evitar N+1.
