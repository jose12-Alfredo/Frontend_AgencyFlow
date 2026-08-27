import { apiFetch, buildQuery } from "@/services/api";
import { ClientHierarchy, DashboardData } from "@/types/dashboard.types";

export interface DashboardQuery {
    clientCompanyId?: string;
    projectId?: string;
    subProjectId?: string;
    departmentId?: string;
    responsibleUserId?: string;
    year?: string;
    month?: string;

    [key: string]: string | undefined;
}

export interface ClientHierarchyQuery {
    year: string;
    month: string;
    departmentId?: string;
    responsibleUserId?: string;

    [key: string]: string | undefined;
}

export const dashboardService = {
    get(
        query: DashboardQuery = {},
        signal?: AbortSignal
    ): Promise<DashboardData> {
        return apiFetch<DashboardData>(
            `/api/dashboard${buildQuery(query)}`,
            { signal }
        );
    },

    getClientHierarchy(
        clientId: string,
        query: ClientHierarchyQuery,
        signal?: AbortSignal
    ): Promise<ClientHierarchy> {
        return apiFetch<ClientHierarchy>(
            `/api/dashboard/clients/${clientId}/hierarchy${buildQuery(query)}`,
            { signal }
        );
    }
};
