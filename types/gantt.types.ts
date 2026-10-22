export type GanttNodeType = "project" | "subproject" | "task" | "subtask";

/**
 * Árbol que devuelve la API para las vistas de Gantt. La API ya debe aplicar
 * la visibilidad del usuario autenticado antes de devolverlo.
 */
export interface GanttNode {
    id: string;
    type: GanttNodeType;
    title: string;
    startDate: string | null;
    endDate: string | null;
    status: string;
    responsibleName: string | null;
    progressPercentage: number | null;
    children: GanttNode[];
}
