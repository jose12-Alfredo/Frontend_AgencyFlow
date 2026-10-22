export interface ProjectAssignment {
    id: string;
    projectId: string;
    projectTitle: string;
    userId: string;
    userName: string;
    jobPositionName?: string | null;
    grantedByUserId: string;
    createdAt: string;
}

export interface ProjectAssignmentOptions {
    projects: Array<{ id: string; title: string }>;
    users: Array<{ id: string; name: string; jobPositionName?: string | null }>;
}
