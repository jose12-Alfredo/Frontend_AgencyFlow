import { apiFetch, buildQuery } from "@/services/api";
import { PagedResult } from "@/types/common.types";
import { ProjectAssignment, ProjectAssignmentOptions } from "@/types/project-assignment.types";

const BASE_PATH = "/api/project-assignments";

export const projectAssignmentsService = {
    getAll(params: { page?: number; pageSize?: number; projectId?: string } = {}) {
        return apiFetch<PagedResult<ProjectAssignment>>(`${BASE_PATH}${buildQuery(params)}`);
    },
    getOptions() {
        return apiFetch<ProjectAssignmentOptions>(`${BASE_PATH}/options`);
    },
    create(projectId: string, userId: string) {
        return apiFetch<ProjectAssignment>(BASE_PATH, {
            method: "POST",
            body: JSON.stringify({ projectId, userId })
        });
    },
    remove(id: string) {
        return apiFetch<void>(`${BASE_PATH}/${id}`, { method: "DELETE" });
    }
};
