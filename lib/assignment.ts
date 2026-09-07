import { User } from "@/types/user.types";
import { DepartmentUser } from "@/types/department-user.types";

/**
 * La API determina la elegibilidad del responsable por el nombre de rol.
 * Esta ayuda solo evita selecciones inválidas en la interfaz; el backend
 * mantiene la validación de seguridad.
 */
export function isAssignableUser(user: User): boolean {
    return user.roleName !== "Cliente";
}

export function getAssignableUsers(users: User[]): User[] {
    return users.filter(isAssignableUser);
}

export function membershipsToAssignableUsers(
    memberships: DepartmentUser[]
): User[] {
    const users = new Map<string, User>();

    memberships.forEach((membership) => {
        if (membership.userRoleName === "Cliente") return;

        users.set(membership.userId, {
            id: membership.userId,
            firstName: membership.userFirstName,
            lastName: membership.userLastName,
            phone: null,
            email: null,
            roleId: "",
            roleName: membership.userRoleName,
            clientCompanyId: null,
            clientCompanyName: null
        });
    });

    return Array.from(users.values());
}
