import {
    apiFetch,
    buildQuery
} from "@/services/api";
import { PagedResult } from "@/types/common.types";
import {
    Department,
    DepartmentRequest
} from "@/types/department.types";

interface DepartmentListParams {
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

const BASE_PATH = "/api/departments";

export const departmentsService = {
    getAll(
        params: DepartmentListParams = {}
    ): Promise<PagedResult<Department>> {
        const query = buildQuery(params);

        return apiFetch<PagedResult<Department>>(
            `${BASE_PATH}${query}`
        );
    },

    getById(id: string): Promise<Department> {
        return apiFetch<Department>(`${BASE_PATH}/${id}`);
    },

    create(request: DepartmentRequest): Promise<Department> {
        return apiFetch<Department>(BASE_PATH, {
            method: "POST",
            body: JSON.stringify(request)
        });
    },

    update(
        id: string,
        request: DepartmentRequest
    ): Promise<Department> {
        return apiFetch<Department>(`${BASE_PATH}/${id}`, {
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
