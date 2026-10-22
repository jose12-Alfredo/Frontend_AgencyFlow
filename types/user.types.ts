export interface User {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
    roleId: string;
    roleName: string;
    jobPositionId: string | null;
    jobPositionName: string | null;
    clientCompanyId: string | null;
    clientCompanyName: string | null;
}

export interface UserRequest {
    firstName: string;
    lastName: string;
    phone?: string | null;
    email?: string | null;
    password?: string | null;
    roleId: string;
    jobPositionId?: string | null;
    clientCompanyId?: string | null;
}
