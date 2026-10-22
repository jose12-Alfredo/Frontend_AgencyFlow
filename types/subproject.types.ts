export const SUBPROJECT_STATUSES = [
    "Pendiente",
    "En curso",
    "Completado"
] as const;

export interface SubProject {
    id: string;
    title: string;
    detail: string | null;
    startDate: string;
    endDate: string | null;
    status: string;
    projectId: string;
    projectTitle: string;
    clientCompanyId: string | null;
    clientCompanyName: string | null;
    departmentId: string;
    departmentName: string;
    assignedUserId: string | null;
    assignedUserFirstName: string | null;
    assignedUserLastName: string | null;
}

export interface SubProjectRequest {
    title: string;
    detail?: string | null;
    startDate: string;
    endDate?: string | null;
    status: string;
    projectId: string;
    departmentId: string;
    assignedUserId?: string | null;
}

export interface SubProjectFormOptions {
    departments: SubProjectDepartmentOption[];
    users: SubProjectUserOption[];
}

export interface SubProjectDepartmentOption {
    id: string;
    name: string;
}

export interface SubProjectUserOption {
    id: string;
    firstName: string;
    lastName: string;
}
