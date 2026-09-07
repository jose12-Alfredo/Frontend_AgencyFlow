INTEGRACION FRONTEND - AREAS, INTEGRANTES Y DIRECTORES
=====================================================

Resumen
-------
Un area se representa como un Department.
La pertenencia de una persona a un area se representa como un DepartmentUser.
El campo booleano isDirector indica si esa persona es director dentro de esa area.

Un area puede tener cero, uno o varios directores.
Una persona puede pertenecer a varias areas.
Una misma persona no puede registrarse dos veces en la misma area.
Para enviar isDirector: true, el usuario debe tener el rol llamado "Director".

Todos los endpoints indicados, excepto el login, requieren un token de Gerente o
SuperUsuario:
Authorization: Bearer <token JWT>


1. OBTENER LAS AREAS DISPONIBLES
--------------------------------

GET /api/departments?page=1&pageSize=100

Respuesta:
{
"totalItems": 2,
"page": 1,
"pageSize": 100,
"items": [
{
"id": "GUID_DEL_AREA",
"name": "Digital",
"description": "Estrategia y ejecucion digital"
}
]
}

El frontend debe usar items[].id como departmentId.


2. OBTENER USUARIOS QUE PUEDEN SER DIRECTORES
----------------------------------------------

Primero se obtiene el rol Director:

GET /api/roles?page=1&pageSize=100

Buscar en items el objeto cuyo name sea "Director" y guardar su id.

Luego consultar usuarios con ese rol:

GET /api/users?page=1&pageSize=100&roleId=GUID_DEL_ROL_DIRECTOR

El frontend debe mostrar estos usuarios como opciones cuando isDirector sea true.


3. REGISTRAR UNA PERSONA EN UN AREA
-----------------------------------

POST /api/department-users
Content-Type: application/json

Integrante normal:
{
"userId": "GUID_DEL_USUARIO",
"departmentId": "GUID_DEL_AREA",
"isDirector": false
}

Director del area:
{
"userId": "GUID_DEL_USUARIO_DIRECTOR",
"departmentId": "GUID_DEL_AREA",
"isDirector": true
}

Respuesta exitosa: HTTP 201

{
"id": "GUID_DE_LA_ASIGNACION",
"userId": "GUID_DEL_USUARIO",
"userFirstName": "Ana",
"userLastName": "Perez",
"userRoleName": "Director",
"departmentId": "GUID_DEL_AREA",
"departmentName": "Digital",
"isDirector": true
}

Para registrar varios directores en la misma area se realiza una peticion POST por
cada usuario, usando el mismo departmentId e isDirector: true.


4. CONSULTAR PERSONAS Y DIRECTORES DE UN AREA
---------------------------------------------

Todos los miembros del area:
GET /api/department-users?page=1&pageSize=100&departmentId=GUID_DEL_AREA

Solo los directores del area:
GET /api/department-users?page=1&pageSize=100&departmentId=GUID_DEL_AREA&isDirector=true

Solo los integrantes que no son directores:
GET /api/department-users?page=1&pageSize=100&departmentId=GUID_DEL_AREA&isDirector=false

Consultar las areas de una persona:
GET /api/department-users?page=1&pageSize=100&userId=GUID_DEL_USUARIO

Los filtros userId, departmentId e isDirector se pueden combinar.
La respuesta siempre es paginada:

{
"totalItems": 2,
"page": 1,
"pageSize": 100,
"items": [
{
"id": "GUID_DE_LA_ASIGNACION",
"userId": "GUID_DEL_USUARIO",
"userFirstName": "Ana",
"userLastName": "Perez",
"userRoleName": "Director",
"departmentId": "GUID_DEL_AREA",
"departmentName": "Digital",
"isDirector": true
}
]
}


5. CAMBIAR EL TIPO DE PERTENENCIA
---------------------------------

Para ascender un integrante a director o dejar de marcarlo como director se usa el
id de la asignacion DepartmentUser, no el userId:

PUT /api/department-users/GUID_DE_LA_ASIGNACION
Content-Type: application/json

{
"userId": "GUID_DEL_USUARIO",
"departmentId": "GUID_DEL_AREA",
"isDirector": true
}

El PUT requiere enviar los tres campos completos.
Si isDirector es true, el usuario debe tener rol Director.


6. QUITAR UNA PERSONA DE UN AREA
--------------------------------

DELETE /api/department-users/GUID_DE_LA_ASIGNACION

Respuesta exitosa: HTTP 204 sin contenido.
Esta operacion quita la pertenencia completa. No elimina el usuario ni el area.


7. RESPUESTAS DE ERROR IMPORTANTES
----------------------------------

HTTP 400 - El usuario no tiene rol Director al enviar isDirector: true:
{
"message": "Solo un usuario con rol Director puede ser director de un departamento."
}

HTTP 400 - Usuario o area inexistente:
{
"message": "El usuario indicado no existe."
}

o:
{
"message": "El departamento indicado no existe."
}

HTTP 409 - La persona ya esta registrada en esa area:
{
"message": "El usuario ya pertenece a ese departamento."
}

HTTP 401 - Falta el token o el token no es valido.
HTTP 403 - El token es valido, pero el rol no puede administrar areas.
HTTP 404 - No existe la asignacion solicitada en GET, PUT o DELETE por id.


FLUJO RECOMENDADO PARA LA PANTALLA DE UN AREA
---------------------------------------------

1. Cargar el area desde GET /api/departments/{id}.
2. Cargar todos sus miembros con GET /api/department-users?departmentId={id}.
3. Separar visualmente los resultados usando el campo isDirector.
4. Para agregar un director, mostrar solamente usuarios con rol Director.
5. Enviar POST /api/department-users con isDirector: true.
6. Refrescar la lista de miembros despues de POST, PUT o DELETE.

No se debe deducir que alguien dirige un area solamente por su roleName. La fuente
correcta para esa area concreta siempre es isDirector dentro de DepartmentUser.


8. ACCESOS DE DIRECTORES A PROYECTOS
------------------------------------

Dirigir un area no concede acceso a ningun proyecto. Gerente/SuperUsuario deben
administrarlo por separado:

GET /api/project-director-accesses?page=1&pageSize=100&directorUserId=GUID

POST /api/project-director-accesses
{
"projectId": "GUID_DEL_PROYECTO",
"directorUserId": "GUID_DEL_DIRECTOR"
}

DELETE /api/project-director-accesses/GUID_DEL_ACCESO

POST responde 201, duplicado activo responde 409 y DELETE responde 204. Para
operar sobre trabajo, un Director necesita simultaneamente acceso al proyecto y
DepartmentUser activo con isDirector=true en el area. Contrato completo en
docs/ROLEPERMISO.md.
