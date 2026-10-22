import {
    apiFetch,
    buildQuery
} from "@/services/api";
import { PagedResult } from "@/types/common.types";
import {
    Role,
    RolePermissionAudit,
    RolePermissionSummary,
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

    getPermissions(id: string): Promise<RolePermissionSummary> {
        return apiFetch<RolePermissionSummary>(
            `${BASE_PATH}/${id}/permissions`
        );
    },

    updatePermissions(
        id: string,
        permissionIds: string[]
    ): Promise<RolePermissionSummary> {
        return apiFetch<RolePermissionSummary>(
            `${BASE_PATH}/${id}/permissions`,
            {
                method: "PUT",
                body: JSON.stringify({ permissionIds })
            }
        );
    },

    getPermissionAudit(
        id: string,
        limit = 100
    ): Promise<RolePermissionAudit[]> {
        return apiFetch<RolePermissionAudit[]>(
            `${BASE_PATH}/${id}/permissions/audit${buildQuery({ limit })}`
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
