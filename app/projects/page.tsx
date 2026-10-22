"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";
import Link from "next/link";
import {
    ArrowRight,
    CheckCircle2,
    CircleDashed,
    Clock3,
    CalendarDays,
    Pencil,
    Plus,
    RefreshCw,
    Trash2
} from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PROJECT_MANAGER_ROLES } from "@/lib/roles";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/roles";
import { AppShell } from "@/components/layout/AppShell";
import { ProjectDeleteDialog } from "@/components/projects/ProjectDeleteDialog";
import { ProjectFormModal } from "@/components/projects/ProjectFormModal";
import { ApiError } from "@/services/api";
import { projectsService } from "@/services/projects.service";
import { subProjectsService } from "@/services/subprojects.service";
import { tasksService } from "@/services/tasks.service";
import { projectTypesService } from "@/services/project-types.service";
import { clientCompaniesService } from "@/services/client-companies.service";
import { loadAllPages } from "@/services/pagination";
import { Project, ProjectResponsible } from "@/types/project.types";
import { ProjectType } from "@/types/project-type.types";
import { SubProject } from "@/types/subproject.types";
import { TaskItem } from "@/types/task.types";
import { ClientCompany } from "@/types/client-company.types";

function formatDate(value: string | null): string {
    if (!value) {
        return "Sin fecha";
    }

    const [year, month, day] = value.split("-").map(Number);

    return new Intl.DateTimeFormat("es-BO").format(
        new Date(year, month - 1, day)
    );
}

function projectStatusStyle(status: string): string {
    if (status === "Completado") return "bg-emerald-50 text-emerald-700";
    if (status === "En proceso") return "bg-blue-50 text-blue-700";
    return "bg-amber-50 text-amber-800";
}

