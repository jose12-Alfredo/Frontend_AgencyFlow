---
name: agencyflow-dashboard
description: >
  Reglas de diseño, arquitectura de información y UX para construir o modificar
  el dashboard gerencial de AgencyFlow. Usar cuando se trabaje con indicadores,
  productividad, clientes, proyectos, subproyectos, áreas, responsables, tareas,
  subtareas, atrasos, carga de trabajo, disponibilidad, distribución del flujo,
  riesgos, vencimientos o métricas gerenciales.
---

# AgencyFlow Dashboard Skill

## Propósito

El dashboard de AgencyFlow debe funcionar como un **centro de control gerencial de producción**.

No debe limitarse a mostrar estadísticas.

Debe permitir a gerencia:

- detectar problemas;
- identificar dónde ocurre un atraso;
- conocer qué cliente está afectado;
- identificar el proyecto afectado;
- identificar el subproyecto afectado;
- determinar qué área está generando o recibiendo carga;
- identificar al responsable;
- localizar la tarea o subtarea concreta;
- detectar personas disponibles;
- redistribuir trabajo;
- evaluar productividad;
- anticipar riesgos.

La prioridad siempre es facilitar la toma de decisiones.

# Modelo jerárquico

AgencyFlow utiliza esta jerarquía:

Cliente  
→ Proyecto  
→ Subproyecto  
→ Tarea  
→ Subtarea

No eliminar ni saltar niveles de esta jerarquía cuando sean necesarios para comprender el contexto.

Además existe una dimensión organizacional:

Subproyecto  
→ Área responsable

Tarea  
→ Responsable

Subtarea  
→ Responsable o responsables

Cuando se muestre un problema, conservar suficiente contexto para saber a qué nivel pertenece.

Ejemplo:

Cliente: Tigo  
Proyecto: Campaña Q3  
Subproyecto: Diseño de piezas  
Área: Diseño  
Responsable: Gabriel Aguilar  
Tarea: Banner principal

# Principio de drill-down

El dashboard debe permitir pasar progresivamente de información general a información específica.

El recorrido ideal es:

Empresa  
→ Cliente  
→ Proyecto  
→ Subproyecto  
→ Área  
→ Responsable  
→ Tarea  
→ Subtarea

Esto se denomina `drill-down` (profundización progresiva).

No mostrar todo el detalle simultáneamente.

La vista general debe detectar problemas.

El detalle debe explicar el problema.

# Prioridad de información

La información del dashboard debe priorizarse en este orden:

1. problemas críticos;
2. atrasos;
3. riesgos;
4. disponibilidad del equipo;
5. carga de trabajo;
6. proyectos afectados;
7. subproyectos afectados;
8. áreas afectadas;
9. responsables;
10. trabajo completado;
11. tendencias;
12. métricas secundarias.

No dar más protagonismo a métricas decorativas que a información accionable.

# Filtros globales

Cuando corresponda, el dashboard debe permitir filtrar por:

- cliente;
- proyecto;
- subproyecto;
- área;
- responsable;
- periodo.

Los filtros jerárquicos deben ser dependientes.

Ejemplo:

Si se selecciona:

Cliente: Tigo

el selector Proyecto debe mostrar únicamente proyectos pertenecientes a Tigo.

Si se selecciona:

Proyecto: Campaña Q3

el selector Subproyecto debe mostrar únicamente subproyectos de Campaña Q3.

No permitir combinaciones imposibles.

# KPI gerenciales

Los KPI principales deben ser pocos, claros y accionables.

Priorizar inicialmente:

- tasa de finalización;
- atrasos;
- proyectos o subproyectos en riesgo;
- personas disponibles.

Evaluar otros KPI únicamente cuando aporten una decisión gerencial.

Los valores deben incluir contexto cuando exista información disponible.

Ejemplo:

Finalización  
84%  
42 de 50 completadas

Atrasos  
6  
4 tareas · 2 subtareas

En riesgo  
3  
2 proyectos · 1 subproyecto

Disponibles  
4 personas  
Sin trabajo pendiente

No inventar valores.

# Ausencia de datos

Nunca representar ausencia de información como un valor real.

Ejemplo incorrecto:

Tiempo de ciclo promedio: 0 días

si realmente no existen datos suficientes.

Mostrar:

—

Sin datos suficientes

Si el valor real es menor a un día, utilizar una unidad adecuada.

Ejemplo:

8 h

en lugar de:

0 d

# Sección “Requiere atención”

Debe existir una zona prioritaria para situaciones que necesitan intervención.

Puede incluir:

- tareas atrasadas;
- subtareas atrasadas;
- proyectos en riesgo;
- subproyectos en riesgo;
- trabajo detenido;
- cuellos de botella;
- responsables sobrecargados;
- vencimientos próximos.

Cada problema debe conservar contexto.

Ejemplo:

Tigo  
Campaña Q3  
Diseño de piezas  
3 tareas atrasadas  
Área: Diseño

Evitar alertas genéricas como:

“3 tareas atrasadas”

sin indicar dónde están.

