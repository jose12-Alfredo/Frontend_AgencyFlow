import { apiFetch } from "@/services/api";
import { GanttNode } from "@/types/gantt.types";

/** La API entrega exclusivamente los nodos visibles para el usuario autenticado. */
export const ganttService = {
    getProject(id: string): Promise<GanttNode> {
        return apiFetch<GanttNode>(`/api/projects/${id}/gantt`);
    },

    getSubProject(id: string): Promise<GanttNode> {
        return apiFetch<GanttNode>(`/api/subprojects/${id}/gantt`);
    }
};
