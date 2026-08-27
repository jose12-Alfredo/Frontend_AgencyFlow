export const TASK_STATUSES = [
    "Pendiente",
    "En curso",
    "En revisión",
    "Completado"
] as const;

export interface TaskItem {
    id: string;
    title: string;
    detail: string | null;
    createdAt: string;
    startDate: string;
    endDate: string | null;
    status: string;
    subProjectId: string;
    subProjectTitle: string;
    projectId: string;
    projectTitle: string;
    clientCompanyId: string | null;
    clientCompanyName: string | null;
    assignedUserId: string | null;
    assignedUserFirstName: string | null;
    assignedUserLastName: string | null;
    subTaskCount: number;
    completedSubTaskCount: number;
    progressPercentage: number;
}

export interface TaskItemRequest {
    title: string;
    detail?: string | null;
    startDate: string;
    endDate?: string | null;
    status: string;
    subProjectId: string;
    assignedUserId?: string | null;
}
