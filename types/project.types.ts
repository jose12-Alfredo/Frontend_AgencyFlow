export interface Project {
    id: string;
    title: string;
    detail: string | null;
    startDate: string;
    endDate: string | null;
    projectTypeId: string;
    projectTypeName: string;
    clientUserId: string | null;
    clientUserFirstName: string | null;
    clientUserLastName: string | null;
    clientCompanyId: string | null;
    clientCompanyName: string | null;
    responsibleUserId: string | null;
    responsibleUserFirstName: string | null;
    responsibleUserLastName: string | null;
    responsibleUserJobPositionName: string | null;
}

export interface ProjectRequest {
    title: string;
    detail?: string | null;
    startDate: string;
    endDate?: string | null;
    projectTypeId: string;
    clientCompanyId?: string | null;
    responsibleUserId: string;
}

export interface ProjectResponsible {
    id: string;
    firstName: string;
    lastName: string;
    roleName: string;
    jobPositionName: string | null;
}

export interface SubProjectSummary {
    id: string;
    title: string;
    detail: string | null;
    startDate: string;
    endDate: string | null;
    status: string;
    departmentName: string;
    assignedUserFirstName: string | null;
    assignedUserLastName: string | null;
}

export interface ProjectFull extends Project {
    subProjects: SubProjectSummary[];
}
