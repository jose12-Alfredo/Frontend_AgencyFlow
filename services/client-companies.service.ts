import {
    apiFetch,
    buildQuery
} from "@/services/api";
import {
    ClientCompany,
    ClientCompanyRequest
} from "@/types/client-company.types";
import { PagedResult } from "@/types/common.types";

interface ClientCompanyListParams {
    page?: number;
    pageSize?: number;
    nombre?: string;
    email?: string;

    [key: string]:
        | string
        | number
        | boolean
        | undefined
        | null;
}

const BASE_PATH = "/api/client-companies";

export const clientCompaniesService = {
    getAll(
        params: ClientCompanyListParams = {}
    ): Promise<PagedResult<ClientCompany>> {
        const query = buildQuery(params);

        return apiFetch<PagedResult<ClientCompany>>(
            `${BASE_PATH}${query}`
        );
    },

    getById(id: string): Promise<ClientCompany> {
        return apiFetch<ClientCompany>(`${BASE_PATH}/${id}`);
    },

    create(request: ClientCompanyRequest): Promise<ClientCompany> {
        return apiFetch<ClientCompany>(BASE_PATH, {
            method: "POST",
            body: JSON.stringify(request)
        });
    },

    update(
        id: string,
        request: ClientCompanyRequest
    ): Promise<ClientCompany> {
        return apiFetch<ClientCompany>(`${BASE_PATH}/${id}`, {
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
