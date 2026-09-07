"use client";

import {
    useCallback,
    useEffect,
    useState
} from "react";
import {
    Pencil,
    Plus,
    RefreshCw,
    Trash2
} from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ADMIN_ROLES } from "@/lib/roles";
import { AppShell } from "@/components/layout/AppShell";
import { RoleDeleteDialog } from "@/components/roles/RoleDeleteDialog";
import { RoleFormModal } from "@/components/roles/RoleFormModal";
import { ApiError } from "@/services/api";
import { rolesService } from "@/services/roles.service";
import { Role } from "@/types/role.types";

export default function RolesPage() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
    const loadRoles = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await rolesService.getAll({
                page: 1,
                pageSize: 100
            });

            setRoles(result.items);
        } catch (error) {
            if (error instanceof ApiError) {
                setError(error.message);
            } else {
                setError("No se pudieron cargar los roles.");
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Carga los roles al abrir la página es intencional.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadRoles();
    }, [loadRoles]);

    return (
        <RequireAuth allowedRoles={ADMIN_ROLES}>
            <AppShell>
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-blue-600">
                            Administración
                        </p>

                        <h1 className="mt-1 text-2xl font-semibold text-gray-900">
                            Roles
                        </h1>

                        <p className="mt-2 text-sm text-gray-600">
                            Roles disponibles para los usuarios.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedRole(null);
                                setIsFormOpen(true);
                            }}
                            className="flex h-10 items-center gap-2 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-700"
                        >
                            <Plus size={18} />
                            Nuevo rol
                        </button>

                        <button
                            type="button"
                            title="Actualizar roles"
                            aria-label="Actualizar roles"
                            onClick={() => void loadRoles()}
                            disabled={isLoading}
                            className="rounded-md border border-gray-300 bg-white p-2.5 text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                        >
                            <RefreshCw
                                size={19}
                                className={
                                    isLoading ? "animate-spin" : ""
                                }
                            />
                        </button>
                    </div>
                </div>

                {error && (
                    <div
                        role="alert"
                        className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                        {error}
                    </div>
                )}

                <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[600px] border-collapse text-left">
                            <thead className="border-b border-gray-200 bg-gray-50">
                            <tr>
                                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                    Nombre
                                </th>

                                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                    Descripción
                                </th>

                                <th className="w-32 px-5 py-3 text-right text-xs font-semibold uppercase text-gray-500">
                                    Acciones
                                </th>
                            </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-200">
                            {isLoading ? (
                                <tr>
                                    <td
                                        colSpan={3}
                                        className="px-5 py-10 text-center text-sm text-gray-500"
                                    >
                                        Cargando roles...
                                    </td>
                                </tr>
                            ) : roles.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={3}
                                        className="px-5 py-10 text-center text-sm text-gray-500"
                                    >
                                        No existen roles registrados.
                                    </td>
                                </tr>
                            ) : (
                                roles.map((role) => (
                                    <tr key={role.id}>
                                        <td className="px-5 py-4 text-sm font-medium text-gray-900">
                                            {role.name}
                                        </td>

                                        <td className="px-5 py-4 text-sm text-gray-600">
                                            {role.description ||
                                                "Sin descripción"}
                                        </td>

                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                            <button
                                                type="button"
                                                title="Editar rol"
                                                aria-label={`Editar ${role.name}`}
                                                onClick={() => {
                                                    setSelectedRole(role);
                                                    setIsFormOpen(true);
                                                }}
                                                className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                                            >
                                                <Pencil size={18} />
                                            </button>

                                            <button
                                                type="button"
                                                title="Eliminar rol"
                                                aria-label={`Eliminar ${role.name}`}
                                                onClick={() => setRoleToDelete(role)}
                                                className="rounded-md p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                </section>
                {isFormOpen && (
                    <RoleFormModal
                        role={selectedRole}
                        onClose={() => {
                            setIsFormOpen(false);
                            setSelectedRole(null);
                        }}
                        onSaved={loadRoles}
                    />
                )}

                {roleToDelete && (
                    <RoleDeleteDialog
                        role={roleToDelete}
                        onClose={() => setRoleToDelete(null)}
                        onDeleted={loadRoles}
                    />
                )}
            </AppShell>
        </RequireAuth>
    );
}
