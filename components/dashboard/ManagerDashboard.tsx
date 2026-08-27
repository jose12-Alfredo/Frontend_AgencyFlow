"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
    AlertTriangle,
    ArrowUpRight,
    CalendarClock,
    CheckCircle2,
    ChevronDown,
    CircleGauge,
    Clock3,
    ListChecks,
    RefreshCw,
    TimerReset,
    UsersRound,
    X
} from "lucide-react";
import {
    DashboardData,
    ClientHierarchy,
    DashboardRiskItem,
    WorkloadStatusCount,
    WorkloadSubTask
} from "@/types/dashboard.types";
import { SubTask } from "@/types/subtask.types";
import { User } from "@/types/user.types";
import { subTasksService } from "@/services/subtasks.service";
import { tasksService } from "@/services/tasks.service";
import { ApiError } from "@/services/api";
import { dashboardService } from "@/services/dashboard.service";
import { DashboardFiltersBar } from "@/components/dashboard/DashboardFiltersBar";
import { useDashboardFilters } from "@/context/DashboardFiltersContext";

interface ManagerDashboardProps {
    data: DashboardData;
    isRefreshing: boolean;
    refreshError: string | null;
    onRefresh: () => void;
}

type RiskView = "overdue" | "bottlenecks" | "unassigned";

const distributionColors: Record<string, string> = {
    Pendiente: "bg-gray-400",
    "En proceso": "bg-blue-600",
    "En revisión": "bg-amber-500",
    Completada: "bg-emerald-600"
};

const workloadStatusStyles: Record<string, string> = {
    Pendiente: "bg-gray-100 text-gray-700",
    "En proceso": "bg-blue-50 text-blue-700",
    "En revisión": "bg-violet-50 text-violet-700",
    Pausada: "bg-amber-50 text-amber-800",
    Completada: "bg-emerald-50 text-emerald-700"
};

const completedStatuses = new Set(["Completada", "Completado"]);

function getActiveStatusCounts(
    statusCounts: WorkloadStatusCount[]
): WorkloadStatusCount[] {
    return statusCounts.filter(
        ({ status, count }) => count > 0 && !completedStatuses.has(status)
    );
}

function getSubTaskStatusCounts(
    subTasks: WorkloadSubTask[]
): WorkloadStatusCount[] {
    const counts = new Map<string, number>();

    subTasks.forEach((subTask) => {
        if (!completedStatuses.has(subTask.status)) {
            counts.set(subTask.status, (counts.get(subTask.status) ?? 0) + 1);
        }
    });

    return Array.from(counts, ([status, count]) => ({ status, count }));
}

function clampPercentage(value: number): number {
    return Math.min(100, Math.max(0, value));
}

function formatDate(value: string): string {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("es-BO", {
        day: "numeric",
        month: "short"
    }).format(new Date(year, month - 1, day));
}

function formatGeneratedAt(value: string): string {
    const generatedAt = new Date(value);
    const now = new Date();
    const time = new Intl.DateTimeFormat("es-BO", {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    }).format(generatedAt);
    const isToday = generatedAt.getFullYear() === now.getFullYear() &&
        generatedAt.getMonth() === now.getMonth() &&
        generatedAt.getDate() === now.getDate();

    if (isToday) {
        return `hoy, ${time}`;
    }

    const date = new Intl.DateTimeFormat("es-BO", {
        day: "numeric",
        month: "short"
    }).format(generatedAt);

    return `${date}, ${time}`;
}

function formatCycleTime(days: number | null): {
    value: string;
    detail: string;
} {
    if (days === null) {
        return { value: "—", detail: "Sin datos suficientes" };
    }

    if (days === 0) {
        return {
            value: "< 0,1 d",
            detail: "Desde que inicia hasta que se completa"
        };
    }

    if (days < 1) {
        const hours = new Intl.NumberFormat("es-BO", {
            maximumFractionDigits: 1
        }).format(days * 24);

        return {
            value: `${hours} h`,
            detail: "Desde que inicia hasta que se completa"
        };
    }

    return {
        value: `${new Intl.NumberFormat("es-BO", {
            maximumFractionDigits: 1
        }).format(days)} d`,
        detail: "Desde que inicia hasta que se completa"
    };
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase();
}

function taskHref(subProjectId: string, parentTaskId: string): string {
    return `/subtasks?subProjectId=${subProjectId}&taskId=${parentTaskId}`;
}

function useCloseOnEscape(onClose: () => void) {
    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                onClose();
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);
}

