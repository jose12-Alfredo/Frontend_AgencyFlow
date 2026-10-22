"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowRight, CalendarDays, CalendarRange, Eye, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { WorkHierarchyBreadcrumbs } from "@/components/navigation/WorkHierarchyBreadcrumbs";
import { SubProjectFormModal } from "@/components/subprojects/SubProjectFormModal";
import { SubProjectDeleteDialog } from "@/components/subprojects/SubProjectDeleteDialog";
import { useAuth } from "@/context/AuthContext";
import { PROJECT_MANAGER_ROLES, hasPermission } from "@/lib/roles";
import { ApiError } from "@/services/api";
import { projectsService } from "@/services/projects.service";
import { subProjectsService } from "@/services/subprojects.service";
import { tasksService } from "@/services/tasks.service";
import { loadAllPages } from "@/services/pagination";
import { ProjectFull, SubProjectSummary } from "@/types/project.types";
import { SubProject, SubProjectFormOptions } from "@/types/subproject.types";
import { TaskItem } from "@/types/task.types";

function formatDate(value: string | null): string {
    if (!value) return "Sin fecha";
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("es-BO").format(new Date(year, month - 1, day));
}

function getStatusClass(status: string): string {
    switch (status) {
        case "Completado":
        case "Completada":
            return "bg-emerald-50 text-emerald-700";
        case "En curso":
        case "En proceso":
            return "bg-blue-50 text-blue-700";
        case "Retrasado":
            return "bg-red-50 text-red-700";
        default:
            return "bg-amber-50 text-amber-700";
    }
}

