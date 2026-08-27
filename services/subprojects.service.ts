import {
    apiFetch,
    buildQuery
} from "@/services/api";
import { PagedResult } from "@/types/common.types";
import {
    SubProject,
    SubProjectRequest
} from "@/types/subproject.types";

interface SubProjectListParams {
    page?: number;
    pageSize?: number;
    titulo?: string;
    projectId?: string;
    departmentId?: string;
    status?: string;
    assignedUserId?: string;

    [key: string]:
        | string
        | number
        | boolean
        | undefined
        | null;
}

const BASE_PATH = "/api/subprojects";

export const subProjectsService = {
    getAll(
        params: SubProjectListParams = {}
    ): Promise<PagedResult<SubProject>> {
        const query = buildQuery(params);

        return apiFetch<PagedResult<SubProject>>(
            `${BASE_PATH}${query}`
        );
    },

    getById(id: string): Promise<SubProject> {
        return apiFetch<SubProject>(`${BASE_PATH}/${id}`);
    },

    create(request: SubProjectRequest): Promise<SubProject> {
        return apiFetch<SubProject>(BASE_PATH, {
            method: "POST",
            body: JSON.stringify(request)
        });
    },

    update(
        id: string,
        request: SubProjectRequest
    ): Promise<SubProject> {
        return apiFetch<SubProject>(`${BASE_PATH}/${id}`, {
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
