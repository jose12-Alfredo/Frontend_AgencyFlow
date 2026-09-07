export interface DepartmentUser {
    id: string;
    userId: string;
    userFirstName: string;
    userLastName: string;
    userRoleName: string;
    departmentId: string;
    departmentName: string;
    isDirector: boolean;
}

export interface DepartmentUserRequest {
    userId: string;
    departmentId: string;
    isDirector: boolean;
}
