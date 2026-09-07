"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { ApiError } from "@/services/api";
import { subTasksService } from "@/services/subtasks.service";
import { TaskItem } from "@/types/task.types";
import { SUBTASK_STATUSES, SubTask } from "@/types/subtask.types";
import { User } from "@/types/user.types";
import { getAssignableUsers } from "@/lib/assignment";

interface SubTaskFormModalProps {
    subTask: SubTask | null;
    initialTaskItemId?: string;
    initialStatus?: string;
    tasks: TaskItem[];
    users: User[];
    hideAssignee?: boolean;
    assigneeLabel?: string;
    onClose: () => void;
    onSaved: () => Promise<void>;
}

export function SubTaskFormModal({
    subTask,
    initialTaskItemId,
    initialStatus,
    tasks,
    users,
    hideAssignee = false,
    assigneeLabel,
    onClose,
    onSaved
}: SubTaskFormModalProps) {
    const assignableUsers = getAssignableUsers(users);
    const initialAssignedUserId = subTask?.assignedUserId ?? "";
    const hasInvalidHistoricAssignee = Boolean(
        initialAssignedUserId &&
        !assignableUsers.some((user) => user.id === initialAssignedUserId)
    );
    const [title, setTitle] = useState(subTask?.title ?? "");
    const [detail, setDetail] = useState(subTask?.detail ?? "");
    const [startDate, setStartDate] = useState(subTask?.startDate ?? "");
    const [endDate, setEndDate] = useState(subTask?.endDate ?? "");
    const [status, setStatus] = useState(
        subTask?.status ?? initialStatus ?? "Pendiente"
    );
    const [taskItemId, setTaskItemId] = useState(
        subTask?.taskItemId ?? initialTaskItemId ?? ""
    );
    const [assignedUserId, setAssignedUserId] = useState(
        hasInvalidHistoricAssignee ? "" : initialAssignedUserId
    );
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const isEditing = subTask !== null;

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!title.trim() || !startDate || !status || !taskItemId) {
            setError(
                "Título, fecha inicial, estado y tarea son obligatorios."
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
                status,
                taskItemId,
                // En el flujo operativo el backend obtiene al responsable del
                // JWT. No enviamos una identidad elegida por el cliente.
                assignedUserId: hideAssignee ? null : assignedUserId || null
            };

            if (isEditing) {
                await subTasksService.update(subTask.id, request);
            } else {
                await subTasksService.create(request);
            }

            await onSaved();
            onClose();
        } catch (error) {
            if (error instanceof ApiError) {
                setError(error.message);
            } else {
                setError("No se pudo guardar la subtarea.");
            }
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="subtask-form-title"
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-6"
        >
            <section className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white shadow-xl">
                <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                        <p className="text-xs font-semibold uppercase text-blue-600">
                            Operaciones
                        </p>
                        <h2
                            id="subtask-form-title"
                            className="mt-1 text-lg font-semibold text-gray-900"
                        >
                            {isEditing ? "Editar subtarea" : "Nueva subtarea"}
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
                            htmlFor="subtask-title"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Título
                        </label>
                        <input
                            id="subtask-title"
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
                            htmlFor="subtask-detail"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Detalle
                        </label>
                        <textarea
                            id="subtask-detail"
                            value={detail}
                            onChange={(event) => setDetail(event.target.value)}
                            rows={3}
                            maxLength={1000}
                            className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-3">
                        <div>
                            <label
                                htmlFor="subtask-start-date"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Fecha inicial
                            </label>
                            <input
                                id="subtask-start-date"
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
                                htmlFor="subtask-end-date"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Fecha final
                            </label>
                            <input
                                id="subtask-end-date"
                                type="date"
                                value={endDate}
                                min={startDate || undefined}
                                onChange={(event) =>
                                    setEndDate(event.target.value)
                                }
                                className="h-11 w-full rounded-md border border-gray-300 px-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="subtask-status"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Estado
                            </label>
                            <select
                                id="subtask-status"
                                value={status}
                                onChange={(event) => setStatus(event.target.value)}
                                required
                                className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            >
                                {SUBTASK_STATUSES.map((statusOption) => (
                                    <option key={statusOption} value={statusOption}>
                                        {statusOption}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="subtask-task"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Tarea
                            </label>
                            <select
                                id="subtask-task"
                                value={taskItemId}
                                onChange={(event) =>
                                    setTaskItemId(event.target.value)
                                }
                                required
                                className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="">Seleccionar tarea</option>
                                {tasks.map((task) => (
                                    <option key={task.id} value={task.id}>
                                        {task.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {hideAssignee ? (
                            <div>
                                <span className="mb-2 block text-sm font-medium text-gray-700">
                                    Usuario responsable
                                </span>
                                <div className="flex h-11 w-full items-center rounded-md border border-gray-300 bg-gray-50 px-3 text-gray-900">
                                    {assigneeLabel || "Tú (sesión actual)"}
                                </div>
                                <p className="mt-2 text-xs text-gray-500">
                                    La subtarea se asignará automáticamente a tu usuario.
                                </p>
                            </div>
                        ) : (
                        <div>
                            <label
                                htmlFor="subtask-user"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Usuario responsable
                            </label>
                            <select
                                id="subtask-user"
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
                                    El responsable anterior ya no pertenece al equipo activo. Elige un usuario interno o deja la subtarea sin responsable.
                                </p>
                            )}
                        </div>
                        )}
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
                            disabled={isSaving || tasks.length === 0}
                            className="h-10 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSaving ? "Guardando..." : "Guardar subtarea"}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}
