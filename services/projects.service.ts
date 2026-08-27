import {
    apiFetch,
    buildQuery
} from "@/services/api";
import { PagedResult } from "@/types/common.types";
import {
    Project,
    ProjectFull,
    ProjectRequest
} from "@/types/project.types";

interface ProjectListParams {
    page?: number;
    pageSize?: number;
    titulo?: string;
    projectTypeId?: string;
    clientUserId?: string;
    startDateFrom?: string;
    startDateTo?: string;

    [key: string]:
        | string
        | number
        | boolean
        | undefined
        | null;
}

const BASE_PATH = "/api/projects";

export const projectsService = {
    getAll(
        params: ProjectListParams = {}
    ): Promise<PagedResult<Project>> {
        const query = buildQuery(params);

        return apiFetch<PagedResult<Project>>(
            `${BASE_PATH}${query}`
        );
    },

    getById(id: string): Promise<Project> {
        return apiFetch<Project>(`${BASE_PATH}/${id}`);
    },

    getFull(id: string): Promise<ProjectFull> {
        return apiFetch<ProjectFull>(`${BASE_PATH}/${id}/full`);
    },

    create(request: ProjectRequest): Promise<Project> {
        return apiFetch<Project>(BASE_PATH, {
            method: "POST",
            body: JSON.stringify(request)
        });
    },

    update(id: string, request: ProjectRequest): Promise<Project> {
        return apiFetch<Project>(`${BASE_PATH}/${id}`, {
            method: "PUT",
            body: JSON.stringify(request)
        });
    },

    remove(id: string): Promise<void> {
        return apiFetch<void>(`${BASE_PATH}/${id}`, {
            method: "DELETE"
        });
    }
};
