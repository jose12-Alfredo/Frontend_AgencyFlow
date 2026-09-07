"use client";

import {
    FormEvent,
    useState
} from "react";
import { X } from "lucide-react";
import { ApiError } from "@/services/api";
import { departmentUsersService } from "@/services/department-users.service";
import { Department } from "@/types/department.types";
import { DepartmentUser } from "@/types/department-user.types";
import { User } from "@/types/user.types";

interface DepartmentUserFormModalProps {
    assignment: DepartmentUser | null;
    assignments: DepartmentUser[];
    users: User[];
    directorUsers?: User[];
    departments: Department[];
    lockedDepartment?: Department;
    onClose: () => void;
    onSaved: () => Promise<void>;
}

export function DepartmentUserFormModal({
    assignment,
    assignments,
    users,
    directorUsers,
    departments,
    lockedDepartment,
    onClose,
    onSaved
}: DepartmentUserFormModalProps) {
    const [userId, setUserId] = useState(assignment?.userId ?? "");
    const [departmentId, setDepartmentId] = useState(
        assignment?.departmentId ?? lockedDepartment?.id ?? ""
    );
    const [isDirector, setIsDirector] = useState(assignment?.isDirector ?? false);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const isEditing = assignment !== null;

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!userId || !departmentId) {
            setError("Debes seleccionar un usuario y un departamento.");
            return;
        }

        const isDuplicate = assignments.some((item) =>
            item.id !== assignment?.id &&
            item.userId === userId &&
            item.departmentId === departmentId
        );

        if (isDuplicate) {
            setError("El usuario ya pertenece a ese departamento.");
            return;
        }

        setError(null);
        setIsSaving(true);

        try {
            const request = {
                userId,
                departmentId,
                isDirector
            };

            if (isEditing) {
                await departmentUsersService.update(
                    assignment.id,
                    request
                );
            } else {
                await departmentUsersService.create(request);
            }

            await onSaved();
            onClose();
        } catch (error) {
            if (error instanceof ApiError) {
                setError(error.message);
            } else {
                setError("No se pudo guardar la asignación.");
            }
        } finally {
            setIsSaving(false);
        }
    }

    const eligibleUsers = isDirector
        ? (directorUsers ?? users.filter((user) => user.roleName === "Director"))
        : users;
    const directorCandidates = directorUsers ?? users.filter(
        (user) => user.roleName === "Director"
    );

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="department-user-form-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        >
            <section className="w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-xl">
                <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                        <p className="text-xs font-semibold uppercase text-blue-600">
                            Organización
                        </p>

                        <h2
                            id="department-user-form-title"
                            className="mt-1 text-lg font-semibold text-gray-900"
                        >
                            {isEditing
                                ? "Editar asignación"
                                : "Nueva asignación"}
                        </h2>
                    </div>

                    <button
                        type="button"
                        title="Cerrar"
                        aria-label="Cerrar"
                        onClick={onClose}
                        disabled={isSaving}
                        className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="space-y-5 p-6">
                    {error && (
                        <div
                            role="alert"
                            className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                        >
                            {error}
                        </div>
                    )}

                    <div>
                        <label
                            htmlFor="assignment-user"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Usuario
                        </label>

                        <select
                            id="assignment-user"
                            value={userId}
                            onChange={(event) => setUserId(event.target.value)}
                            autoFocus
                            required
                            className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        >
                            <option value="">Seleccionar usuario</option>
                            {eligibleUsers.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.firstName} {user.lastName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-violet-100 bg-violet-50/50 px-3 py-3 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            checked={isDirector}
                            onChange={(event) => {
                                const nextIsDirector = event.target.checked;
                                setIsDirector(nextIsDirector);
                                if (nextIsDirector && !directorCandidates.some((user) => user.id === userId)) {
                                    setUserId("");
                                }
                            }}
                            className="mt-0.5 size-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                        />
                        <span><span className="block font-semibold text-violet-900">Director del área</span><span className="mt-0.5 block text-xs leading-5 text-violet-700">Solo se pueden seleccionar usuarios con el rol Director.</span></span>
                    </label>

                    {lockedDepartment ? (
                        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
                            <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Área</span>
                            <span className="mt-1 block font-medium">{lockedDepartment.name}</span>
                        </div>
                    ) : <div>
                        <label
                            htmlFor="assignment-department"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Departamento
                        </label>

                        <select
                            id="assignment-department"
                            value={departmentId}
                            onChange={(event) =>
                                setDepartmentId(event.target.value)
                            }
                            required
                            className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        >
                            <option value="">Seleccionar departamento</option>
                            {departments.map((department) => (
                                <option
                                    key={department.id}
                                    value={department.id}
                                >
                                    {department.name}
                                </option>
                            ))}
                        </select>
                    </div>}

                    <footer className="flex justify-end gap-3 border-t border-gray-200 pt-5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="h-10 rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={
                                isSaving ||
                                users.length === 0 ||
                                departments.length === 0
                            }
                            className="h-10 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSaving
                                ? "Guardando..."
                                : "Guardar asignación"}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}