export function ManagerDashboard({
    data,
    isRefreshing,
    refreshError,
    onRefresh
}: ManagerDashboardProps) {
    const { activeFilterCount, catalogs, filters, setClientCompany } = useDashboardFilters();
    const [riskView, setRiskView] = useState<RiskView | null>(null);
    const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
    const [reassigningTaskId, setReassigningTaskId] = useState<string | null>(null);
    const [reassigningSubTaskId, setReassigningSubTaskId] = useState<string | null>(null);
    const [assignmentError, setAssignmentError] = useState<string | null>(null);
    const [isFinalizationOpen, setIsFinalizationOpen] = useState(false);
    const [finalizationSubTasks, setFinalizationSubTasks] = useState<SubTask[]>([]);
    const [isFinalizationLoading, setIsFinalizationLoading] = useState(false);
    const [finalizationError, setFinalizationError] = useState<string | null>(null);
    const [clientHierarchy, setClientHierarchy] = useState<ClientHierarchy | null>(null);
    const [isClientHierarchyLoading, setIsClientHierarchyLoading] = useState(false);
    const [clientHierarchyError, setClientHierarchyError] = useState<string | null>(null);

    async function openClientHierarchy(clientId: string) {
        const [year, month] = filters.period.split("-");
        setIsClientHierarchyLoading(true);
        setClientHierarchyError(null);
        setClientHierarchy(null);

        try {
            setClientHierarchy(await dashboardService.getClientHierarchy(clientId, {
                year,
                month,
                departmentId: filters.departmentId || undefined,
                responsibleUserId: filters.responsibleUserId || undefined
            }));
        } catch (error) {
            setClientHierarchyError(error instanceof ApiError
                ? error.message
                : "No se pudo cargar el detalle del cliente.");
        } finally {
            setIsClientHierarchyLoading(false);
        }
    }

    async function handleReassign(taskId: string, assignedUserId: string | null) {
        setReassigningTaskId(taskId);
        setAssignmentError(null);

        try {
            await tasksService.updateAssignee(taskId, assignedUserId);
            onRefresh();
        } catch (error) {
            setAssignmentError(
                error instanceof ApiError
                    ? error.message
                    : "No se pudo reasignar la tarea."
            );
        } finally {
            setReassigningTaskId(null);
        }
    }

    async function handleSubTaskReassign(
        subTaskId: string,
        assignedUserId: string | null
    ) {
        setReassigningSubTaskId(subTaskId);
        setAssignmentError(null);

        try {
            await subTasksService.updateAssignee(subTaskId, assignedUserId);
            onRefresh();
        } catch (error) {
            setAssignmentError(
                error instanceof ApiError
                    ? error.message
                    : "No se pudo reasignar la subtarea."
            );
        } finally {
            setReassigningSubTaskId(null);
        }
    }

    async function loadFinalizationSubTasks() {
        setIsFinalizationLoading(true);
        setFinalizationError(null);

        try {
            const pageSize = 100;
            const firstPage = await subTasksService.getAll({
                page: 1,
                pageSize
            });
            const pageCount = Math.ceil(firstPage.totalItems / pageSize);
            const remainingPages = pageCount > 1
                ? await Promise.all(
                    Array.from({ length: pageCount - 1 }, (_, index) =>
                        subTasksService.getAll({
                            page: index + 2,
                            pageSize
                        })
                    )
                )
                : [];

            setFinalizationSubTasks([
                ...firstPage.items,
                ...remainingPages.flatMap((page) => page.items)
            ]);
        } catch {
            setFinalizationError("No se pudo cargar el detalle de subtareas.");
        } finally {
            setIsFinalizationLoading(false);
        }
    }

    function handleOpenFinalization() {
        setIsFinalizationOpen(true);
        void loadFinalizationSubTasks();
    }
    const completionRate = new Intl.NumberFormat("es-BO", {
        maximumFractionDigits: 1
    }).format(data.kpis.globalProgressPercentage ?? data.kpis.completionRate);
    const legacyCompletedSubTaskCount = data.workflowDistribution.find(
        (item) => item.status === "Completada"
    )?.count ?? 0;
    const legacyTotalSubTaskCount = data.workflowDistribution.reduce(
        (total, item) => total + item.count,
        data.pausedTaskCount
    );
    const completedSubTaskCount = typeof data.kpis.completedSubTaskCount === "number"
        ? data.kpis.completedSubTaskCount
        : legacyCompletedSubTaskCount;
    const totalSubTaskCount = typeof data.kpis.totalSubTaskCount === "number"
        ? data.kpis.totalSubTaskCount
        : legacyTotalSubTaskCount;
    const overdueSubTaskCount = typeof data.kpis.overdueSubTaskCount === "number"
        ? data.kpis.overdueSubTaskCount
        : null;
    const maximumDaysOverdue = Math.max(
        0,
        ...data.overdueTasks.map((task) => task.daysOverdue)
    );
    const unassignedTaskCount = data.kpis.unassignedTaskCount ?? data.unassignedTasks?.length ?? 0;
    const unassignedSubTaskCount = data.kpis.unassignedSubTaskCount ?? data.unassignedSubTasks?.length ?? 0;
    const stalledTaskCount = data.kpis.stalledTaskCount ?? data.stalledTasks.length;
    const stalledSubTaskCount = data.kpis.stalledSubTaskCount ?? data.stalledSubTasks.length;
    const cycleTime = formatCycleTime(data.kpis.averageCycleTimeDays);
    const bottleneckCounts = Array.from(
        data.bottleneckItems.reduce((counts, item) => {
            counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
            return counts;
        }, new Map<string, number>()),
        ([status, count]) => `${status} ${count}`
    );
    const kpis = [
        {
            label: "Tareas atrasadas",
            value: data.kpis.overdueTaskCount.toString(),
            detail: data.kpis.overdueTaskCount === 0
                ? overdueSubTaskCount !== null && overdueSubTaskCount > 0
                    ? `${overdueSubTaskCount} ${overdueSubTaskCount === 1 ? "subtarea atrasada" : "subtareas atrasadas"}`
                    : "Sin tareas fuera de fecha"
                : `${maximumDaysOverdue > 0
                    ? `Máximo: ${maximumDaysOverdue} ${maximumDaysOverdue === 1 ? "día" : "días"}`
                    : "Fuera de fecha"}${overdueSubTaskCount !== null && overdueSubTaskCount > 0
                    ? ` · ${overdueSubTaskCount} ${overdueSubTaskCount === 1 ? "subtarea" : "subtareas"}`
                    : ""}`,
            icon: data.kpis.overdueTaskCount > 0 ||
                (overdueSubTaskCount !== null && overdueSubTaskCount > 0)
                ? AlertTriangle
                : CheckCircle2,
            accentClass: data.kpis.overdueTaskCount > 0 ||
                (overdueSubTaskCount !== null && overdueSubTaskCount > 0)
                ? "border-l-red-500"
                : "border-l-emerald-500",
            iconClass: data.kpis.overdueTaskCount > 0 ||
                (overdueSubTaskCount !== null && overdueSubTaskCount > 0)
                ? "bg-red-50 text-red-700"
                : "bg-emerald-50 text-emerald-700",
            valueClass: data.kpis.overdueTaskCount > 0
                ? "text-red-700"
                : "text-gray-950",
            detailClass: data.kpis.overdueTaskCount > 0 ||
                (overdueSubTaskCount !== null && overdueSubTaskCount > 0)
                ? "text-red-700"
                : "text-emerald-700",
            detailView: data.kpis.overdueTaskCount > 0 || (overdueSubTaskCount ?? 0) > 0
                ? "overdue" as const
                : undefined,
            actionLabel: data.kpis.overdueTaskCount > 0 || (overdueSubTaskCount ?? 0) > 0
                ? "Ver detalle"
                : undefined
        },
        {
            label: "Sin responsable",
            value: (unassignedTaskCount + unassignedSubTaskCount).toString(),
            detail: `${unassignedTaskCount} ${unassignedTaskCount === 1 ? "tarea" : "tareas"} · ${unassignedSubTaskCount} ${unassignedSubTaskCount === 1 ? "subtarea" : "subtareas"}`,
            icon: UsersRound,
            accentClass: unassignedTaskCount + unassignedSubTaskCount > 0 ? "border-l-amber-500" : "border-l-emerald-500",
            iconClass: unassignedTaskCount + unassignedSubTaskCount > 0 ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700",
            valueClass: "text-gray-950",
            detailClass: unassignedTaskCount + unassignedSubTaskCount > 0 ? "text-amber-800" : "text-emerald-700",
            detailView: unassignedTaskCount + unassignedSubTaskCount > 0 ? "unassigned" as const : undefined,
            actionLabel: unassignedTaskCount + unassignedSubTaskCount > 0 ? "Asignar ahora" : undefined
        },
        {
            label: "Tasa de finalización",
            value: totalSubTaskCount === 0 ? "—" : `${completionRate}%`,
            detail: (data.kpis.globalProgressPercentage ?? data.kpis.completionRate) === null
                ? "Sin datos suficientes"
                : `${completedSubTaskCount} de ${totalSubTaskCount} completadas`,
            icon: CheckCircle2,
            accentClass: totalSubTaskCount === 0
                ? "border-l-gray-300"
                : "border-l-emerald-500",
            iconClass: totalSubTaskCount === 0
                ? "bg-gray-100 text-gray-600"
                : "bg-emerald-50 text-emerald-700",
            valueClass: totalSubTaskCount === 0
                ? "text-gray-400"
                : "text-gray-950",
            detailClass: "text-gray-500",
            detailView: totalSubTaskCount > 0 && activeFilterCount === 0
                ? "finalization" as const
                : undefined,
            actionLabel: totalSubTaskCount > 0 && activeFilterCount === 0
                ? "Ver subtareas"
                : undefined
        },
        {
            label: "Trabajos sin movimiento",
            value: (stalledTaskCount + stalledSubTaskCount).toString(),
            detail: data.kpis.bottleneckCount === 0
                ? "Sin subtareas en revisión o pausa"
                : bottleneckCounts.join(" · ") || "En revisión o pausadas",
            icon: TimerReset,
            accentClass: stalledTaskCount + stalledSubTaskCount > 0
                ? "border-l-amber-500"
                : "border-l-gray-300",
            iconClass: stalledTaskCount + stalledSubTaskCount > 0
                ? "bg-amber-50 text-amber-800"
                : "bg-gray-100 text-gray-600",
            valueClass: "text-gray-950",
            detailClass: stalledTaskCount + stalledSubTaskCount > 0
                ? "text-amber-800"
                : "text-gray-500",
            detailView: stalledTaskCount + stalledSubTaskCount > 0
                ? "bottlenecks" as const
                : undefined,
            actionLabel: stalledTaskCount + stalledSubTaskCount > 0
                ? "Ver detalle"
                : undefined
        }
    ];
    const availablePeopleCount = data.workload.filter(
        (item) => item.activeTaskCount === 0 && item.activeSubTaskCount === 0
    ).length;

    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-4 border-b border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-700">
                        Dashboard gerencial · Control de producción
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold leading-tight text-gray-950">
                        Salud del flujo de trabajo
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Atrasos, velocidad de entrega, finalización y posibles bloqueos.
                    </p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <p className="text-xs font-medium text-gray-500" aria-live="polite">
                        Actualizado {formatGeneratedAt(data.generatedAt)}
                    </p>
                    <button
                        type="button"
                        title={isRefreshing ? "Actualizando dashboard" : "Actualizar dashboard"}
                        aria-label={isRefreshing ? "Actualizando dashboard" : "Actualizar dashboard"}
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        className="flex size-9 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50 hover:text-gray-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50"
                    >
                        <RefreshCw
                            size={16}
                            className={isRefreshing ? "animate-spin" : ""}
                        />
                    </button>
                </div>
            </header>

            <DashboardFiltersBar />

            {refreshError && (
                <div role="alert" className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertTriangle size={16} className="shrink-0" />
                    {refreshError} Se mantienen los últimos datos disponibles.
                </div>
            )}

            <section
                aria-label="Indicadores clave"
                aria-busy={isRefreshing}
                className={`grid gap-3 transition-opacity sm:grid-cols-2 xl:grid-cols-4 ${isRefreshing ? "opacity-60" : "opacity-100"}`}
            >
                {kpis.map((kpi) => {
                    const Icon = kpi.icon;
                    const interactiveView = kpi.detailView;
                    const isInteractive = interactiveView !== undefined;
                    const content = (
                        <span className="flex h-full flex-col">
                            <span className="flex items-center gap-2">
                                <span className={`flex size-7 shrink-0 items-center justify-center rounded ${kpi.iconClass}`}>
                                    <Icon size={15} strokeWidth={2} />
                                </span>
                                <span className="text-xs font-semibold leading-4 text-gray-600">
                                    {kpi.label}
                                </span>
                            </span>
                            <span className={`mt-3 block text-[1.75rem] font-semibold leading-none tracking-tight ${kpi.valueClass}`}>
                                {kpi.value}
                            </span>
                            <span className={`mt-2 block text-xs leading-4 ${kpi.detailClass}`}>
                                {kpi.detail}
                            </span>
                            {isInteractive && kpi.actionLabel && (
                                <span className="mt-3 inline-flex items-center gap-1 self-start text-xs font-semibold text-blue-700">
                                    {kpi.actionLabel}
                                    <ArrowUpRight size={14} />
                                </span>
                            )}
                        </span>
                    );

                    if (isInteractive) {
                        return (
                            <button
                                key={kpi.label}
                                type="button"
                                onClick={() => {
                                    if (interactiveView === "finalization") {
                                        handleOpenFinalization();
                                    } else if (interactiveView) {
                                        setRiskView(interactiveView);
                                    }
                                }}
                                className={`h-full rounded-md border border-l-[3px] border-gray-200 bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-px hover:bg-gray-50/70 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transform-none ${kpi.accentClass}`}
                            >
                                {content}
                            </button>
                        );
                    }

                    return (
                        <article key={kpi.label} className={`h-full rounded-md border border-l-[3px] border-gray-200 bg-white p-3.5 shadow-sm ${kpi.accentClass}`}>
                            {content}
                        </article>
                    );
                })}
            </section>

            {riskView && (
                <DashboardRiskDialog
                    view={riskView}
                    items={riskView === "overdue"
                        ? data.overdueItems ?? data.overdueTasks
                        : riskView === "unassigned"
                            ? [...(data.unassignedTasks ?? []), ...(data.unassignedSubTasks ?? [])]
                            : data.bottleneckItems}
                    onClose={() => setRiskView(null)}
                />
            )}

            {isFinalizationOpen && (
                <FinalizationDialog
                    items={finalizationSubTasks}
                    isLoading={isFinalizationLoading}
                    error={finalizationError}
                    onRetry={() => void loadFinalizationSubTasks()}
                    onClose={() => setIsFinalizationOpen(false)}
                />
            )}

            {(clientHierarchy || isClientHierarchyLoading || clientHierarchyError) && (
                <ClientHierarchyDialog
                    hierarchy={clientHierarchy}
                    isLoading={isClientHierarchyLoading}
                    error={clientHierarchyError}
                    onClose={() => {
                        setClientHierarchy(null);
                        setClientHierarchyError(null);
                    }}
                />
            )}

            {(data.unassignedTasks?.length ?? 0) + (data.unassignedSubTasks?.length ?? 0) > 0 && (
                <section className="overflow-hidden rounded-lg border border-amber-200 bg-white shadow-sm">
                    <div className="border-b border-amber-100 bg-amber-50/70 px-5 py-4">
                        <SectionHeading
                            icon={UsersRound}
                            title="Por asignar"
                            description="Trabajo pendiente de responsable. Asigna únicamente a usuarios internos."
                        />
                    </div>
                    {assignmentError && (
                        <p role="alert" className="mx-5 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                            {assignmentError}
                        </p>
                    )}
                    <div className="grid divide-y divide-gray-100 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                        <AssignmentQueue
                            title="Tareas"
                            items={data.unassignedTasks ?? []}
                            users={catalogs.users}
                            isAssigningId={reassigningTaskId}
                            onAssign={handleReassign}
                        />
                        <AssignmentQueue
                            title="Subtareas"
                            items={data.unassignedSubTasks ?? []}
                            users={catalogs.users}
                            isAssigningId={reassigningSubTaskId}
                            onAssign={handleSubTaskReassign}
                        />
                    </div>
                </section>
            )}

            <div className="space-y-6">
                <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                        <SectionHeading
                            icon={UsersRound}
                            title="Carga y disponibilidad del equipo"
                            description="Trabajo activo, entregas y capacidad para nuevas asignaciones"
                        />
                        {data.workload.length > 0 && (
                            <div className="flex shrink-0 items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                                <span className="size-2 rounded-full bg-emerald-500" />
                                {availablePeopleCount} de {data.workload.length} disponibles
                            </div>
                        )}
                    </div>

                    {assignmentError && (
                        <p role="alert" className="mx-5 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                            {assignmentError}
                        </p>
                    )}

                    <div className="space-y-3 bg-gray-50/60 p-3 sm:p-4">
                        {data.workload.length === 0 ? (
                            <EmptyState text="No hay personas disponibles para mostrar." />
                        ) : data.workload.map((item) => {
                            const isExpanded = expandedUserId === item.userId;
                            const hasActiveWork = item.activeTaskCount > 0 ||
                                item.activeSubTaskCount > 0;
                            const hasOverdueWork = item.overdueTaskCount > 0 ||
                                item.overdueSubTaskCount > 0;
                            const activeTaskStatuses = getActiveStatusCounts(
                                item.statusCounts
                            );
                            const activeSubTaskStatuses = getSubTaskStatusCounts(
                                item.subTasks
                            );
                            const progressPercentage = clampPercentage(
                                item.averageProgressPercentage
                            );
                            const detailId = `workload-detail-${item.userId}`;

                            return (
                                <article
                                    key={item.userId}
                                    className="relative overflow-hidden rounded-md border border-gray-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`absolute inset-y-0 left-0 w-1 ${
                                            hasOverdueWork
                                                ? "bg-red-500"
                                                : hasActiveWork
                                                    ? "bg-blue-600"
                                                    : "bg-emerald-500"
                                        }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setExpandedUserId(
                                            isExpanded ? null : item.userId
                                        )}
                                        aria-expanded={isExpanded}
                                        aria-controls={detailId}
                                        className="grid w-full grid-cols-[44px_minmax(0,1fr)_auto] items-start gap-3 py-4 pl-5 pr-4 text-left transition hover:bg-gray-50/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:gap-4 sm:px-5 sm:pl-6"
                                    >
                                        <span className={`flex size-11 items-center justify-center rounded-full text-xs font-bold ${
                                            hasActiveWork
                                                ? "bg-gray-900 text-white"
                                                : "bg-emerald-100 text-emerald-800"
                                        }`}>
                                            {getInitials(item.userName)}
                                        </span>

                                        <span className="min-w-0">
                                            <span className="flex flex-wrap items-center gap-2">
                                                <span className="truncate text-sm font-semibold text-gray-950 sm:text-[15px]">
                                                    {item.userName}
                                                </span>
                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                                    hasActiveWork
                                                        ? "bg-blue-50 text-blue-800"
                                                        : "bg-emerald-100 text-emerald-800"
                                                }`}>
                                                    <span className={`size-1.5 rounded-full ${hasActiveWork ? "bg-blue-600" : "bg-emerald-500"}`} />
                                                    {hasActiveWork ? "Con trabajo activo" : "Disponible"}
                                                </span>
                                                {item.roleName === "Cliente" && (
                                                    <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                                        Cliente
                                                    </span>
                                                )}
                                            </span>

                                            <span className="mt-3 grid gap-2 sm:grid-cols-2">
                                                <span className="rounded-md border border-gray-200 bg-gray-50/80 px-3 py-2.5">
                                                    <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                                                        Tareas
                                                    </span>
                                                    <span className="mt-1 block text-xs font-medium text-gray-700">
                                                        <strong className="font-semibold text-gray-950">{item.activeTaskCount}</strong> {item.activeTaskCount === 1 ? "activa" : "activas"}
                                                        <span className="px-1.5 text-gray-300">·</span>
                                                        <strong className="font-semibold text-emerald-700">{item.completedTaskCount}</strong> {item.completedTaskCount === 1 ? "completada" : "completadas"}
                                                    </span>
                                                    {(activeTaskStatuses.length > 0 || item.overdueTaskCount > 0) && (
                                                        <span className="mt-2 flex flex-wrap gap-1.5">
                                                            {activeTaskStatuses.map((status) => (
                                                                <span
                                                                    key={status.status}
                                                                    className={`rounded px-2 py-1 text-[11px] font-semibold ${workloadStatusStyles[status.status] ?? "bg-gray-100 text-gray-700"}`}
                                                                >
                                                                    {status.status} {status.count}
                                                                </span>
                                                            ))}
                                                            {item.overdueTaskCount > 0 && (
                                                                <span className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">
                                                                    <AlertTriangle size={12} />
                                                                    {item.overdueTaskCount} {item.overdueTaskCount === 1 ? "atrasada" : "atrasadas"}
                                                                </span>
                                                            )}
                                                        </span>
                                                    )}
                                                </span>

                                                <span className="rounded-md border border-gray-200 bg-gray-50/80 px-3 py-2.5">
                                                    <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                                                        Subtareas
                                                    </span>
                                                    <span className="mt-1 block text-xs font-medium text-gray-700">
                                                        <strong className="font-semibold text-gray-950">{item.activeSubTaskCount}</strong> {item.activeSubTaskCount === 1 ? "activa" : "activas"}
                                                        <span className="px-1.5 text-gray-300">·</span>
                                                        <strong className="font-semibold text-emerald-700">{item.completedSubTaskCount}</strong> {item.completedSubTaskCount === 1 ? "completada" : "completadas"}
                                                    </span>
                                                    {(activeSubTaskStatuses.length > 0 || item.overdueSubTaskCount > 0) && (
                                                        <span className="mt-2 flex flex-wrap gap-1.5">
                                                            {activeSubTaskStatuses.map((status) => (
                                                                <span
                                                                    key={status.status}
                                                                    className={`rounded px-2 py-1 text-[11px] font-semibold ${workloadStatusStyles[status.status] ?? "bg-gray-100 text-gray-700"}`}
                                                                >
                                                                    {status.status} {status.count}
                                                                </span>
                                                            ))}
                                                            {item.overdueSubTaskCount > 0 && (
                                                                <span className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">
                                                                    <AlertTriangle size={12} />
                                                                    {item.overdueSubTaskCount} {item.overdueSubTaskCount === 1 ? "atrasada" : "atrasadas"}
                                                                </span>
                                                            )}
                                                        </span>
                                                    )}
                                                </span>
                                            </span>

                                            {hasActiveWork ? (
                                                <span className="mt-3 flex items-center gap-3">
                                                    <span
                                                        role="progressbar"
                                                        aria-label={`Avance promedio de ${item.userName}`}
                                                        aria-valuemin={0}
                                                        aria-valuemax={100}
                                                        aria-valuenow={progressPercentage}
                                                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100"
                                                    >
                                                        <span
                                                            className="block h-full rounded-full bg-blue-600"
                                                            style={{ width: `${progressPercentage}%` }}
                                                        />
                                                    </span>
                                                    <span className="shrink-0 text-xs font-semibold text-gray-700">
                                                        {progressPercentage}% <span className="font-normal text-gray-400">avance promedio</span>
                                                    </span>
                                                </span>
                                            ) : (
                                                <span className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                                                    <CheckCircle2 size={14} />
                                                    Disponible para nuevas asignaciones
                                                </span>
                                            )}
                                        </span>

                                        <span className="flex size-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500">
                                            <ChevronDown
                                                size={16}
                                                className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                            />
                                        </span>
                                    </button>

                                    {isExpanded && (
                                        <div
                                            id={detailId}
                                            className="border-t border-gray-200 bg-gray-50 px-4 py-4 sm:px-6"
                                        >
                                            <div className="grid gap-5 xl:grid-cols-2">
                                                <section aria-labelledby={`${detailId}-tasks`}>
                                                    <div className="flex items-center justify-between gap-3">
                                                        <h3 id={`${detailId}-tasks`} className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
                                                            Tareas
                                                        </h3>
                                                        <span className="text-xs text-gray-400">
                                                            {item.tasks.length} activas
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 space-y-2">
                                                        {item.tasks.length === 0 ? (
                                                            <p className="rounded-md border border-dashed border-gray-300 bg-white px-4 py-5 text-sm text-gray-500">
                                                                No tiene tareas principales activas.
                                                            </p>
                                                        ) : item.tasks.map((task) => {
                                                            const taskProgress = clampPercentage(
                                                                task.progressPercentage
                                                            );

                                                            return (
                                                                <div key={task.taskId} className="rounded-md border border-gray-200 bg-white p-3">
                                                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                                                        <div className="min-w-0 flex-1">
                                                                            <Link
                                                                                href={taskHref(task.subProjectId, task.taskId)}
                                                                                className="block break-words text-sm font-semibold text-gray-950 hover:text-blue-700"
                                                                            >
                                                                                {task.title}
                                                                            </Link>
                                                                            <p className="mt-1 truncate text-xs text-gray-500">
                                                                                {task.projectTitle} / {task.subProjectTitle}
                                                                            </p>
                                                                        </div>
                                                                        <span className={`rounded px-2 py-1 text-[11px] font-semibold ${workloadStatusStyles[task.status] ?? "bg-gray-100 text-gray-700"}`}>
                                                                            {task.status}
                                                                        </span>
                                                                    </div>
                                                                    {task.daysOverdue > 0 && (
                                                                        <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                                                                            <AlertTriangle size={12} />
                                                                            {task.daysOverdue} {task.daysOverdue === 1 ? "día" : "días"} de atraso
                                                                        </p>
                                                                    )}
                                                                    <div className="mt-3 flex items-center gap-3">
                                                                        <div
                                                                            role="progressbar"
                                                                            aria-label={`Progreso de ${task.title}`}
                                                                            aria-valuemin={0}
                                                                            aria-valuemax={100}
                                                                            aria-valuenow={taskProgress}
                                                                            className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100"
                                                                        >
                                                                            <div className="h-full rounded-full bg-blue-600" style={{ width: `${taskProgress}%` }} />
                                                                        </div>
                                                                        <span className="w-9 text-right text-xs font-semibold text-gray-700">
                                                                            {taskProgress}%
                                                                        </span>
                                                                    </div>
                                                                    <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
                                                                        <label className="shrink-0 text-[11px] font-semibold text-gray-500" htmlFor={`assignee-${task.taskId}`}>
                                                                            Responsable
                                                                        </label>
                                                                        <select
                                                                            id={`assignee-${task.taskId}`}
                                                                            value={item.userId}
                                                                            disabled={reassigningTaskId === task.taskId}
                                                                            onChange={(event) => void handleReassign(
                                                                                task.taskId,
                                                                                event.target.value || null
                                                                            )}
                                                                            className="h-8 min-w-0 flex-1 rounded border border-gray-300 bg-white px-2 text-xs text-gray-700 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
                                                                        >
                                                                            <option value="">Sin responsable</option>
                                                                            {data.workload.map((user) => (
                                                                                <option key={user.userId} value={user.userId}>
                                                                                    {user.userName}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </section>

                                                <section aria-labelledby={`${detailId}-subtasks`}>
                                                    <div className="flex items-center justify-between gap-3">
                                                        <h3 id={`${detailId}-subtasks`} className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
                                                            Subtareas
                                                        </h3>
                                                        <span className="text-xs text-gray-400">
                                                            {item.subTasks.length} activas
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 space-y-2">
                                                        {item.subTasks.length === 0 ? (
                                                            <p className="rounded-md border border-dashed border-gray-300 bg-white px-4 py-5 text-sm text-gray-500">
                                                                No tiene subtareas activas.
                                                            </p>
                                                        ) : item.subTasks.map((subTask) => (
                                                            <Link
                                                                key={subTask.subTaskId}
                                                                href={taskHref(
                                                                    subTask.subProjectId,
                                                                    subTask.parentTaskId
                                                                )}
                                                                className="flex items-start justify-between gap-3 rounded-md border border-gray-200 bg-white p-3 transition hover:border-blue-200 hover:bg-blue-50/30"
                                                            >
                                                                <span className="min-w-0">
                                                                    <span className="block break-words text-sm font-semibold text-gray-950">
                                                                        {subTask.title}
                                                                    </span>
                                                                    <span className="mt-1 block truncate text-xs text-gray-500">
                                                                        Tarea: {subTask.parentTaskTitle}
                                                                    </span>
                                                                    {subTask.daysOverdue > 0 && (
                                                                        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                                                                            <AlertTriangle size={12} />
                                                                            {subTask.daysOverdue} {subTask.daysOverdue === 1 ? "día" : "días"} de atraso
                                                                        </span>
                                                                    )}
                                                                </span>
                                                                <span className={`shrink-0 rounded px-2 py-1 text-[11px] font-semibold ${workloadStatusStyles[subTask.status] ?? "bg-gray-100 text-gray-700"}`}>
                                                                    {subTask.status}
                                                                </span>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                </section>
                                            </div>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                </section>

                <section className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
                    <SectionHeading
                        icon={CircleGauge}
                        title="Distribución del flujo"
                        description="Volumen actual por etapa de producción"
                    />
                    <div className="mt-7 flex h-4 w-full overflow-hidden rounded-sm bg-gray-100">
                        {data.workflowDistribution.map((item) => (
                            <div
                                key={item.status}
                                title={`${item.status}: ${item.count}`}
                                className={distributionColors[item.status] ?? "bg-gray-500"}
                                style={{ width: `${item.percentage}%` }}
                            />
                        ))}
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4">
                        {data.workflowDistribution.map((item) => (
                            <div key={item.status} className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
                                <span className="flex min-w-0 items-center gap-2 text-sm text-gray-600">
                                    <span className={`size-2.5 shrink-0 rounded-sm ${distributionColors[item.status] ?? "bg-gray-500"}`} />
                                    <span className="truncate">{item.status}</span>
                                </span>
                                <span className="text-sm font-semibold text-gray-900">
                                    {item.count}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-5 flex items-center justify-between rounded-md bg-amber-50 px-4 py-3 text-sm">
                        <span className="text-amber-800">Tareas pausadas</span>
                        <span className="font-semibold text-amber-900">
                            {data.pausedTaskCount}
                        </span>
                    </div>
                </section>
            </div>

            {(data.clientHealth?.length ?? 0) > 0 && (
                <section className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
                    <SectionHeading
                        icon={UsersRound}
                        title="Clientes y avance"
                        description="Avance actual, representante interno y señales de riesgo por cliente"
                    />
                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {data.clientHealth?.map((client) => {
                            const risks = client.overdueTaskCount + client.overdueSubTaskCount + client.unassignedTaskCount + client.unassignedSubTaskCount + client.stalledTaskCount + client.stalledSubTaskCount;
                            const progress = client.progressPercentage;

                            return (
                                <button
                                    key={client.clientId}
                                    type="button"
                                    onClick={() => {
                                        setClientCompany(client.clientId);
                                        void openClientHierarchy(client.clientId);
                                    }}
                                    className="group rounded-md border border-gray-200 p-4 transition hover:border-blue-300 hover:bg-blue-50/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h3 className="truncate text-sm font-semibold text-gray-950">{client.clientName}</h3>
                                            <p className="mt-1 truncate text-xs text-gray-500">{client.representativeUserName ?? "Sin representante interno"}</p>
                                        </div>
                                        {risks > 0 && <span className="shrink-0 rounded bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">{risks} alertas</span>}
                                    </div>
                                    <div className="mt-4 flex items-end justify-between gap-3">
                                        <div>
                                            <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Avance</span>
                                            <strong className="mt-1 block text-2xl leading-none text-gray-950">{progress === null ? "—" : `${progress}%`}</strong>
                                        </div>
                                        <span className="text-right text-xs text-gray-500">{client.activeProjectCount} {client.activeProjectCount === 1 ? "proyecto activo" : "proyectos activos"}</span>
                                    </div>
                                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
                                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${clampPercentage(progress ?? 0)}%` }} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>
            )}

            <section className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
                <SectionHeading
                    icon={ListChecks}
                    title="Salud de subproyectos"
                    description="Avance agregado de las tareas operativas activas"
                />
                <div className="mt-5 overflow-x-auto">
                    <div className="min-w-[680px]">
                        <div className="grid grid-cols-[minmax(220px,1.3fr)_130px_minmax(220px,1fr)_80px] gap-5 border-b border-gray-200 pb-2 text-xs font-semibold uppercase text-gray-400">
                            <span>Subproyecto</span>
                            <span>Periodo</span>
                            <span>Progreso</span>
                            <span className="text-right">Estado</span>
                        </div>
                        {data.subProjectHealth.length === 0 ? (
                            <EmptyState text="No existen subproyectos activos." />
                        ) : data.subProjectHealth.map((item) => (
                            <Link
                                key={item.subProjectId}
                                href={`/tasks?subProjectId=${item.subProjectId}`}
                                className="grid grid-cols-[minmax(220px,1.3fr)_130px_minmax(220px,1fr)_80px] items-center gap-5 border-b border-gray-100 py-4 hover:bg-gray-50"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-gray-900">{item.title}</p>
                                    <p className="mt-0.5 truncate text-xs text-gray-400">{item.projectTitle}</p>
                                </div>
                                <p className="text-xs text-gray-500">
                                    {formatDate(item.startDate)} - {item.endDate ? formatDate(item.endDate) : "Abierto"}
                                </p>
                                <div>
                                    <div className="mb-2 flex justify-between text-xs text-gray-500">
                                        <span>{item.completedTaskCount}/{item.totalTaskCount} completadas</span>
                                        <span className="font-semibold text-gray-700">{item.progressPercentage}%</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${item.progressPercentage}%` }} />
                                    </div>
                                </div>
                                <span className={`justify-self-end rounded px-2 py-1 text-xs font-semibold ${item.isAtRisk ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                                    {item.isAtRisk ? "En riesgo" : "Estable"}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            <section className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
                <SectionHeading
                    icon={Clock3}
                    title="Analítica histórica"
                    description="Métricas de entrega para el mes seleccionado"
                />
                <div className="mt-4 flex items-end justify-between gap-4 rounded-md bg-gray-50 px-4 py-3">
                    <div>
                        <p className="text-xs font-medium text-gray-500">Tiempo de ciclo promedio</p>
                        <p className="mt-1 text-xl font-semibold text-gray-950">{cycleTime.value}</p>
                    </div>
                    <p className="max-w-56 text-right text-xs text-gray-500">{cycleTime.detail}</p>
                </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-3">
                <section className="rounded-md border border-gray-200 bg-white shadow-sm">
                    <div className="p-5">
                        <SectionHeading
                            icon={CalendarClock}
                            title="Próximos vencimientos"
                            description="Entregas previstas durante los próximos 5 días"
                        />
                    </div>
                    <AlertList>
                        {data.upcomingDeadlines.length === 0 ? (
                            <EmptyState text="No hay vencimientos próximos." />
                        ) : data.upcomingDeadlines.map((task) => (
                            <Link key={task.taskId} href={taskHref(task.subProjectId, task.parentTaskId)} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-t border-gray-100 px-5 py-4 hover:bg-gray-50">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-gray-900">{task.title}</p>
                                    <p className="mt-1 truncate text-xs text-gray-400">{task.parentTaskTitle} · {task.assignedUserName ?? "Sin responsable"}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-sm font-semibold ${task.daysRemaining <= 1 ? "text-red-600" : "text-gray-800"}`}>{formatDate(task.dueDate)}</p>
                                    <p className="mt-1 text-xs text-gray-400">{task.daysRemaining === 0 ? "Hoy" : `${task.daysRemaining} días`}</p>
                                </div>
                            </Link>
                        ))}
                    </AlertList>
                </section>

                <section className="rounded-md border border-gray-200 bg-white shadow-sm">
                    <div className="p-5">
                        <SectionHeading
                            icon={AlertTriangle}
                            title="Tareas sin movimiento"
                            description="Ordenadas por días sin cambio de estado"
                        />
                    </div>
                    <AlertList>
                        {data.stalledTasks.length === 0 ? (
                            <EmptyState text="No hay tareas sin movimiento." />
                        ) : data.stalledTasks.map((task) => (
                            <Link key={task.taskId} href={taskHref(task.subProjectId, task.taskId)} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-gray-100 px-5 py-4 hover:bg-gray-50">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-gray-900">{task.title}</p>
                                    <p className="mt-1 truncate text-xs text-gray-400">{task.status} · {task.assignedUserName ?? "Sin responsable"}</p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                                        {task.daysWithoutChange} {task.daysWithoutChange === 1 ? "día" : "días"} sin cambio
                                        <ArrowUpRight size={14} />
                                    </p>
                                    {task.daysOverdue > 0 && (
                                        <p className="mt-1 text-xs font-semibold text-red-600">
                                            {task.daysOverdue} {task.daysOverdue === 1 ? "día" : "días"} de atraso
                                        </p>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </AlertList>
                </section>

                <section className="rounded-md border border-gray-200 bg-white shadow-sm">
                    <div className="p-5">
                        <SectionHeading
                            icon={TimerReset}
                            title="Subtareas sin movimiento"
                            description="Ordenadas por días sin cambio de estado"
                        />
                    </div>
                    <AlertList>
                        {data.stalledSubTasks.length === 0 ? (
                            <EmptyState text="No hay subtareas sin movimiento." />
                        ) : data.stalledSubTasks.map((subTask) => (
                            <Link key={subTask.subTaskId} href={taskHref(subTask.subProjectId, subTask.parentTaskId)} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-gray-100 px-5 py-4 hover:bg-gray-50">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-gray-900">{subTask.title}</p>
                                    <p className="mt-1 truncate text-xs text-gray-400">{subTask.parentTaskTitle} · {subTask.assignedUserName ?? "Sin responsable"}</p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                                        {subTask.daysWithoutChange} {subTask.daysWithoutChange === 1 ? "día" : "días"} sin cambio
                                        <ArrowUpRight size={14} />
                                    </p>
                                    {subTask.daysOverdue > 0 && (
                                        <p className="mt-1 text-xs font-semibold text-red-600">
                                            {subTask.daysOverdue} {subTask.daysOverdue === 1 ? "día" : "días"} de atraso
                                        </p>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </AlertList>
                </section>
            </div>
        </div>
    );
}

function ClientHierarchyDialog({
    hierarchy,
    isLoading,
    error,
    onClose
}: {
    hierarchy: ClientHierarchy | null;
    isLoading: boolean;
    error: string | null;
    onClose: () => void;
}) {
    useCloseOnEscape(onClose);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6" onMouseDown={onClose}>
            <section role="dialog" aria-modal="true" aria-labelledby="client-hierarchy-title" onMouseDown={(event) => event.stopPropagation()} className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
                <header className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 sm:px-6">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-700">Mapa de producción</p>
                        <h2 id="client-hierarchy-title" className="mt-1 text-lg font-semibold text-gray-950">{hierarchy?.clientName ?? "Detalle del cliente"}</h2>
                        {hierarchy && <p className="mt-1 text-sm text-gray-500">Representante: {hierarchy.representativeUserName ?? "Sin representante interno"} · Avance: {hierarchy.progressPercentage === null ? "Sin datos" : `${hierarchy.progressPercentage}%`}</p>}
                    </div>
                    <button type="button" onClick={onClose} aria-label="Cerrar detalle del cliente" className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><X size={20} /></button>
                </header>
                <div className="overflow-y-auto bg-gray-50/70 p-4 sm:p-6">
                    {isLoading ? (
                        <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-gray-500"><RefreshCw size={20} className="animate-spin text-blue-600" /> Cargando proyectos…</div>
                    ) : error ? (
                        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
                    ) : hierarchy?.projects.length === 0 ? (
                        <p className="rounded-md border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm text-gray-500">No hay proyectos para este cliente en el mes seleccionado.</p>
                    ) : hierarchy && (
                        <div className="space-y-3">
                            {hierarchy.projects.map((project) => (
                                <details key={project.projectId} className="group rounded-md border border-gray-200 bg-white" open={hierarchy.projects.length === 1}>
                                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 marker:content-none hover:bg-gray-50">
                                        <HierarchySummary title={project.title} subtitle={project.assignedUserName ?? "Sin responsable de proyecto"} progress={project.progressPercentage} label="Proyecto" />
                                        <ChevronDown size={18} className="shrink-0 text-gray-500 transition-transform group-open:rotate-180" />
                                    </summary>
                                    <div className="space-y-2 border-t border-gray-100 bg-gray-50/60 p-3 sm:p-4">
                                        {project.subProjects.map((subProject) => (
                                            <details key={subProject.subProjectId} className="group/sub rounded border border-gray-200 bg-white">
                                                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-3 marker:content-none hover:bg-gray-50">
                                                    <HierarchySummary title={subProject.title} subtitle={`Área: ${subProject.departmentName ?? "Sin área"}`} progress={subProject.progressPercentage} label="Subproyecto" />
                                                    <ChevronDown size={16} className="shrink-0 text-gray-500 transition-transform group-open/sub:rotate-180" />
                                                </summary>
                                                <div className="space-y-2 border-t border-gray-100 p-3">
                                                    {subProject.tasks.length === 0 ? <p className="text-sm text-gray-500">Sin tareas en este periodo.</p> : subProject.tasks.map((task) => (
                                                        <details key={task.taskId} className="group/task rounded border border-gray-200 bg-gray-50">
                                                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-3 marker:content-none hover:bg-white">
                                                                <HierarchySummary title={task.title} subtitle={`Responsable: ${task.assignedUserName ?? "Sin responsable"} · ${task.status}`} progress={task.progressPercentage} label="Tarea" />
                                                                <ChevronDown size={15} className="shrink-0 text-gray-500 transition-transform group-open/task:rotate-180" />
                                                            </summary>
                                                            <div className="divide-y divide-gray-100 border-t border-gray-200 bg-white">
                                                                {task.subTasks.length === 0 ? <p className="px-3 py-3 text-sm text-gray-500">Sin subtareas.</p> : task.subTasks.map((subTask) => (
                                                                    <div key={subTask.subTaskId} className="flex items-center justify-between gap-4 px-3 py-3">
                                                                        <div className="min-w-0"><p className="truncate text-sm font-medium text-gray-900">{subTask.title}</p><p className="mt-1 text-xs text-gray-500">Responsable: {subTask.assignedUserName ?? "Sin responsable"} · {subTask.status}</p></div>
                                                                        <span className="shrink-0 text-sm font-semibold text-gray-700">{subTask.progressPercentage === null ? "—" : `${subTask.progressPercentage}%`}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </details>
                                                    ))}
                                                </div>
                                            </details>
                                        ))}
                                    </div>
                                </details>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

function HierarchySummary({ title, subtitle, progress, label }: { title: string; subtitle: string; progress: number | null; label: string }) {
    return <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">{label}</p><p className="mt-1 truncate text-sm font-semibold text-gray-950">{title}</p><p className="mt-1 truncate text-xs text-gray-500">{subtitle}</p><div className="mt-3 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${clampPercentage(progress ?? 0)}%` }} /></div><span className="w-10 text-right text-xs font-semibold text-gray-700">{progress === null ? "—" : `${progress}%`}</span></div></div>;
}

interface SectionHeadingProps {
    icon: typeof UsersRound;
    title: string;
    description: string;
}

function FinalizationDialog({
    items,
    isLoading,
    error,
    onRetry,
    onClose
}: {
    items: SubTask[];
    isLoading: boolean;
    error: string | null;
    onRetry: () => void;
    onClose: () => void;
}) {
    useCloseOnEscape(onClose);

    const completed = items.filter(
        (item) => completedStatuses.has(item.status)
    );
    const pending = items.filter(
        (item) => !completedStatuses.has(item.status)
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
            onMouseDown={onClose}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="finalization-detail-title"
                aria-describedby="finalization-detail-description"
                onMouseDown={(event) => event.stopPropagation()}
                className="flex max-h-[min(820px,92vh)] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
            >
                <header className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 sm:px-6">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                            Finalización
                        </p>
                        <h2 id="finalization-detail-title" className="mt-1 text-lg font-semibold text-gray-950">
                            Detalle de subtareas
                        </h2>
                        <p id="finalization-detail-description" className="mt-1 text-sm text-gray-500">
                            Revisa cuáles finalizaron y cuáles continúan pendientes.
                        </p>
                    </div>
                    <button
                        type="button"
                        title="Cerrar detalle"
                        aria-label="Cerrar detalle de finalización"
                        onClick={onClose}
                        autoFocus
                        className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                        <X size={20} />
                    </button>
                </header>

                {isLoading ? (
                    <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-sm text-gray-500">
                        <RefreshCw size={22} className="animate-spin text-blue-600" />
                        Cargando subtareas...
                    </div>
                ) : error ? (
                    <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
                        <AlertTriangle size={24} className="text-red-600" />
                        <p role="alert" className="mt-3 text-sm font-medium text-red-700">
                            {error}
                        </p>
                        <button
                            type="button"
                            onClick={onRetry}
                            className="mt-4 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        >
                            Reintentar
                        </button>
                    </div>
                ) : (
                    <div className="overflow-y-auto bg-gray-50/70 p-4 sm:p-5">
                        <div className="mb-4 flex flex-wrap gap-2">
                            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                                {completed.length} completadas
                            </span>
                            <span className="rounded-full bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700">
                                {pending.length} pendientes
                            </span>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-2">
                            <FinalizationSubTaskGroup
                                title="Completadas"
                                items={completed}
                                emptyText="No hay subtareas completadas."
                                titleClass="text-emerald-800"
                            />
                            <FinalizationSubTaskGroup
                                title="Pendientes"
                                items={pending}
                                emptyText="No hay subtareas pendientes."
                                titleClass="text-gray-700"
                            />
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}

function FinalizationSubTaskGroup({
    title,
    items,
    emptyText,
    titleClass
}: {
    title: string;
    items: SubTask[];
    emptyText: string;
    titleClass: string;
}) {
    return (
        <section className="min-w-0" aria-label={title}>
            <div className="flex items-center justify-between gap-3 px-1">
                <h3 className={`text-xs font-bold uppercase tracking-[0.12em] ${titleClass}`}>
                    {title}
                </h3>
                <span className="text-xs font-semibold text-gray-400">
                    {items.length}
                </span>
            </div>
            <div className="mt-2 space-y-2">
                {items.length === 0 ? (
                    <p className="rounded-md border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
                        {emptyText}
                    </p>
                ) : items.map((item) => {
                    const responsible = [
                        item.assignedUserFirstName,
                        item.assignedUserLastName
                    ].filter(Boolean).join(" ");

                    return (
                        <article key={item.id} className="rounded-md border border-gray-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h4 className="break-words text-sm font-semibold text-gray-950">
                                        {item.title}
                                    </h4>
                                    <p className="mt-1 truncate text-xs text-gray-500">
                                        Tarea: {item.taskItemTitle}
                                    </p>
                                </div>
                                <span className={`shrink-0 rounded px-2 py-1 text-[11px] font-semibold ${workloadStatusStyles[item.status] ?? "bg-gray-100 text-gray-700"}`}>
                                    {item.status}
                                </span>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2 text-xs text-gray-500">
                                <span>{responsible || "Sin responsable"}</span>
                                {item.endDate && (
                                    <span className={item.isOverdue ? "font-semibold text-red-700" : ""}>
                                        {item.isOverdue ? "Venció" : "Límite"} {formatDate(item.endDate)}
                                    </span>
                                )}
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}

function DashboardRiskDialog({
    view,
    items,
    onClose
}: {
    view: RiskView;
    items: DashboardRiskItem[];
    onClose: () => void;
}) {
    const isOverdue = view === "overdue";
    const isUnassigned = view === "unassigned";
    const title = isOverdue
        ? "Trabajos atrasados"
        : isUnassigned ? "Trabajos sin responsable" : "Cuellos de botella";
    const description = isOverdue
        ? "Tareas principales fuera de fecha y sin completar."
        : "Subtareas que permanecen en revisión o están pausadas.";

    useCloseOnEscape(onClose);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
            onMouseDown={onClose}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="dashboard-risk-title"
                onMouseDown={(event) => event.stopPropagation()}
                className="flex max-h-[min(760px,90vh)] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
            >
                <header className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 sm:px-6">
                    <div>
                        <p className={`text-xs font-semibold uppercase ${isOverdue ? "text-red-600" : "text-amber-700"}`}>
                            Atención operativa
                        </p>
                        <h2 id="dashboard-risk-title" className="mt-1 text-lg font-semibold text-gray-950">
                            {title}
                            <span className="ml-2 text-sm font-medium text-gray-400">
                                {items.length}
                            </span>
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">{description}</p>
                    </div>
                    <button
                        type="button"
                        title="Cerrar"
                        aria-label="Cerrar detalle"
                        onClick={onClose}
                        className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                    >
                        <X size={20} />
                    </button>
                </header>

                <div className="overflow-y-auto">
                    {items.length === 0 ? (
                        <p className="px-6 py-12 text-center text-sm text-gray-500">
                            No hay elementos que requieran atención.
                        </p>
                    ) : items.map((item) => (
                        <Link
                            key={item.itemId}
                            href={taskHref(item.subProjectId, item.parentTaskId)}
                            onClick={onClose}
                            className="grid gap-3 border-b border-gray-100 px-5 py-4 transition last:border-b-0 hover:bg-gray-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
                        >
                            <div className="min-w-0">
                                <p className="break-words text-sm font-semibold text-gray-950">
                                    {item.title}
                                </p>
                                {!isOverdue && (
                                    <p className="mt-1 truncate text-xs text-gray-500">
                                        Tarea: {item.parentTaskTitle}
                                    </p>
                                )}
                                <p className="mt-1 break-words text-xs leading-5 text-gray-400">
                                    {item.clientCompanyName ?? "Sin empresa cliente"}
                                    <span className="px-1.5">/</span>
                                    {item.projectTitle}
                                    <span className="px-1.5">/</span>
                                    {item.subProjectTitle}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                    {item.assignedUserName ?? "Sin responsable"}
                                </p>
                            </div>

                            <div className="flex items-center justify-between gap-4 sm:justify-end">
                                <div className="text-left sm:text-right">
                                    <span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${item.status === "Pausada" ? "bg-amber-50 text-amber-700" : item.status === "En revisión" ? "bg-violet-50 text-violet-700" : "bg-gray-100 text-gray-700"}`}>
                                        {item.status}
                                    </span>
                                    {item.dueDate && (
                                        <p className="mt-1.5 text-xs text-gray-500">
                                            Límite {formatDate(item.dueDate)}
                                        </p>
                                    )}
                                    {item.daysOverdue > 0 && (
                                        <p className="mt-1 text-xs font-semibold text-red-600">
                                            {item.daysOverdue} {item.daysOverdue === 1 ? "día" : "días"} de atraso
                                        </p>
                                    )}
                                </div>
                                <ArrowUpRight size={17} className="shrink-0 text-blue-700" />
                            </div>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
}

function SectionHeading({ icon: Icon, title, description }: SectionHeadingProps) {
    return (
        <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-700">
                <Icon size={18} />
            </span>
            <div>
                <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
                <p className="mt-0.5 text-xs text-gray-400">{description}</p>
            </div>
        </div>
    );
}

function AssignmentQueue({
    title,
    items,
    users,
    isAssigningId,
    onAssign
}: {
    title: string;
    items: DashboardRiskItem[];
    users: User[];
    isAssigningId: string | null;
    onAssign: (itemId: string, assignedUserId: string | null) => Promise<void>;
}) {
    return (
        <section className="min-w-0 p-4 sm:p-5" aria-label={title}>
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-gray-600">{title}</h3>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">{items.length}</span>
            </div>
            <div className="mt-3 space-y-2">
                {items.length === 0 ? (
                    <p className="rounded-md border border-dashed border-gray-300 px-3 py-5 text-sm text-gray-500">No hay elementos pendientes.</p>
                ) : items.map((item) => (
                    <article key={item.itemId} className="rounded-md border border-gray-200 bg-white p-3">
                        <div className="min-w-0">
                            <Link href={taskHref(item.subProjectId, item.parentTaskId)} className="block truncate text-sm font-semibold text-gray-950 hover:text-blue-700">
                                {item.title}
                            </Link>
                            <p className="mt-1 truncate text-xs text-gray-500">
                                {item.clientCompanyName ?? "Sin cliente"} / {item.projectTitle} / {item.subProjectTitle}
                            </p>
                        </div>
                        <label className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3 text-xs font-semibold text-gray-600">
                            <span className="shrink-0">Asignar a</span>
                            <select
                                defaultValue=""
                                disabled={isAssigningId === item.itemId}
                                onChange={(event) => {
                                    if (event.target.value) {
                                        void onAssign(item.itemId, event.target.value);
                                    }
                                }}
                                className="h-8 min-w-0 flex-1 rounded border border-gray-300 bg-white px-2 text-xs text-gray-700 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
                            >
                                <option value="">Elegir usuario</option>
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>
                                ))}
                            </select>
                        </label>
                    </article>
                ))}
            </div>
        </section>
    );
}

function EmptyState({ text }: { text: string }) {
    return <p className="py-8 text-center text-sm text-gray-400">{text}</p>;
}

function AlertList({ children }: { children: ReactNode }) {
    return <div className="min-h-32">{children}</div>;
}
