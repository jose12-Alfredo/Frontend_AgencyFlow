import { apiFetch, buildQuery } from "@/services/api";
import { DepartmentUser } from "@/types/department-user.types";
import { PagedResult } from "@/types/common.types";
import { User } from "@/types/user.types";
import { Role } from "@/types/role.types";
import { JobPosition } from "@/types/job-position.types";
import { UserRequest } from "@/types/user.types";

export interface DirectorTeamMemberRequest extends UserRequest {
    departmentId: string;
}

export interface ExistingTeamMemberCandidate {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    roleId: string;
    roleName: string;
    belongsToOtherDepartments: boolean;
}

export interface ManagedDepartment {
    id: string;
    name: string;
}

interface ExistingTeamMemberParams {
    departmentId: string;
    search?: string;
    page?: number;
    pageSize?: number;

    [key: string]: string | number | undefined;
}

export const directorTeamService = {
    getDepartments(): Promise<ManagedDepartment[]> {
        return apiFetch<ManagedDepartment[]>("/api/director/team-members/departments");
    },
    getMembers(departmentId: string): Promise<DepartmentUser[]> {
        return apiFetch<DepartmentUser[]>(`/api/director/team-members/departments/${departmentId}/members`);
    },
    getAllowedRoles(): Promise<Role[]> {
        return apiFetch<Role[]>("/api/director/team-members/roles");
    },
    getJobPositions(): Promise<JobPosition[]> {
        return apiFetch<JobPosition[]>("/api/director/team-members/job-positions");
    },
    create(request: DirectorTeamMemberRequest): Promise<User> {
        return apiFetch<User>("/api/director/team-members", { method: "POST", body: JSON.stringify(request) });
    },
    getCandidates(params: ExistingTeamMemberParams): Promise<PagedResult<ExistingTeamMemberCandidate>> {
        const query = buildQuery(params);
        return apiFetch<PagedResult<ExistingTeamMemberCandidate>>(`/api/director/team-members/candidates${query}`);
    },
    addExisting(userId: string, departmentId: string): Promise<DepartmentUser> {
        return apiFetch<DepartmentUser>("/api/director/team-members/existing", {
            method: "POST",
            body: JSON.stringify({ userId, departmentId })
        });
    },
    remove(membershipId: string): Promise<void> {
        return apiFetch<void>(`/api/director/team-members/${membershipId}`, { method: "DELETE" });
    }
};
