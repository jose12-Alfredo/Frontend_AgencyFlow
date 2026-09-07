import {
    apiFetch,
    buildQuery
} from "@/services/api";
import { PagedResult } from "@/types/common.types";
import {
    DepartmentUser,
    DepartmentUserRequest
} from "@/types/department-user.types";

interface DepartmentUserListParams {
    page?: number;
    pageSize?: number;
    userId?: string;
    departmentId?: string;
    isDirector?: boolean;

    [key: string]:
        | string
        | number
        | boolean
        | undefined
        | null;
}

const BASE_PATH = "/api/department-users";

export const departmentUsersService = {
    getAll(
        params: DepartmentUserListParams = {}
    ): Promise<PagedResult<DepartmentUser>> {
        const query = buildQuery(params);

        return apiFetch<PagedResult<DepartmentUser>>(
            `${BASE_PATH}${query}`
        );
    },

    getById(id: string): Promise<DepartmentUser> {
        return apiFetch<DepartmentUser>(`${BASE_PATH}/${id}`);
    },

    create(
        request: DepartmentUserRequest
    ): Promise<DepartmentUser> {
        return apiFetch<DepartmentUser>(BASE_PATH, {
            method: "POST",
            body: JSON.stringify(request)
        });
    },

    update(
        id: string,
        request: DepartmentUserRequest
    ): Promise<DepartmentUser> {
        return apiFetch<DepartmentUser>(`${BASE_PATH}/${id}`, {
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
