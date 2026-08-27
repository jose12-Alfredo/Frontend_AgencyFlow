export interface Department {
    id: string;
    name: string;
    description: string | null;
}

export interface DepartmentRequest {
    name: string;
    description?: string | null;
}
