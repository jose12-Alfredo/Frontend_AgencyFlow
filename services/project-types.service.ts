import {
    apiFetch,
    buildQuery
} from "@/services/api";
import { PagedResult } from "@/types/common.types";
import {
    ProjectType,
    ProjectTypeRequest
} from "@/types/project-type.types";

interface ProjectTypeListParams {
    page?: number;
    pageSize?: number;
    nombre?: string;

    [key: string]:
        | string
        | number
        | boolean
        | undefined
        | null;
}

const BASE_PATH = "/api/project-types";

export const projectTypesService = {
    getAll(
        params: ProjectTypeListParams = {}
    ): Promise<PagedResult<ProjectType>> {
        const query = buildQuery(params);

        return apiFetch<PagedResult<ProjectType>>(
            `${BASE_PATH}${query}`
        );
    },

    getById(id: string): Promise<ProjectType> {
        return apiFetch<ProjectType>(`${BASE_PATH}/${id}`);
    },

    create(request: ProjectTypeRequest): Promise<ProjectType> {
        return apiFetch<ProjectType>(BASE_PATH, {
            method: "POST",
            body: JSON.stringify(request)
        });
    },

    update(
        id: string,
        request: ProjectTypeRequest
    ): Promise<ProjectType> {
        return apiFetch<ProjectType>(`${BASE_PATH}/${id}`, {
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
