export const SUBTASK_STATUSES = [
    "Pendiente",
    "En proceso",
    "En revisión",
    "Completada",
    "Pausada"
] as const;

export type SubTaskStatus = (typeof SUBTASK_STATUSES)[number];

export interface SubTask {
    id: string;
    title: string;
    detail: string | null;
    startDate: string;
    endDate: string | null;
    status: string;
    isOverdue: boolean;
    commentCount: number;
    taskItemId: string;
    taskItemTitle: string;
    assignedUserId: string | null;
    assignedUserFirstName: string | null;
    assignedUserLastName: string | null;
}

export interface SubTaskRequest {
    title: string;
    detail?: string | null;
    startDate: string;
    endDate?: string | null;
    status: string;
    taskItemId: string;
    assignedUserId?: string | null;
}
