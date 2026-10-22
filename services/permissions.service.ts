import { apiFetch, buildQuery } from "@/services/api";
import { PermissionAudit, PermissionEffect, UserPermissionSummary } from "@/types/permission.types";

const BASE_PATH = "/api/permissions";

export const permissionsService = {
    getForUser(userId: string): Promise<UserPermissionSummary> {
        return apiFetch<UserPermissionSummary>(`${BASE_PATH}/users/${userId}`);
    },
    updateForUser(userId: string, permissions: Array<{ permissionId: string; effect: PermissionEffect }>): Promise<UserPermissionSummary> {
        return apiFetch<UserPermissionSummary>(`${BASE_PATH}/users/${userId}`, {
            method: "PUT",
            body: JSON.stringify({ permissions })
        });
    },
    getAudit(limit = 100): Promise<PermissionAudit[]> {
        return apiFetch<PermissionAudit[]>(`${BASE_PATH}/audit${buildQuery({ limit })}`);
    }
};
