import { apiFetch, buildQuery } from "@/services/api";
import { PagedResult } from "@/types/common.types";
import { ProjectDirectorAccess, ProjectDirectorAccessRequest } from "@/types/project-director-access.types";

interface ProjectDirectorAccessParams {
    page?: number;
    pageSize?: number;
    projectId?: string;
    directorUserId?: string;
    [key: string]: string | number | boolean | null | undefined;
}

const BASE_PATH = "/api/project-director-accesses";

export const projectDirectorAccessesService = {
    getAll(params: ProjectDirectorAccessParams = {}): Promise<PagedResult<ProjectDirectorAccess>> {
        return apiFetch<PagedResult<ProjectDirectorAccess>>(`${BASE_PATH}${buildQuery(params)}`);
    },
    create(request: ProjectDirectorAccessRequest): Promise<ProjectDirectorAccess> {
        return apiFetch<ProjectDirectorAccess>(BASE_PATH, { method: "POST", body: JSON.stringify(request) });
    },
    remove(id: string): Promise<void> {
        return apiFetch<void>(`${BASE_PATH}/${id}`, { method: "DELETE" });
    }
};
