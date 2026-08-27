export interface ProjectType {
    id: string;
    name: string;
    description: string | null;
}

export interface ProjectTypeRequest {
    name: string;
    description?: string | null;
}
