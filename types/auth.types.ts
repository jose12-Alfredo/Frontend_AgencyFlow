export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    roleName: string;
    jobPositionId: string | null;
    jobPositionName: string | null;
    departments: string[];
    permissions: string[];
}

export interface AuthUser {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    roleName: string;
    jobPositionId: string | null;
    jobPositionName: string | null;
    departments: string[];
    permissions: string[];
    permissionsVersion: number;
}
