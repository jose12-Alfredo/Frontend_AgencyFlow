export interface User {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
    roleId: string;
    roleName: string;
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
    clientCompanyId?: string | null;
}
