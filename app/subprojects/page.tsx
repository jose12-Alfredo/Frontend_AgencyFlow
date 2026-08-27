"use client";

import {
    useCallback,
    useEffect,
    Suspense,
    useState
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    ArrowLeft,
    ArrowRight,
    Pencil,
    Plus,
    RefreshCw,
    Trash2
} from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { SubProjectDeleteDialog } from "@/components/subprojects/SubProjectDeleteDialog";
import { SubProjectFormModal } from "@/components/subprojects/SubProjectFormModal";
import { ApiError } from "@/services/api";
import { departmentsService } from "@/services/departments.service";
import { projectsService } from "@/services/projects.service";
import { subProjectsService } from "@/services/subprojects.service";
import { usersService } from "@/services/users.service";
import { Department } from "@/types/department.types";
import { Project } from "@/types/project.types";
import { SubProject } from "@/types/subproject.types";
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

function getStatusClass(status: string): string {
    switch (status) {
        case "Completado":
            return "bg-emerald-50 text-emerald-700";
        case "En curso":
            return "bg-blue-50 text-blue-700";
        default:
            return "bg-amber-50 text-amber-700";
    }
}

export default function SubProjectsPage() {
    return (
        <Suspense
            fallback={
                <div className="p-6 text-sm text-gray-500">
                    Cargando subproyectos...
                </div>
            }
        >
            <SubProjectsContent />
        </Suspense>
    );
}

function SubProjectsContent() {
    const searchParams = useSearchParams();
    const projectId = searchParams.get("projectId") ?? "";
    const [subProjects, setSubProjects] = useState<SubProject[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedSubProject, setSelectedSubProject] =
        useState<SubProject | null>(null);
    const [subProjectToDelete, setSubProjectToDelete] =
        useState<SubProject | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const [
                subProjectsResult,
                projectsResult,
                departmentsResult,
                usersResult
            ] = await Promise.all([
                subProjectsService.getAll({
                    page: 1,
                    pageSize: 100,
                    projectId: projectId || undefined
                }),
                projectsService.getAll({ page: 1, pageSize: 100 }),
                departmentsService.getAll({ page: 1, pageSize: 100 }),
                usersService.getAll({ page: 1, pageSize: 100 })
            ]);

            setSubProjects(subProjectsResult.items);
            setProjects(projectsResult.items);
            setDepartments(departmentsResult.items);
            setUsers(usersResult.items);
        } catch (error) {
            if (error instanceof ApiError) {
                setError(error.message);
            } else {
                setError("No se pudieron cargar los subproyectos.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    const filteredProject = projects.find(
        (project) => project.id === projectId
    );

    useEffect(() => {
        // Carga inicial de subproyectos y catálogos relacionados.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadData();
    }, [loadData]);

    return (
        <RequireAuth>
            <AppShell>
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        {filteredProject ? (
                            <Link
                                href="/projects"
                                className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                                <ArrowLeft size={16} />
                                Proyectos
                            </Link>
                        ) : (
                            <p className="text-sm font-medium text-blue-600">
                                Operaciones
                            </p>
                        )}

                        <h1 className="mt-1 text-2xl font-semibold text-gray-900">
                            {filteredProject
                                ? `Subproyectos de ${filteredProject.title}`
                                : "Subproyectos"}
                        </h1>

                        <p className="mt-2 text-sm text-gray-600">
                            Etapas de trabajo asociadas a cada proyecto.
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedSubProject(null);
                                setIsFormOpen(true);
                            }}
                            disabled={
                                isLoading ||
                                projects.length === 0 ||
                                departments.length === 0
                            }
                            className="flex h-10 items-center gap-2 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Plus size={18} />
                            Nuevo subproyecto
                        </button>

                        <button
                            type="button"
                            title="Actualizar subproyectos"
                            aria-label="Actualizar subproyectos"
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
                        <table className="w-full min-w-[1150px] border-collapse text-left">
                            <thead className="border-b border-gray-200 bg-gray-50">
                                <tr>
                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Subproyecto
                                    </th>
                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Proyecto
                                    </th>
                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Departamento
                                    </th>
                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Responsable
                                    </th>
                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Estado y periodo
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
                                            Cargando subproyectos...
                                        </td>
                                    </tr>
                                ) : subProjects.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-5 py-10 text-center text-sm text-gray-500"
                                        >
                                            {filteredProject
                                                ? "Este proyecto todavía no tiene subproyectos."
                                                : "No existen subproyectos registrados."}
                                        </td>
                                    </tr>
                                ) : (
                                    subProjects.map((subProject) => {
                                        const assignedUserName = [
                                            subProject.assignedUserFirstName,
                                            subProject.assignedUserLastName
                                        ].filter(Boolean).join(" ");

                                        return (
                                            <tr
                                                key={subProject.id}
                                                className="transition hover:bg-gray-50"
                                            >
                                                <td className="max-w-xs px-5 py-4">
                                                    <Link
                                                        href={`/tasks?projectId=${subProject.projectId}&subProjectId=${subProject.id}`}
                                                        className="group flex items-start gap-2 text-sm font-semibold text-gray-900 hover:text-blue-700"
                                                    >
                                                        <span>{subProject.title}</span>
                                                        <ArrowRight
                                                            size={15}
                                                            className="mt-0.5 shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600"
                                                        />
                                                    </Link>
                                                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                                                        {subProject.detail ||
                                                            "Sin detalle"}
                                                    </p>
                                                </td>

                                                <td className="px-5 py-4 text-sm text-gray-700">
                                                    <p className="font-medium text-gray-800">
                                                        {subProject.projectTitle}
                                                    </p>
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {subProject.clientCompanyName ||
                                                            "Sin empresa cliente"}
                                                    </p>
                                                </td>

                                                <td className="px-5 py-4 text-sm text-gray-700">
                                                    {subProject.departmentName}
                                                </td>

                                                <td className="px-5 py-4 text-sm text-gray-600">
                                                    {assignedUserName ||
                                                        "Sin responsable"}
                                                </td>

                                                <td className="px-5 py-4 text-sm text-gray-600">
                                                    <span
                                                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(subProject.status)}`}
                                                    >
                                                        {subProject.status}
                                                    </span>
                                                    <p className="mt-2 text-xs text-gray-500">
                                                        {formatDate(
                                                            subProject.startDate
                                                        )}{" "}
                                                        -{" "}
                                                        {formatDate(
                                                            subProject.endDate
                                                        )}
                                                    </p>
                                                </td>

                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            type="button"
                                                            title="Editar subproyecto"
                                                            aria-label={`Editar ${subProject.title}`}
                                                            onClick={() => {
                                                                setSelectedSubProject(
                                                                    subProject
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
                                                            title="Eliminar subproyecto"
                                                            aria-label={`Eliminar ${subProject.title}`}
                                                            onClick={() =>
                                                                setSubProjectToDelete(
                                                                    subProject
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
                    <SubProjectFormModal
                        subProject={selectedSubProject}
                        projects={projects}
                        departments={departments}
                        users={users}
                        onClose={() => {
                            setIsFormOpen(false);
                            setSelectedSubProject(null);
                        }}
                        onSaved={loadData}
                    />
                )}

                {subProjectToDelete && (
                    <SubProjectDeleteDialog
                        subProject={subProjectToDelete}
                        onClose={() => setSubProjectToDelete(null)}
                        onDeleted={loadData}
                    />
                )}
            </AppShell>
        </RequireAuth>
    );
}
