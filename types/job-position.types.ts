export interface JobPosition {
    id: string;
    name: string;
    description: string | null;
}

export interface JobPositionRequest {
    name: string;
    description?: string | null;
}