# Clientes

La sección de clientes debe ayudar a responder:

- qué clientes tienen mayor riesgo;
- cuáles tienen proyectos atrasados;
- qué porcentaje de avance tienen;
- cuántos proyectos activos tienen.

Priorizar clientes con problemas.

Los clientes saludables pueden tener menor énfasis visual.

# Proyectos

Nunca omitir el nivel Proyecto.

Cada proyecto debe poder mostrar:

- cliente;
- avance;
- cantidad de subproyectos;
- atrasos;
- estado;
- riesgos.

Los proyectos problemáticos deben aparecer primero cuando la vista sea gerencial.

# Subproyectos

Cada subproyecto debe poder mostrar:

- proyecto padre;
- cliente;
- área responsable;
- periodo;
- progreso;
- tareas activas;
- tareas completadas;
- atrasos;
- estado.

Priorizar subproyectos que requieren atención.

Evitar llenar el dashboard con largas listas de subproyectos estables.

Cuando existan muchos elementos saludables, resumirlos.

Ejemplo:

6 subproyectos estables  
Ver todos →

# Productividad por área

La gerencia debe poder analizar carga y problemas por área.

Mostrar cuando corresponda:

- tareas activas;
- subtareas activas;
- completadas;
- atrasadas;
- trabajo detenido;
- carga general.

No interpretar automáticamente mucha actividad como baja productividad.

Un área puede tener gran cantidad de trabajo porque recibe mayor volumen.

# Distribución del flujo

La distribución del flujo debe mostrar cómo se reparte el trabajo entre estados.

Ejemplo:

Pendiente  
En proceso  
En revisión  
Pausada  
Completada

La visualización debe responder a los filtros globales.

Si se selecciona un cliente, proyecto o área, mostrar únicamente ese contexto.

No utilizar una alerta visual fuerte cuando el valor sea cero.

Ejemplo:

Pausadas: 0

no debe mostrarse dentro de una gran franja amarilla.

# Cuellos de botella

No considerar automáticamente cualquier elemento “En revisión” como cuello de botella.

Un cuello de botella debe representar una acumulación o demora relevante.

Antes de modificar su lógica:

1. identificar cómo se calcula actualmente;
2. comprobar que el cálculo tenga sentido;
3. no inventar umbrales arbitrarios.

Si hace falta una nueva regla de negocio, documentarla antes de implementarla.

# Carga y disponibilidad del equipo

La sección debe permitir responder:

- quién está disponible;
- quién tiene poca carga;
- quién tiene carga media;
- quién tiene carga alta;
- quién está sobrecargado;
- quién tiene atrasos.

Por cada persona mostrar:

- tareas activas;
- tareas completadas;
- estados de tareas activas;
- subtareas activas;
- subtareas completadas;
- estados de subtareas activas;
- atrasos;
- disponibilidad.

Evitar duplicación.

No mostrar simultáneamente información equivalente como:

1 activa

y:

En proceso: 1

si ambos datos representan exactamente lo mismo.

# Usuarios sin trabajo activo

Los usuarios con:

0 tareas activas  
0 subtareas activas

deben seguir apareciendo.

No ocultarlos.

No mostrar:

0%

como si significara bajo rendimiento.

Mostrar:

Disponible para nuevas asignaciones

Pero conservar el trabajo completado.

Ejemplo:

Anto Pomacusi

Tareas: 0 activas · 6 completadas  
Subtareas: 0 activas · 14 completadas

Disponible para nuevas asignaciones

Esto permite distinguir entre:

- una persona que terminó su trabajo;
- una persona que nunca tuvo asignaciones.

# Nivel de carga

No calcular carga únicamente usando porcentaje de progreso.

Ejemplo:

Una tarea al 10% no necesariamente implica mayor carga que diez tareas al 90%.

La carga puede considerar:

- tareas activas;
- subtareas activas;
- atrasos;
- estimaciones;
- fechas;
- complejidad;

pero solamente si esos datos existen.

No inventar una fórmula arbitraria.

# Productividad

No medir productividad únicamente contando tareas completadas.

Ejemplo incorrecto:

20 tareas completadas = persona más productiva

Una tarea puede requerir 10 minutos y otra 3 días.

La productividad debe analizarse utilizando señales múltiples cuando estén disponibles:

- cumplimiento de fechas;
- trabajo completado;
- atrasos;
- tiempo de ciclo;
- carga;
- bloqueos;
- capacidad;
- complejidad.

No generar un “score de productividad” sin una metodología definida.

# Periodos

Toda métrica temporal debe indicar o respetar el periodo seleccionado.

Ejemplos:

Últimos 7 días  
Últimos 30 días  
Este mes  
Periodo personalizado

No mezclar estadísticas históricas con estadísticas del periodo actual sin indicarlo.

Las completadas mostradas en análisis comparativo deben respetar el periodo cuando exista un filtro temporal.

# Próximos vencimientos

Mostrar próximos vencimientos de forma compacta.

Ejemplo:

Hoy  
Honor X10 · Diseño de piezas · Gabriel

