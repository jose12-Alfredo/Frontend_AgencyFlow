export interface ClientCompany {
    id: string;
    name: string;
    description: string | null;
    email: string | null;
    phone: string | null;
}

export interface ClientCompanyRequest {
    name: string;
    description?: string | null;
    email?: string | null;
    phone?: string | null;
}
