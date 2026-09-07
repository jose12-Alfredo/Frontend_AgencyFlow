IMPLEMENTACION FRONTEND PASO A PASO - PERMISOS POR ROL
=====================================================

1. Guardar token y roleName de POST /api/users/login. Enviar Authorization: Bearer
   en toda ruta protegida. En 401 borrar sesion y volver a login; en 403 conservarla y
   mostrar response.message. Nunca convertir 403 en 404.

2. Matriz UI: Gerente/SuperUsuario ven CRUD administrativo, accesos, dashboards y
   productividad. Director ve proyectos/trabajo autorizado y alta de integrantes.
   Otros roles no ven acciones administrativas. El backend sigue siendo la autoridad.

3. Director consulta GET /api/projects?page=1&pageSize=10 y abre
   GET /api/projects/{id}/full. Renderizar solo lo recibido: subproyectos de otras
   areas se omiten. Usar totalItems para paginar.

4. Gerente/SuperUsuario administran directores de area: cargar /api/roles, localizar
   Director; cargar /api/users?roleId=... y /api/department-users?departmentId=...&
   isDirector=true. Crear con POST /api/department-users y
   {"userId":"GUID","departmentId":"GUID","isDirector":true}; quitar con DELETE.

5. Administrar proyectos por Director: listar GET /api/project-director-accesses?
   directorUserId=...; conceder POST con {projectId,directorUserId}; revocar DELETE con
   el id del acceso. En 409 informar duplicado y refrescar.

6. Director crea integrante desde un area dirigida con POST
   /api/director/team-members. Enviar firstName,lastName,phone,email,password,roleId,
   clientCompanyId:null,departmentId. Ofrecer solo Operativo 1, Operativo 2 y Pasante.
   El 201 confirma usuario y pertenencia atomicos.

7. Crear subproyecto con POST /api/subprojects usando proyecto visible y area
   dirigida. Para tareas/subtareas usar POST/PUT y para responsable PATCH
   /api/tasks/{id}/assignee o /api/subtasks/{id}/assignee con
   {"assignedUserId":"GUID"}. `null` desasigna. El selector solo incluye usuarios
   activos no Cliente pertenecientes al area del subproyecto.

8. Filtros nunca sustituyen seguridad. Enviar page>=1 y pageSize 1..100; reiniciar
   page=1 al cambiar filtros. Aceptar lista vacia. El backend filtra antes de total y
   paginacion.

9. Errores: 400 validacion/regla; 401 sesion; 403 permiso; 404 inexistente; 409
   duplicado. Leer siempre {"message":"..."}.

10. Aceptacion: Bearer en toda llamada; 401 cierra y 403 no; Director solo ve
    proyectos concedidos y areas dirigidas; revocacion surte efecto al refrescar;
    direccion de area no concede proyecto; alta usa endpoint atomico; responsables no
    incluyen clientes/ajenos; botones siguen matriz; totalItems ya refleja permisos.

Contratos completos y JSON: docs/ROLEPERMISO.md