Mañana  
Adidas Running · Storyboard · Ariane

Si no existen vencimientos:

Sin vencimientos próximos

No usar una tarjeta grande únicamente para comunicar ausencia de eventos.

# Trabajo estancado

Mostrar trabajo sin movimiento cuando sea relevante.

Incluir:

- tarea;
- proyecto/subproyecto;
- área;
- responsable;
- días sin movimiento.

Ejemplo:

Banner Honor  
Diseño  
Gabriel  
5 días sin cambio

# Tendencias

Las tendencias deben responder:

¿Estamos mejorando o empeorando?

Ejemplos:

Finalización ↑  
Atrasos ↓  
Tiempo de ciclo ↓  
Trabajo completado ↑

No agregar tendencias si no existen datos históricos suficientes.

# Diseño visual

Usar principios de `frontend-design`.

Priorizar:

- jerarquía visual;
- densidad informativa;
- lectura rápida;
- consistencia;
- accesibilidad;
- diseño responsive.

Evitar:

- tarjetas demasiado altas;
- grandes espacios vacíos;
- demasiados badges;
- colores decorativos;
- gradientes sin propósito;
- sombras excesivas;
- duplicación de información;
- texto demasiado pequeño;
- animaciones innecesarias.

# Semántica de color

Utilizar colores de manera consistente.

Rojo  
→ atraso, problema crítico

Ámbar  
→ atención, riesgo

Azul  
→ información, proceso

Verde  
→ saludable, completado, disponible cuando corresponda

Gris  
→ neutral, inactivo, ausencia de datos

No depender solamente del color.

También utilizar:

- texto;
- iconos;
- etiquetas.

# Estados saludables

No dar el mismo peso visual a estados saludables y problemáticos.

Ejemplo:

Estable  
Estable  
Estable  
Estable

genera ruido.

Priorizar excepciones.

Los elementos saludables pueden mostrarse con menor contraste o resumirse.

# Responsive

Desktop:

- aprovechar ancho disponible;
- evitar tarjetas excesivamente altas;
- priorizar filas compactas.

Tablet:

- reorganizar secciones;
- permitir 2 columnas cuando corresponda.

Móvil:

- evitar tablas anchas;
- transformar información a bloques;
- evitar scroll horizontal;
- conservar visibles problemas, carga y disponibilidad.

# Navegación contextual

Cuando el usuario haga clic en una métrica, tarjeta o problema, navegar o filtrar hacia el contexto correspondiente cuando sea posible.

Ejemplo:

Tareas atrasadas: 6  
→ mostrar tareas atrasadas

Cliente Tigo  
→ filtrar dashboard por Tigo

Proyecto Campaña Q3  
→ mostrar sus subproyectos

Área Diseño  
→ mostrar carga y trabajo del área

Responsable Gabriel  
→ mostrar sus tareas y subtareas

# Implementación

Antes de modificar cualquier sección:

1. inspeccionar el código actual;
2. identificar de dónde vienen los datos;
3. revisar tipos existentes;
4. revisar cálculos existentes;
5. identificar posibles duplicaciones;
6. reutilizar componentes;
7. preservar backend y contratos API;
8. evitar introducir `any`;
9. evitar hardcodear estados o IDs;
10. hacer el cambio mínimo coherente.

# No hacer

No:

- eliminar funcionalidades sin necesidad;
- inventar métricas;
- inventar datos;
- duplicar cálculos;
- hardcodear estados dentro de componentes visuales;
- mezclar datos históricos con actuales sin indicarlo;
- ocultar usuarios sin tareas;
- interpretar automáticamente 0% como bajo rendimiento;
- usar cantidad de tareas como única medida de productividad;
- modificar backend únicamente para facilitar un diseño visual;
- rehacer todo el dashboard cuando solo se pidió modificar una sección.

# Verificación

Antes de finalizar cualquier modificación del dashboard:

- verificar usuarios sin asignaciones;
- verificar usuarios con completadas pero sin activas;
- verificar atrasos;
- verificar proyectos sin problemas;
- verificar proyectos en riesgo;
- verificar filtros;
- verificar jerarquía Cliente → Proyecto → Subproyecto;
- verificar responsables;
- verificar tareas y subtareas;
- verificar valores cero;
- verificar ausencia de datos;
- verificar responsive;
- verificar que no exista scroll horizontal innecesario;
- ejecutar TypeScript;
- ejecutar lint cuando esté disponible;
- verificar que el backend siga funcionando.

# Resultado final esperado

AgencyFlow debe permitir que gerencia pase de:

“Existe un problema”

a:

“Este cliente está afectado”

→ “Este proyecto tiene el problema”

→ “Este subproyecto está atrasado”

→ “Esta área está acumulando trabajo”

→ “Este responsable tiene la asignación”

→ “Esta tarea o subtarea es la causa”

y también debe permitir responder:

“¿Quién tiene capacidad para recibir nuevo trabajo?”

El dashboard debe optimizar la identificación de problemas, capacidad y oportunidades de redistribución de trabajo.