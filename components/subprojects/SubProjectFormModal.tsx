"use client";

import {
    FormEvent,
    useState
} from "react";
import { X } from "lucide-react";
import { ApiError } from "@/services/api";
import { subProjectsService } from "@/services/subprojects.service";
import { Department } from "@/types/department.types";
import { Project } from "@/types/project.types";
import {
    SUBPROJECT_STATUSES,
    SubProject
} from "@/types/subproject.types";
import { User } from "@/types/user.types";

interface SubProjectFormModalProps {
    subProject: SubProject | null;
    projects: Project[];
    departments: Department[];
    users: User[];
    onClose: () => void;
    onSaved: () => Promise<void>;
}

export function SubProjectFormModal({
    subProject,
    projects,
    departments,
    users,
    onClose,
    onSaved
}: SubProjectFormModalProps) {
    const [title, setTitle] = useState(subProject?.title ?? "");
    const [detail, setDetail] = useState(subProject?.detail ?? "");
    const [startDate, setStartDate] = useState(
        subProject?.startDate ?? ""
    );
    const [endDate, setEndDate] = useState(subProject?.endDate ?? "");
    const [status, setStatus] = useState(
        subProject?.status ?? "Pendiente"
    );
    const [projectId, setProjectId] = useState(
        subProject?.projectId ?? ""
    );
    const [departmentId, setDepartmentId] = useState(
        subProject?.departmentId ?? ""
    );
    const [assignedUserId, setAssignedUserId] = useState(
        subProject?.assignedUserId ?? ""
    );
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const isEditing = subProject !== null;

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (
            !title.trim() ||
            !startDate ||
            !projectId ||
            !departmentId ||
            !status
        ) {
            setError(
                "Título, fecha inicial, estado, proyecto y departamento son obligatorios."
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
                projectId,
                departmentId,
                assignedUserId: assignedUserId || null
            };

            if (isEditing) {
                await subProjectsService.update(subProject.id, request);
            } else {
                await subProjectsService.create(request);
            }

            await onSaved();
            onClose();
        } catch (error) {
            if (error instanceof ApiError) {
                setError(error.message);
            } else {
                setError("No se pudo guardar el subproyecto.");
            }
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="subproject-form-title"
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-6"
        >
            <section className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white shadow-xl">
                <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                        <p className="text-xs font-semibold uppercase text-blue-600">
                            Operaciones
                        </p>

                        <h2
                            id="subproject-form-title"
                            className="mt-1 text-lg font-semibold text-gray-900"
                        >
                            {isEditing
                                ? "Editar subproyecto"
                                : "Nuevo subproyecto"}
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
                            htmlFor="subproject-title"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Título
                        </label>

                        <input
                            id="subproject-title"
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
                            htmlFor="subproject-detail"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Detalle
                        </label>

                        <textarea
                            id="subproject-detail"
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
                                htmlFor="subproject-start-date"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Fecha inicial
                            </label>

                            <input
                                id="subproject-start-date"
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
                                htmlFor="subproject-end-date"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Fecha final
                            </label>

                            <input
                                id="subproject-end-date"
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
                                htmlFor="subproject-status"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Estado
                            </label>

                            <select
                                id="subproject-status"
                                value={status}
                                onChange={(event) =>
                                    setStatus(event.target.value)
                                }
                                required
                                className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            >
                                {SUBPROJECT_STATUSES.map((statusOption) => (
                                    <option
                                        key={statusOption}
                                        value={statusOption}
                                    >
                                        {statusOption}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="subproject-project"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Proyecto
                            </label>

                            <select
                                id="subproject-project"
                                value={projectId}
                                onChange={(event) =>
                                    setProjectId(event.target.value)
                                }
                                required
                                className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="">Seleccionar proyecto</option>
                                {projects.map((project) => (
                                    <option key={project.id} value={project.id}>
                                        {project.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="subproject-department"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Departamento
                            </label>

                            <select
                                id="subproject-department"
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
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor="subproject-user"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Usuario asignado
                        </label>

                        <select
                            id="subproject-user"
                            value={assignedUserId}
                            onChange={(event) =>
                                setAssignedUserId(event.target.value)
                            }
                            className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        >
                            <option value="">Sin usuario asignado</option>
                            {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.firstName} {user.lastName}
                                </option>
                            ))}
                        </select>
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
                            disabled={
                                isSaving ||
                                projects.length === 0 ||
                                departments.length === 0
                            }
                            className="h-10 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSaving ? "Guardando..." : "Guardar subproyecto"}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}
