export type PermissionEffect = "Allow" | "Deny" | null;

export interface EffectivePermission {
    id: string;
    code: string;
    name: string;
    description: string;
    module: string;
    isSensitive: boolean;
    roleAllowed: boolean;
    userEffect: PermissionEffect;
    effectiveAllowed: boolean;
    isImplemented: boolean;
}

export interface UserPermissionSummary {
    userId: string;
    userName: string;
    roleName: string;
    jobPositionName: string | null;
    permissions: EffectivePermission[];
}

export interface PermissionAudit {
    id: string;
    actorName: string;
    targetName: string;
    permissionCode: string;
    action: string;
    previousEffect: PermissionEffect;
    newEffect: PermissionEffect;
    timestamp: string;
}
