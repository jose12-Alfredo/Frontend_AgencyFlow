"use client";

import {
    useCallback,
    useEffect,
    useState
} from "react";
import {
    ArrowRight,
    Pencil,
    Plus,
    RefreshCw,
    Trash2
} from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ADMIN_ROLES } from "@/lib/roles";
import { DepartmentUserDeleteDialog } from "@/components/department-users/DepartmentUserDeleteDialog";
import { DepartmentUserFormModal } from "@/components/department-users/DepartmentUserFormModal";
import { AppShell } from "@/components/layout/AppShell";
import { ApiError } from "@/services/api";
import { departmentsService } from "@/services/departments.service";
import { departmentUsersService } from "@/services/department-users.service";
import { usersService } from "@/services/users.service";
import { Department } from "@/types/department.types";
import { DepartmentUser } from "@/types/department-user.types";
import { User } from "@/types/user.types";

export default function DepartmentUsersPage() {
    const [assignments, setAssignments] = useState<DepartmentUser[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] =
        useState<DepartmentUser | null>(null);
    const [assignmentToDelete, setAssignmentToDelete] =
        useState<DepartmentUser | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const [assignmentsResult, usersResult, departmentsResult] =
                await Promise.all([
                    departmentUsersService.getAll({
                        page: 1,
                        pageSize: 100
                    }),
                    usersService.getAll({ page: 1, pageSize: 100 }),
                    departmentsService.getAll({ page: 1, pageSize: 100 })
                ]);

            setAssignments(assignmentsResult.items);
            setUsers(usersResult.items);
            setDepartments(departmentsResult.items);
        } catch (error) {
            if (error instanceof ApiError) {
                setError(error.message);
            } else {
                setError("No se pudieron cargar las asignaciones.");
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Carga inicial de asignaciones y catálogos relacionados.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadData();
    }, [loadData]);

    return (
        <RequireAuth allowedRoles={ADMIN_ROLES}>
            <AppShell>
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-blue-600">
                            Organización
                        </p>

                        <h1 className="mt-1 text-2xl font-semibold text-gray-900">
                            Usuarios por departamento
                        </h1>

                        <p className="mt-2 text-sm text-gray-600">
                            Asignaciones del personal a las áreas de trabajo.
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedAssignment(null);
                                setIsFormOpen(true);
                            }}
                            disabled={
                                isLoading ||
                                users.length === 0 ||
                                departments.length === 0
                            }
                            className="flex h-10 items-center gap-2 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Plus size={18} />
                            Nueva asignación
                        </button>

                        <button
                            type="button"
                            title="Actualizar asignaciones"
                            aria-label="Actualizar asignaciones"
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
                        <table className="w-full min-w-[700px] border-collapse text-left">
                            <thead className="border-b border-gray-200 bg-gray-50">
                                <tr>
                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Usuario
                                    </th>

                                    <th className="w-16 px-5 py-3" />

                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Departamento
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
                                            colSpan={4}
                                            className="px-5 py-10 text-center text-sm text-gray-500"
                                        >
                                            Cargando asignaciones...
                                        </td>
                                    </tr>
                                ) : assignments.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="px-5 py-10 text-center text-sm text-gray-500"
                                        >
                                            No existen asignaciones registradas.
                                        </td>
                                    </tr>
                                ) : (
                                    assignments.map((assignment) => (
                                        <tr key={assignment.id}>
                                            <td className="px-5 py-4 text-sm font-medium text-gray-900">
                                                {assignment.userFirstName}{" "}
                                                {assignment.userLastName}
                                            </td>

                                            <td className="px-5 py-4 text-center text-gray-400">
                                                <ArrowRight size={18} />
                                            </td>

                                            <td className="px-5 py-4 text-sm text-gray-700">
                                                {assignment.departmentName}
                                            </td>

                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        title="Editar asignación"
                                                        aria-label={`Editar asignación de ${assignment.userFirstName} ${assignment.userLastName}`}
                                                        onClick={() => {
                                                            setSelectedAssignment(
                                                                assignment
                                                            );
                                                            setIsFormOpen(true);
                                                        }}
                                                        className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                                                    >
                                                        <Pencil size={18} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        title="Eliminar asignación"
                                                        aria-label={`Eliminar asignación de ${assignment.userFirstName} ${assignment.userLastName}`}
                                                        onClick={() =>
                                                            setAssignmentToDelete(
                                                                assignment
                                                            )
                                                        }
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
                    <DepartmentUserFormModal
                        assignment={selectedAssignment}
                        assignments={assignments}
                        users={users}
                        departments={departments}
                        onClose={() => {
                            setIsFormOpen(false);
                            setSelectedAssignment(null);
                        }}
                        onSaved={loadData}
                    />
                )}

                {assignmentToDelete && (
                    <DepartmentUserDeleteDialog
                        assignment={assignmentToDelete}
                        onClose={() => setAssignmentToDelete(null)}
                        onDeleted={loadData}
                    />
                )}
            </AppShell>
        </RequireAuth>
    );
}
