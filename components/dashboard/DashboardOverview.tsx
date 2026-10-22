"use client";

import Link from "next/link";
import {
    ArrowRight,
    AlertTriangle,
    CheckCircle2,
    CircleGauge,
    TimerReset,
    UserRoundCheck,
    UserRoundX
} from "lucide-react";
import type { DashboardData, DashboardRiskItem, WorkloadItem } from "@/types/dashboard.types";

export type DashboardSection = "overview" | "attention" | "team" | "clients" | "projects" | "flow" | "history";
export type DashboardRiskView = "overdue" | "bottlenecks" | "unassigned";

interface DashboardOverviewProps {
    data: DashboardData;
    activeFilterCount: number;
    isRefreshing: boolean;
    onOpenSection: (section: DashboardSection) => void;
    onOpenRisk: (view: DashboardRiskView) => void;
    onOpenFinalization: () => void;
    onOpenUser: (userId: string) => void;
}

function taskHref(item: DashboardRiskItem): string {
    return `/subtasks?subProjectId=${item.subProjectId}&taskId=${item.parentTaskId}`;
}

function getInitials(name: string): string {
    return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function workloadTotal(person: WorkloadItem): number {
    return person.activeTaskCount + person.activeSubTaskCount;
}

export function DashboardOverview({
    data,
    activeFilterCount,
    isRefreshing,
    onOpenSection,
    onOpenRisk,
    onOpenFinalization,
    onOpenUser
}: DashboardOverviewProps) {
    const completed = data.kpis.completedSubTaskCount ?? data.workflowDistribution.find((item) => item.status === "Completada")?.count ?? 0;
    const total = data.kpis.totalSubTaskCount ?? data.workflowDistribution.reduce((sum, item) => sum + item.count, data.pausedTaskCount);
    const completion = data.kpis.globalProgressPercentage ?? data.kpis.completionRate;
    const overdue = data.kpis.overdueTaskCount + (data.kpis.overdueSubTaskCount ?? 0);
    const risk = data.kpis.atRiskProjectCount + data.kpis.atRiskSubProjectCount;
    const internalPeople = data.workload.filter((person) => person.roleName !== "Cliente");
    const available = internalPeople.filter((person) => workloadTotal(person) === 0).length;
    const unassignedTasks = data.kpis.unassignedTaskCount ?? data.unassignedTasks?.length ?? 0;
    const unassignedSubTasks = data.kpis.unassignedSubTaskCount ?? data.unassignedSubTasks?.length ?? 0;
    const unassigned = unassignedTasks + unassignedSubTasks;
    const stalled = (data.kpis.stalledTaskCount ?? data.stalledTasks.length) + (data.kpis.stalledSubTaskCount ?? data.stalledSubTasks.length);

    const indicators = [
        {
            label: "Finalización",
            value: total === 0 || completion === null ? "—" : `${new Intl.NumberFormat("es-BO", { maximumFractionDigits: 1 }).format(completion)}%`,
            detail: total === 0 ? "Sin datos suficientes" : `${completed} de ${total} subtareas`,
            color: "border-l-emerald-500",
            valueColor: "text-slate-900",
            icon: CheckCircle2,
            action: () => activeFilterCount === 0 && total > 0 ? onOpenFinalization() : onOpenSection("flow")
        },
        {
            label: "Atrasos",
            value: String(overdue),
            detail: `${data.kpis.overdueTaskCount} tareas · ${data.kpis.overdueSubTaskCount ?? 0} subtareas`,
            color: overdue > 0 ? "border-l-rose-500" : "border-l-slate-300",
            valueColor: overdue > 0 ? "text-rose-700" : "text-slate-900",
            icon: AlertTriangle,
            action: () => overdue > 0 ? onOpenRisk("overdue") : onOpenSection("attention")
        },
        {
            label: "En riesgo",
            value: String(risk),
            detail: `${data.kpis.atRiskProjectCount} proyectos · ${data.kpis.atRiskSubProjectCount} subproyectos`,
            color: risk > 0 ? "border-l-amber-500" : "border-l-slate-300",
            valueColor: risk > 0 ? "text-amber-800" : "text-slate-900",
            icon: CircleGauge,
            action: () => onOpenSection("projects")
        },
        {
            label: "Disponibles",
            value: String(available),
            detail: `de ${internalPeople.length} personas`,
            color: "border-l-teal-500",
            valueColor: "text-slate-900",
            icon: UserRoundCheck,
            action: () => onOpenSection("team")
        },
        {
            label: "Sin responsable",
            value: String(unassigned),
            detail: `${unassignedTasks} tareas · ${unassignedSubTasks} subtareas`,
            color: unassigned > 0 ? "border-l-violet-500" : "border-l-slate-300",
            valueColor: "text-slate-900",
            icon: UserRoundX,
            action: () => onOpenSection("attention")
        },
        {
            label: "Sin movimiento",
            value: String(stalled),
            detail: "Tareas y subtareas",
            color: stalled > 0 ? "border-l-orange-500" : "border-l-slate-300",
            valueColor: "text-slate-900",
            icon: TimerReset,
            action: () => onOpenSection("attention")
        }
    ];

    const overdueItems = (data.overdueItems ?? data.overdueTasks).slice(0, 3);
    const atRiskSubProjects = data.subProjectHealth.filter((item) => item.isAtRisk).slice(0, Math.max(0, 4 - overdueItems.length));
    const priorityPeople = [...internalPeople].sort((a, b) =>
        (b.overdueTaskCount + b.overdueSubTaskCount) - (a.overdueTaskCount + a.overdueSubTaskCount) ||
        workloadTotal(b) - workloadTotal(a)
    ).slice(0, 5);
    const firstAvailable = internalPeople.find((person) => workloadTotal(person) === 0);
    if (firstAvailable && priorityPeople.length === 5 && !priorityPeople.some((person) => person.userId === firstAvailable.userId)) {
        priorityPeople[4] = firstAvailable;
    }
    const maxWorkload = Math.max(1, ...priorityPeople.map(workloadTotal));

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-3" aria-busy={isRefreshing}>
            <section aria-label="Indicadores clave" className="grid shrink-0 grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
                {indicators.map((indicator) => {
                    const Icon = indicator.icon;
                    return (
                        <button
                            key={indicator.label}
                            type="button"
                            onClick={indicator.action}
                            className={`group flex min-h-[108px] min-w-0 flex-col rounded-lg border border-slate-200 border-l-[3px] bg-white px-3.5 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${indicator.color}`}
                        >
                            <span className="flex w-full items-center justify-between gap-1.5 text-[11px] font-semibold text-slate-600">
                                <span className="truncate">{indicator.label}</span>
                                <Icon size={15} className="shrink-0 text-slate-400 group-hover:text-violet-600" aria-hidden="true" />
                            </span>
                            <strong className={`mt-1.5 text-[27px] font-semibold leading-none tabular-nums tracking-tight ${indicator.valueColor}`}>{indicator.value}</strong>
                            <span className="mt-auto truncate pt-1 text-[11px] text-slate-500" title={indicator.detail}>{indicator.detail}</span>
                        </button>
                    );
                })}
            </section>

            <p className="shrink-0 text-xs text-slate-500" role="status">
                <span className="font-semibold text-slate-700">Panorama actual:</span> {overdue} atrasos · {risk} en riesgo · {available} personas disponibles
            </p>

            <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                <section className="flex min-h-[290px] min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white lg:min-h-0" aria-labelledby="overview-attention-title">
                    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                        <div className="min-w-0">
                            <h2 id="overview-attention-title" className="text-sm font-bold text-slate-900">Requiere atención</h2>
                            <p className="text-[11px] text-slate-500">Problemas que necesitan una decisión</p>
                        </div>
                        <button type="button" onClick={() => onOpenSection("attention")} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-900 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600">
                            Ver todo <ArrowRight size={14} aria-hidden="true" />
                        </button>
                    </div>
                    <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
                        {overdueItems.map((item) => (
                            <Link key={`overdue-${item.itemId}`} href={taskHref(item)} className="flex min-w-0 items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-violet-600">
                                <span className="min-w-0">
                                    <span className="block truncate text-xs font-semibold text-slate-900">{item.title}</span>
                                    <span className="mt-0.5 block truncate text-[11px] text-slate-500" title={[item.clientCompanyName, item.projectTitle, item.subProjectTitle, item.assignedUserName].filter(Boolean).join(" · ")}>
                                        {[item.clientCompanyName, item.projectTitle, item.subProjectTitle, item.assignedUserName ?? "Sin responsable"].filter(Boolean).join(" · ")}
                                    </span>
                                </span>
                                <span className="shrink-0 text-right text-[11px] font-semibold text-rose-700">{item.daysOverdue} d atraso</span>
                            </Link>
                        ))}
                        {atRiskSubProjects.map((item) => (
                            <Link key={`risk-${item.subProjectId}`} href={`/tasks?subProjectId=${item.subProjectId}`} className="flex min-w-0 items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-violet-600">
                                <span className="min-w-0">
                                    <span className="block truncate text-xs font-semibold text-slate-900">{item.title}</span>
                                    <span className="mt-0.5 block truncate text-[11px] text-slate-500">{item.projectTitle} · Subproyecto</span>
                                </span>
                                <span className="shrink-0 text-[11px] font-semibold text-amber-800">En riesgo</span>
                            </Link>
                        ))}
                        {overdueItems.length === 0 && atRiskSubProjects.length === 0 && data.kpis.atRiskProjectCount > 0 && (
                            <button type="button" onClick={() => onOpenSection("projects")} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-xs hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-violet-600">
                                <span className="font-semibold text-slate-900">{data.kpis.atRiskProjectCount} proyectos en riesgo</span>
                                <span className="text-amber-800">Ver contexto →</span>
                            </button>
                        )}
                        {overdueItems.length === 0 && atRiskSubProjects.length === 0 && data.kpis.atRiskProjectCount === 0 && (
                            <div className="flex h-full min-h-28 items-center justify-center px-4 text-center text-xs text-slate-500">
                                Sin atrasos ni subproyectos en riesgo para este contexto.
                            </div>
                        )}
                    </div>
                    {(unassigned > 0 || stalled > 0) && (
                        <button type="button" onClick={() => onOpenSection("attention")} className="shrink-0 border-t border-slate-100 bg-slate-50 px-4 py-2 text-left text-[11px] font-medium text-slate-600 hover:text-violet-700 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-violet-600">
                            {unassigned > 0 ? `${unassigned} sin responsable` : ""}{unassigned > 0 && stalled > 0 ? " · " : ""}{stalled > 0 ? `${stalled} sin movimiento` : ""} <span aria-hidden="true">→</span>
                        </button>
                    )}
                </section>

                <section className="flex min-h-[290px] min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white lg:min-h-0" aria-labelledby="overview-team-title">
                    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                        <div className="min-w-0">
                            <h2 id="overview-team-title" className="text-sm font-bold text-slate-900">Carga del equipo</h2>
                            <p className="text-[11px] text-slate-500">Actividad y personas disponibles</p>
                        </div>
                        <button type="button" onClick={() => onOpenSection("team")} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-900 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600">
                            Ver equipo <ArrowRight size={14} aria-hidden="true" />
                        </button>
                    </div>
                    <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
                        {priorityPeople.length === 0 ? (
                            <div className="flex h-full min-h-28 items-center justify-center px-4 text-center text-xs text-slate-500">No hay personas para mostrar.</div>
                        ) : priorityPeople.map((person) => {
                            const active = workloadTotal(person);
                            const overdueWork = person.overdueTaskCount + person.overdueSubTaskCount;
                            return (
                                <button key={person.userId} type="button" onClick={() => onOpenUser(person.userId)} className="flex w-full min-w-0 items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-violet-600">
                                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${active === 0 ? "bg-teal-100 text-teal-800" : "bg-violet-100 text-violet-800"}`}>{getInitials(person.userName)}</span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-center gap-2">
                                            <span className="truncate text-xs font-semibold text-slate-900">{person.userName}</span>
                                            {overdueWork > 0 && <span className="shrink-0 text-[10px] font-semibold text-rose-700">{overdueWork} atrasos</span>}
                                        </span>
                                        {active === 0 ? (
                                            <span className="mt-1 block text-[11px] font-medium text-teal-700">Disponible · {person.completedTaskCount + person.completedSubTaskCount} completadas</span>
                                        ) : (
                                            <span className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${person.activeTaskCount} tareas y ${person.activeSubTaskCount} subtareas activas`}>
                                                <span className="h-full bg-violet-600" style={{ width: `${person.activeTaskCount / maxWorkload * 100}%` }} />
                                                <span className="h-full bg-sky-500" style={{ width: `${person.activeSubTaskCount / maxWorkload * 100}%` }} />
                                            </span>
                                        )}
                                    </span>
                                    <span className="w-7 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-700">{active}</span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex shrink-0 items-center gap-3 border-t border-slate-100 px-4 py-2 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-violet-600" /> Tareas activas</span>
                        <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-sky-500" /> Subtareas activas</span>
                    </div>
                </section>
            </div>

            <nav aria-label="Más análisis del dashboard" className="flex shrink-0 items-center gap-1.5 overflow-x-auto pb-0.5">
                {([
                    ["clients", "Clientes y avance"],
                    ["projects", "Subproyectos"],
                    ["flow", "Flujo de trabajo"],
                    ["attention", "Vencimientos"],
                    ["history", "Histórico"]
                ] as const).map(([section, label]) => (
                    <button key={section} type="button" onClick={() => onOpenSection(section)} className="shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:border-violet-200 hover:text-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600">
                        {label}
                    </button>
                ))}
            </nav>
        </div>
    );
}