function getSchedule(startDate: string, endDate: string | null) {
    const today = new Date().toISOString().slice(0, 10);
    if (startDate > today) return { label: "Aún no inicia", className: "text-gray-500" };
    if (!endDate) return { label: "En curso", className: "text-gray-500" };

    const days = Math.round(
        (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000
    );
    if (days < 0) {
        const overdueDays = Math.abs(days);
        return {
            label: `${overdueDays} ${overdueDays === 1 ? "día de atraso" : "días de atraso"}`,
            className: "text-red-600"
        };
    }
    if (days === 0) return { label: "Vence hoy", className: "text-amber-700" };
    return {
        label: `${days} ${days === 1 ? "día restante" : "días restantes"}`,
        className: "text-amber-700"
    };
}

export default function ProjectDetailPage() {
    const { user } = useAuth();
    const { id } = useParams<{ id: string }>();
    const [project, setProject] = useState<ProjectFull | null>(null);
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [subProjectRecords, setSubProjectRecords] = useState<SubProject[]>([]);
    const [formOptions, setFormOptions] = useState<SubProjectFormOptions>({ departments: [], users: [] });
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedSubProject, setSelectedSubProject] = useState<SubProject | null>(null);
    const [subProjectToDelete, setSubProjectToDelete] = useState<SubProject | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const canCreateSubProject = hasPermission(user?.permissions, "subprojects.create");
    const canUpdateSubProject = hasPermission(user?.permissions, "subprojects.update");
    const canDeleteSubProject = hasPermission(user?.permissions, "subprojects.delete");
    const needsFormOptions = canCreateSubProject || canUpdateSubProject;

    const load = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);

        try {
            const [result, loadedTasks, loadedSubProjects, loadedFormOptions] = await Promise.all([
                projectsService.getFull(id),
                loadAllPages((page, pageSize) =>
                    tasksService.getAll({ page, pageSize, projectId: id })
                ),
                loadAllPages((page, pageSize) =>
                    subProjectsService.getAll({ page, pageSize, projectId: id })
                ),
                needsFormOptions
                    ? subProjectsService.getFormOptions(id)
                    : Promise.resolve({ departments: [], users: [] } as SubProjectFormOptions)
            ]);

            const visibleIds = new Set(result.subProjects.map((subProject) => subProject.id));
            setProject(result);
            setTasks(loadedTasks.filter((task) => visibleIds.has(task.subProjectId)));
            setSubProjectRecords(loadedSubProjects.filter((subProject) => visibleIds.has(subProject.id)));
            setFormOptions(loadedFormOptions);
        } catch (cause) {
            setError(cause instanceof ApiError ? cause.message : "No se pudo cargar el proyecto.");
        } finally {
            setLoading(false);
        }
    }, [id, needsFormOptions, user]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    const taskSummaryBySubProject = useMemo(() => {
        const summaries = new Map<string, { total: number; completed: number }>();
        tasks.forEach((task) => {
            const summary = summaries.get(task.subProjectId) ?? { total: 0, completed: 0 };
            summary.total += 1;
            if (task.status === "Completado" || task.status === "Completada") summary.completed += 1;
            summaries.set(task.subProjectId, summary);
        });
        return summaries;
    }, [tasks]);

    function getEffectiveStatus(subProject: SubProjectSummary): string {
        const summary = taskSummaryBySubProject.get(subProject.id);
        if (summary && summary.total > 0 && summary.completed === summary.total) return "Completado";
        return summary && summary.completed > 0 ? "En proceso" : subProject.status;
    }

    return (
        <RequireAuth allowedRoles={PROJECT_MANAGER_ROLES}>
            <AppShell>
                {loading ? (
                    <p className="mt-6 text-sm text-gray-500">Cargando proyecto…</p>
                ) : error || !project ? (
                    <section role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {error ?? "El proyecto no está disponible."}
                    </section>
                ) : (
                    <div className="space-y-6">
                        <WorkHierarchyBreadcrumbs items={[
                            { type: "Cliente", label: project.clientCompanyName ?? "Sin empresa cliente", href: project.clientCompanyId ? `/client-companies/${project.clientCompanyId}` : undefined },
                            { type: "Proyecto", label: project.title }
                        ]} />
                        <header className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                            <div className="border-l-4 border-blue-600 px-6 py-5 sm:px-7">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">{project.projectTypeName}</p>
                                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">{project.title}</h1>
                                <p className="mt-2 text-sm leading-6 text-gray-600">{project.detail || "Sin detalle"}</p>
                                <p className="mt-3 text-sm text-gray-600">
                                    <span className="font-semibold text-gray-800">Responsable:</span>{" "}
                                    {[project.responsibleUserFirstName, project.responsibleUserLastName]
                                        .filter(Boolean).join(" ") || "Sin responsable asignado"}
                                    {project.responsibleUserJobPositionName
                                        ? ` · ${project.responsibleUserJobPositionName}`
                                        : ""}
                                </p>
                                <Link href={`/projects/${project.id}/gantt`} className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"><CalendarRange size={17} /> Ver Gantt</Link>
                            </div>
                        </header>

                        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
                                <div>
                                    <h2 className="text-base font-semibold text-gray-950">Subproyectos autorizados</h2>
                                    <p className="mt-1 text-sm text-gray-500">
                                        {project.subProjects.length} {project.subProjects.length === 1 ? "etapa disponible" : "etapas disponibles"} en este proyecto
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {canCreateSubProject && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedSubProject(null);
                                                setIsFormOpen(true);
                                            }}
                                            disabled={formOptions.departments.length === 0}
                                            className="inline-flex h-10 items-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Plus size={17} /> Nuevo subproyecto
                                        </button>
                                    )}
                                    <button type="button" onClick={() => void load()} aria-label="Actualizar subproyectos" title="Actualizar" className="inline-flex size-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                        <RefreshCw size={18} />
                                    </button>
                                </div>
                            </header>

                            {project.subProjects.length === 0 ? (
                                <div className="px-6 py-12 text-center">
                                    <p className="text-sm font-medium text-gray-700">No hay subproyectos disponibles</p>
                                    <p className="mt-1 text-sm text-gray-500">Todavía no existen etapas dentro de tu alcance.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[1050px] border-collapse text-left">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                {["Subproyecto", "Área", "Responsable", "Tareas", "Avance", "Estado", "Periodo"].map((label) => (
                                                    <th key={label} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</th>
                                                ))}
                                                <th className="sticky right-0 z-20 w-24 border-l border-gray-200 bg-gray-50 px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 shadow-[-4px_0_8px_-6px_rgba(15,23,42,0.35)]">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {project.subProjects.map((subProject) => {
                                                const summary = taskSummaryBySubProject.get(subProject.id) ?? { total: 0, completed: 0 };
                                                const progress = summary.total > 0 ? Math.round(summary.completed * 100 / summary.total) : null;
                                                const status = getEffectiveStatus(subProject);
                                                const schedule = getSchedule(subProject.startDate, subProject.endDate);
                                                const responsible = [subProject.assignedUserFirstName, subProject.assignedUserLastName].filter(Boolean).join(" ");
                                                const tasksHref = `/tasks?projectId=${project.id}&subProjectId=${subProject.id}`;
                                                const detailHref = `/subprojects/${subProject.id}`;
                                                const editableSubProject = subProjectRecords.find((item) => item.id === subProject.id);

                                                return (
                                                    <tr key={subProject.id} className="group transition-colors hover:bg-blue-50/30">
                                                        <td className="max-w-xs px-5 py-4">
                                                            <Link href={detailHref} className="flex items-start gap-2 text-sm font-semibold text-gray-950 transition hover:text-blue-700">
                                                                <span>{subProject.title}</span>
                                                                <ArrowRight size={15} className="mt-0.5 shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
                                                            </Link>
                                                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">{subProject.detail || "Sin detalle"}</p>
                                                        </td>
                                                        <td className="px-5 py-4 text-sm text-gray-700">{subProject.departmentName}</td>
                                                        <td className="px-5 py-4 text-sm text-gray-600">{responsible || "Sin responsable"}</td>
                                                        <td className="px-5 py-4 text-sm text-gray-700">
                                                            <p className="font-semibold">{summary.total === 0 ? "—" : `${summary.completed} / ${summary.total}`}</p>
                                                            <p className="mt-1 text-xs text-gray-500">{summary.total === 1 ? "tarea completada" : "tareas completadas"}</p>
                                                        </td>
                                                        <td className="min-w-36 px-5 py-4">
                                                            {progress === null ? <span className="text-sm text-gray-500">Sin tareas</span> : (
                                                                <div>
                                                                    <div className="mb-2 flex justify-between text-xs text-gray-500"><span>Avance</span><strong className="text-gray-800">{progress}%</strong></div>
                                                                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100"><div className={`h-full rounded-full ${progress === 100 ? "bg-emerald-600" : "bg-blue-600"}`} style={{ width: `${progress}%` }} /></div>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(status)}`}>{status}</span></td>
                                                        <td className="px-5 py-4 text-sm text-gray-600">
                                                            <div className="flex items-start gap-2">
                                                                <CalendarDays size={15} className="mt-0.5 shrink-0 text-gray-400" />
                                                                <div><p>{formatDate(subProject.startDate)} - {formatDate(subProject.endDate)}</p><p className={`mt-1 text-xs font-medium ${schedule.className}`}>{schedule.label}</p></div>
                                                            </div>
                                                        </td>
                                                        <td className="sticky right-0 z-10 border-l border-gray-100 bg-white px-5 py-4 text-right shadow-[-4px_0_8px_-6px_rgba(15,23,42,0.25)] group-hover:bg-blue-50/30">
                                                            <Link href={tasksHref} title="Ver tareas" aria-label={`Ver tareas de ${subProject.title}`} className="inline-flex rounded-md p-2 text-gray-500 transition hover:bg-blue-100 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><Eye size={18} /></Link>
                                                            {canUpdateSubProject && editableSubProject && (
                                                                <button
                                                                    type="button"
                                                                    title="Editar subproyecto"
                                                                    aria-label={`Editar ${subProject.title}`}
                                                                    onClick={() => {
                                                                        setSelectedSubProject(editableSubProject);
                                                                        setIsFormOpen(true);
                                                                    }}
                                                                    className="inline-flex rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                                                                >
                                                                    <Pencil size={18} />
                                                                </button>
                                                            )}
                                                            {canDeleteSubProject && editableSubProject && (
                                                                <button
                                                                    type="button"
                                                                    title="Eliminar subproyecto"
                                                                    aria-label={`Eliminar ${subProject.title}`}
                                                                    onClick={() => setSubProjectToDelete(editableSubProject)}
                                                                    className="inline-flex rounded-md p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        {isFormOpen && (
                            <SubProjectFormModal
                                subProject={selectedSubProject}
                                projects={[project]}
                                departments={formOptions.departments}
                                users={formOptions.users}
                                onClose={() => {
                                    setIsFormOpen(false);
                                    setSelectedSubProject(null);
                                }}
                                onSaved={load}
                            />
                        )}

                        {subProjectToDelete && (
                            <SubProjectDeleteDialog
                                subProject={subProjectToDelete}
                                onClose={() => setSubProjectToDelete(null)}
                                onDeleted={load}
                            />
                        )}
                    </div>
                )}
            </AppShell>
        </RequireAuth>
    );
}
