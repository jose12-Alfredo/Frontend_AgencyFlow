export interface Role {
    id: string;
    name: string;
    description: string | null;
}

export interface RoleRequest {
    name: string;
    description?: string | null;
}

export interface RolePermission {
    id: string;
    code: string;
    name: string;
    description: string;
    module: string;
    isSensitive: boolean;
    isAssigned: boolean;
}

export interface RolePermissionSummary {
    roleId: string;
    roleName: string;
    isReadOnly: boolean;
    permissions: RolePermission[];
}

export interface RolePermissionAudit {
    id: string;
    actorName: string;
    roleId: string;
    roleName: string;
    permissionCode: string;
    wasAssigned: boolean;
    isAssigned: boolean;
    timestamp: string;
}
