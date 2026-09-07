import { apiFetch, buildQuery } from "@/services/api";
import { DepartmentUser } from "@/types/department-user.types";
import { PagedResult } from "@/types/common.types";
import { User } from "@/types/user.types";
import { Role } from "@/types/role.types";

export interface DirectorTeamMemberRequest {
    firstName: string; lastName: string; phone: string | null; email: string | null; password: string; roleId: string; clientCompanyId: null; departmentId: string;
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

interface ExistingTeamMemberParams {
    departmentId: string;
    search?: string;
    page?: number;
    pageSize?: number;

    [key: string]: string | number | undefined;
}

export const directorTeamService = {
    getAllowedRoles(): Promise<Role[]> {
        return apiFetch<Role[]>("/api/director/team-members/roles");
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
    }
};
