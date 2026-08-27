export interface DepartmentUser {
    id: string;
    userId: string;
    userFirstName: string;
    userLastName: string;
    departmentId: string;
    departmentName: string;
}

export interface DepartmentUserRequest {
    userId: string;
    departmentId: string;
}
