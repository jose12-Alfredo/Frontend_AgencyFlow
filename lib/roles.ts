export const ADMIN_ROLES = ["SuperUsuario", "Gerente"] as const;
export const PROJECT_MANAGER_ROLES = [...ADMIN_ROLES, "Director"] as const;
export const WORKER_ROLES = ["Operativo 1", "Operativo 2", "Pasante", "Cliente"] as const;
export const WORK_ACCESS_ROLES = [...PROJECT_MANAGER_ROLES, ...WORKER_ROLES] as const;
export const REPORT_ROLES = [...PROJECT_MANAGER_ROLES, "Operativo 1", "Operativo 2", "Pasante"] as const;

export function hasRole(roleName: string | undefined, roles: readonly string[]): boolean {
    return Boolean(roleName && roles.includes(roleName));
}

export function isAdministrator(roleName: string | undefined): boolean {
    return hasRole(roleName, ADMIN_ROLES);
}

export function isProjectManager(roleName: string | undefined): boolean {
    return hasRole(roleName, PROJECT_MANAGER_ROLES);
}

export function isWorker(roleName: string | undefined): boolean {
    return hasRole(roleName, WORKER_ROLES);
}

export function getRoleHome(roleName: string): string {
    if (isProjectManager(roleName)) return "/dashboard";
    return "/my-work";
}