function getProjectSchedule(startDate: string, endDate: string | null): {
    label: string;
    className: string;
} {
    const today = new Date().toISOString().slice(0, 10);

    if (startDate > today) {
        return { label: "Aún no inicia", className: "text-gray-500" };
    }

    if (!endDate) {
        return { label: "En curso", className: "text-gray-500" };
    }

    const days = Math.round(
        (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000
    );

    if (days < 0) {
        return {
            label: `${Math.abs(days)} ${Math.abs(days) === 1 ? "día" : "días"} de atraso`,
            className: "text-red-600"
        };
    }

    if (days === 0) {
        return { label: "Vence hoy", className: "text-amber-700" };
    }

    return {
        label: `${days} ${days === 1 ? "día restante" : "días restantes"}`,
        className: "text-amber-700"
    };
}

export default function ProjectsPage() {
    const { user } = useAuth();
    const hasLegacyDirectorProjectManagement =
        user?.roleName === "Director" && user.permissionsVersion !== 3;
    const canCreate = hasLegacyDirectorProjectManagement || hasPermission(user?.permissions, "projects.create");
    const canUpdate = hasLegacyDirectorProjectManagement || hasPermission(user?.permissions, "projects.update");
    const canDelete = hasLegacyDirectorProjectManagement || hasPermission(user?.permissions, "projects.delete");
    const canViewClients = hasLegacyDirectorProjectManagement || hasPermission(user?.permissions, "client_companies.view");
    const needsCatalogs = canCreate || canUpdate;
    const [projects, setProjects] = useState<Project[]>([]);
    const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
    const [clients, setClients] = useState<ClientCompany[]>([]);
    const [responsibles, setResponsibles] = useState<ProjectResponsible[]>([]);
    const [subProjects, setSubProjects] = useState<SubProject[]>([]);
    const [tasks, setTasks] = useState<TaskItem[]>([]);
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
            const [loadedProjects, loadedProjectTypes, loadedClients, loadedResponsibles, visibleSubProjects, loadedTasks] =
                await Promise.all([
                    loadAllPages((page, pageSize) => projectsService.getAll({ page, pageSize })),
                    needsCatalogs ? loadAllPages((page, pageSize) => projectTypesService.getAll({ page, pageSize })) : Promise.resolve([] as ProjectType[]),
                    needsCatalogs && canViewClients ? loadAllPages((page, pageSize) => clientCompaniesService.getAll({ page, pageSize })) : Promise.resolve([] as ClientCompany[]),
                    needsCatalogs ? projectsService.getResponsibles() : Promise.resolve([] as ProjectResponsible[]),
                    loadAllPages((page, pageSize) => subProjectsService.getAll({ page, pageSize })),
                    loadAllPages((page, pageSize) => tasksService.getAll({ page, pageSize }))
                ]);

            const visibleSubProjectIds = new Set(visibleSubProjects.map((item) => item.id));

            setProjects(loadedProjects);
            setProjectTypes(loadedProjectTypes);
            setClients(loadedClients);
            setResponsibles(loadedResponsibles);
            setSubProjects(visibleSubProjects);
            setTasks(loadedTasks.filter((task) => visibleSubProjectIds.has(task.subProjectId)));
        } catch (error) {
            if (error instanceof ApiError) {
                setError(error.message);
            } else {
                setError("No se pudieron cargar los proyectos.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [canViewClients, needsCatalogs]);

    const projectProgressById = useMemo(() => {
        const tasksBySubProject = new Map<string, TaskItem[]>();
        tasks.forEach((task) => {
            tasksBySubProject.set(task.subProjectId, [
                ...(tasksBySubProject.get(task.subProjectId) ?? []),
                task
            ]);
        });
        const subProjectsByProject = new Map<string, SubProject[]>();
        subProjects.forEach((subProject) => {
            subProjectsByProject.set(subProject.projectId, [
                ...(subProjectsByProject.get(subProject.projectId) ?? []),
                subProject
            ]);
        });

        return new Map(projects.map((project) => {
            const relatedSubProjects = subProjectsByProject.get(project.id) ?? [];
            const completed = relatedSubProjects.filter((subProject) => {
                const relatedTasks = tasksBySubProject.get(subProject.id) ?? [];
                return relatedTasks.length > 0
                    ? relatedTasks.every((task) => task.status === "Completado" || task.status === "Completada")
                    : subProject.status === "Completado";
            }).length;
            const percentage = relatedSubProjects.length > 0
                ? Math.round(completed * 100 / relatedSubProjects.length)
                : null;
            const status = percentage === 100
                ? "Completado"
                : completed > 0 || relatedSubProjects.some((item) => item.status === "En curso")
                    ? "En proceso"
                    : "Pendiente";

            return [project.id, {
                total: relatedSubProjects.length,
                completed,
                percentage,
                status
            }];
        }));
    }, [projects, subProjects, tasks]);

    const projectSummary = useMemo(() => {
        const values = Array.from(projectProgressById.values());
        const withProgress = values.filter((item) => item.percentage !== null);
        return {
            inProgress: values.filter((item) => item.status === "En proceso").length,
            pending: values.filter((item) => item.status === "Pendiente").length,
            completed: values.filter((item) => item.status === "Completado").length,
            average: withProgress.length > 0
                ? Math.round(withProgress.reduce((sum, item) => sum + (item.percentage ?? 0), 0) / withProgress.length)
                : null
        };
    }, [projectProgressById]);

    useEffect(() => {
        // Carga inicial de proyectos y catálogos relacionados.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadData();
    }, [loadData]);

    return (
        <RequireAuth allowedRoles={PROJECT_MANAGER_ROLES} allowedPermission="projects.view">
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
                        {canCreate && (projectTypes.length === 0 && !isLoading
                            ? <Link
                                href="/project-types"
                                title="Primero debe existir al menos un tipo de proyecto"
                                className="flex h-10 items-center gap-2 rounded-md bg-amber-500 px-4 text-sm font-semibold text-white transition hover:bg-amber-600"
                            >
                                <Plus size={18} />
                                Crear tipo de proyecto
                            </Link>
                            : <button
                                type="button"
                                onClick={() => {
                                    setSelectedProject(null);
                                    setIsFormOpen(true);
                                }}
                                disabled={isLoading}
                                className="flex h-10 items-center gap-2 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Plus size={18} />
                                Nuevo proyecto
                            </button>)}

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

                {!isLoading && canCreate && projectTypes.length === 0 && (
                    <div
                        role="status"
                        className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                    >
                        No hay tipos de proyecto activos. Cree uno para poder registrar un proyecto nuevo.
                    </div>
                )}

                {!isLoading && projects.length > 0 && (
                    <section className="mb-5 grid overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm sm:grid-cols-2 xl:grid-cols-5">
                        <ProjectMetric label="Total de proyectos" value={projects.length} detail="registrados" icon={CircleDashed} />
                        <ProjectMetric label="En proceso" value={projectSummary.inProgress} detail="con avance parcial" icon={Clock3} tone="blue" />
                        <ProjectMetric label="Pendientes" value={projectSummary.pending} detail="sin avance" icon={CircleDashed} tone="amber" />
                        <ProjectMetric label="Completados" value={projectSummary.completed} detail="avance finalizado" icon={CheckCircle2} tone="green" />
                        <ProjectMetric label="Avance promedio" value={projectSummary.average === null ? "—" : `${projectSummary.average}%`} detail={projectSummary.average === null ? "Sin subproyectos" : "según subproyectos"} icon={CheckCircle2} tone="blue" progress={projectSummary.average} />
                    </section>
                )}

                <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1180px] border-collapse text-left">
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
                                        Responsable
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Avance general
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Estado
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
                                            colSpan={8}
                                            className="px-5 py-10 text-center text-sm text-gray-500"
                                        >
                                            Cargando proyectos...
                                        </td>
                                    </tr>
                                ) : projects.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-5 py-10 text-center text-sm text-gray-500"
                                        >
                                            No existen proyectos registrados.
                                        </td>
                                    </tr>
                                ) : (
                                    projects.map((project) => {
                                        const progress = projectProgressById.get(project.id);
                                        const schedule = getProjectSchedule(
                                            project.startDate,
                                            project.endDate
                                        );
                                        const clientName = project.clientCompanyName ?? "";

                                        return (
                                            <tr
                                                key={project.id}
                                                className="transition hover:bg-gray-50"
                                            >
                                                <td className="max-w-sm px-5 py-4">
                                                    <Link
                                                        href={`/projects/${project.id}`}
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
                                                    <p className="font-medium text-gray-800">
                                                        {[project.responsibleUserFirstName, project.responsibleUserLastName]
                                                            .filter(Boolean).join(" ") || "Sin responsable"}
                                                    </p>
                                                    {project.responsibleUserJobPositionName && (
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            {project.responsibleUserJobPositionName}
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="min-w-52 px-5 py-4">
                                                    {progress?.percentage === null ? <span className="text-sm text-gray-500">Sin subproyectos</span> : <div><div className="mb-2 flex justify-between text-xs text-gray-500"><span>{progress?.completed} de {progress?.total} subproyectos</span><strong className="text-gray-800">{progress?.percentage}%</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-gray-100"><div className={`h-full rounded-full ${progress?.percentage === 100 ? "bg-emerald-600" : "bg-blue-600"}`} style={{ width: `${progress?.percentage ?? 0}%` }} /></div></div>}
                                                </td>

                                                <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${projectStatusStyle(progress?.status ?? "Pendiente")}`}>{progress?.status ?? "Pendiente"}</span></td>

                                                <td className="px-5 py-4 text-sm text-gray-600">
                                                    <div className="flex items-start gap-2">
                                                        <CalendarDays size={15} className="mt-0.5 shrink-0 text-gray-400" />
                                                        <div>
                                                            <p>{formatDate(project.startDate)} - {formatDate(project.endDate)}</p>
                                                            <p className={`mt-1 text-xs font-medium ${schedule.className}`}>{schedule.label}</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {canUpdate && <button
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
                                                        </button>}

                                                        {canDelete && <button
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
                    <ProjectFormModal
                        project={selectedProject}
                        projectTypes={projectTypes}
                        clients={clients}
                        responsibles={responsibles}
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

function ProjectMetric({ icon: Icon, label, value, detail, tone = "gray", progress }: { icon: typeof CircleDashed; label: string; value: number | string; detail: string; tone?: "gray" | "blue" | "amber" | "green"; progress?: number | null }) {
    const styles = { gray: "text-gray-700", blue: "text-blue-700", amber: "text-amber-700", green: "text-emerald-700" };
    return <div className="border-b border-gray-100 px-5 py-4 last:border-b-0 xl:border-b-0 xl:border-r xl:last:border-r-0"><div className="flex items-center justify-between gap-3"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">{label}</p><Icon size={17} className={styles[tone]} /></div><p className={`mt-2 text-xl font-bold ${styles[tone]}`}>{value}</p><p className="mt-1 text-xs text-gray-500">{detail}</p>{progress !== undefined && progress !== null && <div className="mt-3 h-1 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} /></div>}</div>;
}
