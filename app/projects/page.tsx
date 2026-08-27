"use client";

import {
    useCallback,
    useEffect,
    useState
} from "react";
import Link from "next/link";
import {
    ArrowRight,
    Pencil,
    Plus,
    RefreshCw,
    Trash2
} from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { ProjectDeleteDialog } from "@/components/projects/ProjectDeleteDialog";
import { ProjectFormModal } from "@/components/projects/ProjectFormModal";
import { ApiError } from "@/services/api";
import { projectsService } from "@/services/projects.service";
import { projectTypesService } from "@/services/project-types.service";
import { usersService } from "@/services/users.service";
import { Project } from "@/types/project.types";
import { ProjectType } from "@/types/project-type.types";
import { User } from "@/types/user.types";

function formatDate(value: string | null): string {
    if (!value) {
        return "Sin fecha";
    }

    const [year, month, day] = value.split("-").map(Number);

    return new Intl.DateTimeFormat("es-BO").format(
        new Date(year, month - 1, day)
    );
}

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
    const [clients, setClients] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedProject, setSelectedProject] =
        useState<Project | null>(null);
    const [projectToDelete, setProjectToDelete] =
        useState<Project | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const [projectsResult, projectTypesResult, clientsResult] =
                await Promise.all([
                    projectsService.getAll({ page: 1, pageSize: 100 }),
                    projectTypesService.getAll({ page: 1, pageSize: 100 }),
                    usersService.getClients({ page: 1, pageSize: 100 })
                ]);

            setProjects(projectsResult.items);
            setProjectTypes(projectTypesResult.items);
            setClients(clientsResult.items);
        } catch (error) {
            if (error instanceof ApiError) {
                setError(error.message);
            } else {
                setError("No se pudieron cargar los proyectos.");
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Carga inicial de proyectos y catálogos relacionados.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadData();
    }, [loadData]);

    return (
        <RequireAuth>
            <AppShell>
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-blue-600">
                            Operaciones
                        </p>

                        <h1 className="mt-1 text-2xl font-semibold text-gray-900">
                            Proyectos
                        </h1>

                        <p className="mt-2 text-sm text-gray-600">
                            Trabajos contratados y planificados por la agencia.
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedProject(null);
                                setIsFormOpen(true);
                            }}
                            disabled={isLoading || projectTypes.length === 0}
                            className="flex h-10 items-center gap-2 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Plus size={18} />
                            Nuevo proyecto
                        </button>

                        <button
                            type="button"
                            title="Actualizar proyectos"
                            aria-label="Actualizar proyectos"
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
                        <table className="w-full min-w-[1000px] border-collapse text-left">
                            <thead className="border-b border-gray-200 bg-gray-50">
                                <tr>
                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Proyecto
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Tipo
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Cliente
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Periodo
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
                                            colSpan={5}
                                            className="px-5 py-10 text-center text-sm text-gray-500"
                                        >
                                            Cargando proyectos...
                                        </td>
                                    </tr>
                                ) : projects.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-5 py-10 text-center text-sm text-gray-500"
                                        >
                                            No existen proyectos registrados.
                                        </td>
                                    </tr>
                                ) : (
                                    projects.map((project) => {
                                        const clientName = [
                                            project.clientUserFirstName,
                                            project.clientUserLastName
                                        ].filter(Boolean).join(" ");

                                        return (
                                            <tr
                                                key={project.id}
                                                className="transition hover:bg-gray-50"
                                            >
                                                <td className="max-w-sm px-5 py-4">
                                                    <Link
                                                        href={`/subprojects?projectId=${project.id}`}
                                                        className="group flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-blue-700"
                                                    >
                                                        <span>{project.title}</span>
                                                        <ArrowRight
                                                            size={15}
                                                            className="shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600"
                                                        />
                                                    </Link>

                                                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                                                        {project.detail ||
                                                            "Sin detalle"}
                                                    </p>
                                                </td>

                                                <td className="px-5 py-4 text-sm text-gray-700">
                                                    {project.projectTypeName}
                                                </td>

                                                <td className="px-5 py-4 text-sm text-gray-600">
                                                    <p className="font-medium text-gray-800">
                                                        {project.clientCompanyName ||
                                                            "Sin empresa cliente"}
                                                    </p>
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {clientName
                                                            ? `Contacto: ${clientName}`
                                                            : "Sin contacto asignado"}
                                                    </p>
                                                </td>

                                                <td className="px-5 py-4 text-sm text-gray-600">
                                                    <p>
                                                        {formatDate(
                                                            project.startDate
                                                        )}
                                                    </p>
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        hasta{" "}
                                                        {formatDate(
                                                            project.endDate
                                                        )}
                                                    </p>
                                                </td>

                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            type="button"
                                                            title="Editar proyecto"
                                                            aria-label={`Editar ${project.title}`}
                                                            onClick={() => {
                                                                setSelectedProject(
                                                                    project
                                                                );
                                                                setIsFormOpen(
                                                                    true
                                                                );
                                                            }}
                                                            className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                                                        >
                                                            <Pencil size={18} />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            title="Eliminar proyecto"
                                                            aria-label={`Eliminar ${project.title}`}
                                                            onClick={() =>
                                                                setProjectToDelete(
                                                                    project
                                                                )
                                                            }
                                                            className="rounded-md p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
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
                    <ProjectFormModal
                        project={selectedProject}
                        projectTypes={projectTypes}
                        clients={clients}
                        onClose={() => {
                            setIsFormOpen(false);
                            setSelectedProject(null);
                        }}
                        onSaved={loadData}
                    />
                )}

                {projectToDelete && (
                    <ProjectDeleteDialog
                        project={projectToDelete}
                        onClose={() => setProjectToDelete(null)}
                        onDeleted={loadData}
                    />
                )}
            </AppShell>
        </RequireAuth>
    );
}
