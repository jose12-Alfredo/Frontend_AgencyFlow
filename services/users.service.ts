import {
    apiFetch,
    buildQuery
} from "@/services/api";
import { PagedResult } from "@/types/common.types";
import {
    User,
    UserRequest
} from "@/types/user.types";

interface UserListParams {
    page?: number;
    pageSize?: number;
    nombre?: string;
    apellido?: string;
    email?: string;
    roleId?: string;
    jobPositionId?: string;
    clientCompanyId?: string;

    [key: string]:
        | string
        | number
        | boolean
        | undefined
        | null;
}

const BASE_PATH = "/api/users";

export const usersService = {
    getAll(
        params: UserListParams = {}
    ): Promise<PagedResult<User>> {
        const query = buildQuery(params);

        return apiFetch<PagedResult<User>>(
            `${BASE_PATH}${query}`
        );
    },

    getClients(
        params: UserListParams = {}
    ): Promise<PagedResult<User>> {
        const query = buildQuery(params);

        return apiFetch<PagedResult<User>>(
            `${BASE_PATH}/clients${query}`
        );
    },

    getById(id: string): Promise<User> {
        return apiFetch<User>(`${BASE_PATH}/${id}`);
    },

    create(request: UserRequest): Promise<User> {
        return apiFetch<User>(BASE_PATH, {
            method: "POST",
            body: JSON.stringify(request)
        });
    },

    update(id: string, request: UserRequest): Promise<User> {
        return apiFetch<User>(`${BASE_PATH}/${id}`, {
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
