import { departmentUsersService } from "@/services/department-users.service";

/** The API evaluates this filter server-side; the returned IDs are only used to
 * prevent a legacy API response from leaking another department into the UI. */
export async function getDirectedDepartmentIds(userId: string): Promise<Set<string>> {
    const result = await departmentUsersService.getAll({
        page: 1,
        pageSize: 100,
        userId,
        isDirector: true
    });

    return new Set(result.items.map((membership) => membership.departmentId));
}
