"use client";

import {
    useCallback,
    useEffect,
    useState
} from "react";
import {
    Mail,
    Pencil,
    Phone,
    Plus,
    RefreshCw,
    Trash2
} from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ADMIN_ROLES } from "@/lib/roles";
import { AppShell } from "@/components/layout/AppShell";
import { UserDeleteDialog } from "@/components/users/UserDeleteDialog";
import { UserFormModal } from "@/components/users/UserFormModal";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/services/api";
import { clientCompaniesService } from "@/services/client-companies.service";
import { jobPositionsService } from "@/services/job-positions.service";
import { rolesService } from "@/services/roles.service";
import { usersService } from "@/services/users.service";
import { ClientCompany } from "@/types/client-company.types";
import { JobPosition } from "@/types/job-position.types";
import { Role } from "@/types/role.types";
import { User } from "@/types/user.types";

export default function UsersPage() {
    const { user: currentUser } = useAuth();
    const canCreate = currentUser?.permissions?.includes("users.create") ?? false;
    const canUpdate = currentUser?.permissions?.includes("users.update") ?? false;
    const canDelete = currentUser?.permissions?.includes("users.delete") ?? false;
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
    const [companies, setCompanies] = useState<ClientCompany[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const [usersResult, rolesResult, jobPositionsResult, companiesResult] =
                await Promise.all([
                    usersService.getAll({ page: 1, pageSize: 100 }),
                    rolesService.getAll({ page: 1, pageSize: 100 }),
                    jobPositionsService.getAll({ page: 1, pageSize: 100 }),
                    clientCompaniesService.getAll({
                        page: 1,
                        pageSize: 100
                    })
                ]);

            setUsers(usersResult.items);
            setRoles(rolesResult.items);
            setJobPositions(jobPositionsResult.items);
            setCompanies(companiesResult.items);
        } catch (error) {
            if (error instanceof ApiError) {
                setError(error.message);
            } else {
                setError("No se pudieron cargar los usuarios.");
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Carga inicial de usuarios y sus catálogos relacionados.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadData();
    }, [loadData]);

    return (
        <RequireAuth allowedRoles={ADMIN_ROLES}>
            <AppShell>
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-blue-600">
                            Administración
                        </p>

                        <h1 className="mt-1 text-2xl font-semibold text-gray-900">
                            Usuarios
                        </h1>

                        <p className="mt-2 text-sm text-gray-600">
                            Personas con acceso o participación en AgencyFlow.
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        {canCreate && <button
                            type="button"
                            onClick={() => {
                                setSelectedUser(null);
                                setIsFormOpen(true);
                            }}
                            disabled={isLoading || roles.length === 0}
                            className="flex h-10 items-center gap-2 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Plus size={18} />
                            Nuevo usuario
                        </button>}

                        <button
                            type="button"
                            title="Actualizar usuarios"
                            aria-label="Actualizar usuarios"
                            onClick={() => void loadData()}
                            disabled={isLoading}
                            className="rounded-md border border-gray-300 bg-white p-2.5 text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                        >
                            <RefreshCw
                                size={19}
                                className={isLoading ? "animate-spin" : ""}
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
                        <table className="w-full min-w-[1080px] border-collapse text-left">
                            <thead className="border-b border-gray-200 bg-gray-50">
                                <tr>
                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Usuario
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Contacto
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Cargo
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Perfil de acceso
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Empresa cliente
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
                                            colSpan={6}
                                            className="px-5 py-10 text-center text-sm text-gray-500"
                                        >
                                            Cargando usuarios...
                                        </td>
                                    </tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-5 py-10 text-center text-sm text-gray-500"
                                        >
                                            No existen usuarios registrados.
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => {
                                        const isCurrentUser =
                                            user.id === currentUser?.id;

                                        return (
                                            <tr key={user.id}>
                                                <td className="px-5 py-4">
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {user.firstName}{" "}
                                                        {user.lastName}
                                                    </p>

                                                    {isCurrentUser && (
                                                        <p className="mt-1 text-xs text-blue-600">
                                                            Sesión actual
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="px-5 py-4 text-sm text-gray-600">
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <Mail
                                                                size={15}
                                                                className="shrink-0 text-gray-400"
                                                            />
                                                            <span>
                                                                {user.email ||
                                                                    "Sin correo"}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <Phone
                                                                size={15}
                                                                className="shrink-0 text-gray-400"
                                                            />
                                                            <span>
                                                                {user.phone ||
                                                                    "Sin teléfono"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4 text-sm text-gray-700">
                                                    {user.jobPositionName || (
                                                        <span className="text-amber-700">Sin cargo</span>
                                                    )}
                                                </td>

                                                <td className="px-5 py-4 text-sm text-gray-700">
                                                    {user.roleName}
                                                </td>

                                                <td className="px-5 py-4 text-sm text-gray-600">
                                                    {user.clientCompanyName ||
                                                        "Sin empresa"}
                                                </td>

                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {canUpdate && <button
                                                            type="button"
                                                            title="Editar usuario"
                                                            aria-label={`Editar ${user.firstName} ${user.lastName}`}
                                                            onClick={() => {
                                                                setSelectedUser(
                                                                    user
                                                                );
                                                                setIsFormOpen(
                                                                    true
                                                                );
                                                            }}
                                                            className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                                                        >
                                                            <Pencil size={18} />
                                                        </button>}

                                                        {canDelete && <button
                                                            type="button"
                                                            title={isCurrentUser
                                                                ? "No puedes eliminar tu sesión"
                                                                : "Eliminar usuario"}
                                                            aria-label={`Eliminar ${user.firstName} ${user.lastName}`}
                                                            onClick={() =>
                                                                setUserToDelete(
                                                                    user
                                                                )
                                                            }
                                                            disabled={isCurrentUser}
                                                            className="rounded-md p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {isFormOpen && (
                    <UserFormModal
                        user={selectedUser}
                        roles={roles}
                        jobPositions={jobPositions}
                        companies={companies}
                        onClose={() => {
                            setIsFormOpen(false);
                            setSelectedUser(null);
                        }}
                        onSaved={loadData}
                    />
                )}

                {userToDelete && (
                    <UserDeleteDialog
                        user={userToDelete}
                        onClose={() => setUserToDelete(null)}
                        onDeleted={loadData}
                    />
                )}
            </AppShell>
        </RequireAuth>
    );
}
