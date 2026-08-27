import { User } from "@/types/user.types";

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
