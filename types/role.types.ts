export interface Role {
    id: string;
    name: string;
    description: string | null;
}

export interface RoleRequest {
    name: string;
    description?: string | null;
}