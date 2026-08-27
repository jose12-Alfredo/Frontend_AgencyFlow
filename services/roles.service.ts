import {
    apiFetch,
    buildQuery
} from "@/services/api";
import { PagedResult } from "@/types/common.types";
import {
    Role,
    RoleRequest
} from "@/types/role.types";

interface RoleListParams {
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

const BASE_PATH = "/api/roles";

export const rolesService = {
    getAll(
        params: RoleListParams = {}
    ): Promise<PagedResult<Role>> {
        const query = buildQuery(params);

        return apiFetch<PagedResult<Role>>(
            `${BASE_PATH}${query}`
        );
    },

    getById(id: string): Promise<Role> {
        return apiFetch<Role>(
            `${BASE_PATH}/${id}`
        );
    },

    create(request: RoleRequest): Promise<Role> {
        return apiFetch<Role>(BASE_PATH, {
            method: "POST",
            body: JSON.stringify(request)
        });
    },

    update(
        id: string,
        request: RoleRequest
    ): Promise<Role> {
        return apiFetch<Role>(
            `${BASE_PATH}/${id}`,
            {
                method: "PUT",
                body: JSON.stringify(request)
            }
        );
    },

    remove(id: string): Promise<void> {
        return apiFetch<void>(
            `${BASE_PATH}/${id}`,
            {
                method: "DELETE"
            }
        );
    }
};