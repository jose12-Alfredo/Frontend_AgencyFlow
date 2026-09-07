export interface ProjectDirectorAccess {
    id: string;
    projectId: string;
    projectTitle: string;
    directorUserId: string;
    directorName: string;
    grantedByUserId: string;
    createdAt: string;
}

export interface ProjectDirectorAccessRequest {
    projectId: string;
    directorUserId: string;
}
