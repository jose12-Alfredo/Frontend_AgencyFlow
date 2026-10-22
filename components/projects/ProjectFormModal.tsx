"use client";

import {
    FormEvent,
    useState
} from "react";
import { X } from "lucide-react";
import { ApiError } from "@/services/api";
import { projectsService } from "@/services/projects.service";
import { Project, ProjectResponsible } from "@/types/project.types";
import { ProjectType } from "@/types/project-type.types";
import { ClientCompany } from "@/types/client-company.types";

interface ProjectFormModalProps {
    project: Project | null;
    projectTypes: ProjectType[];
    clients: ClientCompany[];
    responsibles: ProjectResponsible[];
    onClose: () => void;
    onSaved: () => Promise<void>;
}

export function ProjectFormModal({
    project,
    projectTypes,
    clients,
    responsibles,
    onClose,
    onSaved
}: ProjectFormModalProps) {
    const [title, setTitle] = useState(project?.title ?? "");
    const [detail, setDetail] = useState(project?.detail ?? "");
    const [startDate, setStartDate] = useState(project?.startDate ?? "");
    const [endDate, setEndDate] = useState(project?.endDate ?? "");
    const [projectTypeId, setProjectTypeId] = useState(
        project?.projectTypeId ?? ""
    );
    const [clientCompanyId, setClientCompanyId] = useState(
        project?.clientCompanyId ?? ""
    );
    const [responsibleUserId, setResponsibleUserId] = useState(
        project?.responsibleUserId ?? ""
    );
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const isEditing = project !== null;

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!title.trim() || !startDate || !projectTypeId || !responsibleUserId) {
            setError("Título, fecha inicial, tipo de proyecto y responsable son obligatorios.");
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
                projectTypeId,
                clientCompanyId: clientCompanyId || null,
                responsibleUserId
            };

            if (isEditing) {
                await projectsService.update(project.id, request);
            } else {
                await projectsService.create(request);
            }

            await onSaved();
            onClose();
        } catch (error) {
            if (error instanceof ApiError) {
                setError(error.message);
            } else {
                setError("No se pudo guardar el proyecto.");
            }
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-form-title"
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-6"
        >
            <section className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white shadow-xl">
                <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                        <p className="text-xs font-semibold uppercase text-blue-600">
                            Proyectos
                        </p>

                        <h2
                            id="project-form-title"
                            className="mt-1 text-lg font-semibold text-gray-900"
                        >
                            {isEditing ? "Editar proyecto" : "Nuevo proyecto"}
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
                            htmlFor="project-title"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Título
                        </label>

                        <input
                            id="project-title"
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
                            htmlFor="project-detail"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Detalle
                        </label>

                        <textarea
                            id="project-detail"
                            value={detail}
                            onChange={(event) => setDetail(event.target.value)}
                            rows={4}
                            maxLength={1000}
                            className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="project-start-date"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Fecha inicial
                            </label>

                            <input
                                id="project-start-date"
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
                                htmlFor="project-end-date"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Fecha final
                            </label>

                            <input
                                id="project-end-date"
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
                                htmlFor="project-type"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Tipo de proyecto
                            </label>

                            <select
                                id="project-type"
                                value={projectTypeId}
                                onChange={(event) =>
                                    setProjectTypeId(event.target.value)
                                }
                                required
                                className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="">Seleccionar tipo</option>
                                {projectTypes.map((projectType) => (
                                    <option
                                        key={projectType.id}
                                        value={projectType.id}
                                    >
                                        {projectType.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="project-client"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Empresa cliente
                            </label>

                            <select
                                id="project-client"
                                value={clientCompanyId}
                                onChange={(event) =>
                                    setClientCompanyId(event.target.value)
                                }
                                className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="">Sin empresa cliente</option>
                                {clients.map((client) => (
                                    <option key={client.id} value={client.id}>
                                        {client.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor="project-responsible"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Responsable del proyecto
                        </label>

                        <select
                            id="project-responsible"
                            value={responsibleUserId}
                            onChange={(event) => setResponsibleUserId(event.target.value)}
                            required
                            className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        >
                            <option value="">Seleccionar responsable</option>
                            {responsibles.map((responsible) => (
                                <option key={responsible.id} value={responsible.id}>
                                    {responsible.firstName} {responsible.lastName} — {responsible.jobPositionName || responsible.roleName}
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
                            disabled={isSaving || projectTypes.length === 0 || responsibles.length === 0}
                            className="h-10 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSaving ? "Guardando..." : "Guardar proyecto"}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}
