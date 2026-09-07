"use client";

import {
    FormEvent,
    useEffect,
    useState
} from "react";
import { X } from "lucide-react";
import { ApiError } from "@/services/api";
import { tasksService } from "@/services/tasks.service";
import { SubProject } from "@/types/subproject.types";
import { TaskItem } from "@/types/task.types";
import { User } from "@/types/user.types";
import {
    getAssignableUsers,
    membershipsToAssignableUsers
} from "@/lib/assignment";
import { departmentUsersService } from "@/services/department-users.service";
import { useAuth } from "@/context/AuthContext";
import { isAdministrator } from "@/lib/roles";

interface TaskFormModalProps {
    task: TaskItem | null;
    subProjects: SubProject[];
    users: User[];
    initialSubProjectId?: string;
    onClose: () => void;
    onSaved: () => Promise<void>;
}

export function TaskFormModal({
    task,
    subProjects,
    users,
    initialSubProjectId = "",
    onClose,
    onSaved
}: TaskFormModalProps) {
    const { user } = useAuth();
    const canAdminister = isAdministrator(user?.roleName);
    const [teamUsers, setTeamUsers] = useState<User[]>([]);
    const assignableUsers = getAssignableUsers(
        canAdminister ? users : teamUsers
    );
    const initialAssignedUserId = task?.assignedUserId ?? "";
    const hasInvalidHistoricAssignee = Boolean(
        initialAssignedUserId &&
        !assignableUsers.some((user) => user.id === initialAssignedUserId)
    );
    const [title, setTitle] = useState(task?.title ?? "");
    const [detail, setDetail] = useState(task?.detail ?? "");
    const [startDate, setStartDate] = useState(task?.startDate ?? "");
    const [endDate, setEndDate] = useState(task?.endDate ?? "");
    const [subProjectId, setSubProjectId] = useState(
        task?.subProjectId ?? initialSubProjectId
    );
    const [assignedUserId, setAssignedUserId] = useState(
        hasInvalidHistoricAssignee ? "" : initialAssignedUserId
    );
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const isEditing = task !== null;

    useEffect(() => {
        if (canAdminister) return;

        const departmentId = subProjects.find(
            (subProject) => subProject.id === subProjectId
        )?.departmentId;
        let cancelled = false;

        const request = departmentId
            ? departmentUsersService.getAll({
                page: 1,
                pageSize: 100,
                departmentId
            }).then((result) => membershipsToAssignableUsers(result.items))
            : Promise.resolve([] as User[]);

        void request.then((members) => {
            if (!cancelled) setTeamUsers(members);
        }).catch(() => {
            if (!cancelled) setTeamUsers([]);
        });

        return () => {
            cancelled = true;
        };
    }, [canAdminister, subProjectId, subProjects]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!title.trim() || !startDate || !subProjectId) {
            setError(
                "Título, fecha inicial y subproyecto son obligatorios."
            );
            return;
        }

        if (endDate && endDate < startDate) {
            setError("La fecha final no puede ser anterior a la inicial.");
            return;
        }

        setError(null);
        setIsSaving(true);

        try {
            const request = {
                title: title.trim(),
                detail: detail.trim() || null,
                startDate,
                endDate: endDate || null,
                status: task?.status ?? "Pendiente",
                subProjectId,
                assignedUserId: assignedUserId || null
            };

            if (isEditing) {
                await tasksService.update(task.id, request);
            } else {
                await tasksService.create(request);
            }

            await onSaved();
            onClose();
        } catch (error) {
            if (error instanceof ApiError) {
                setError(error.message);
            } else {
                setError("No se pudo guardar la tarea.");
            }
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-form-title"
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-6"
        >
            <section className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white shadow-xl">
                <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                        <p className="text-xs font-semibold uppercase text-blue-600">
                            Operaciones
                        </p>

                        <h2
                            id="task-form-title"
                            className="mt-1 text-lg font-semibold text-gray-900"
                        >
                            {isEditing ? "Editar tarea" : "Nueva tarea"}
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
                            htmlFor="task-title"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Título
                        </label>
                        <input
                            id="task-title"
                            type="text"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            autoFocus
                            required
                            maxLength={200}
                            className="h-11 w-full rounded-md border border-gray-300 px-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="task-detail"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Detalle
                        </label>
                        <textarea
                            id="task-detail"
                            value={detail}
                            onChange={(event) => setDetail(event.target.value)}
                            rows={3}
                            maxLength={1000}
                            className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="task-start-date"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Fecha inicial
                            </label>
                            <input
                                id="task-start-date"
                                type="date"
                                value={startDate}
                                onChange={(event) =>
                                    setStartDate(event.target.value)
                                }
                                required
                                className="h-11 w-full rounded-md border border-gray-300 px-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="task-end-date"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Fecha final
                            </label>
                            <input
                                id="task-end-date"
                                type="date"
                                value={endDate}
                                min={startDate || undefined}
                                onChange={(event) =>
                                    setEndDate(event.target.value)
                                }
                                className="h-11 w-full rounded-md border border-gray-300 px-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="task-subproject"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Subproyecto
                            </label>
                            <select
                                id="task-subproject"
                                value={subProjectId}
                                onChange={(event) =>
                                    setSubProjectId(event.target.value)
                                }
                                required
                                className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="">Seleccionar subproyecto</option>
                                {subProjects.map((subProject) => (
                                    <option
                                        key={subProject.id}
                                        value={subProject.id}
                                    >
                                        {subProject.clientCompanyName ?? "Sin cliente"}
                                        {" · "}{subProject.projectTitle}
                                        {" · "}{subProject.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="task-user"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Usuario responsable
                            </label>
                            <select
                                id="task-user"
                                value={assignedUserId}
                                onChange={(event) =>
                                    setAssignedUserId(event.target.value)
                                }
                                className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="">Sin usuario responsable</option>
                                {assignableUsers.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.firstName} {user.lastName}
                                    </option>
                                ))}
                            </select>
                            {hasInvalidHistoricAssignee && (
                                <p className="mt-2 text-xs text-amber-700">
                                    El responsable anterior ya no pertenece al equipo activo. Elige un usuario interno o deja la tarea sin responsable.
                                </p>
                            )}
                        </div>
                    </div>

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
                            disabled={isSaving || subProjects.length === 0}
                            className="h-10 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSaving ? "Guardando..." : "Guardar tarea"}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}
