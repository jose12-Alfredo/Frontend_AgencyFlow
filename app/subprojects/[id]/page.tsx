"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CalendarDays, CalendarRange, Eye, RefreshCw } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { WorkHierarchyBreadcrumbs } from "@/components/navigation/WorkHierarchyBreadcrumbs";
import { PROJECT_MANAGER_ROLES } from "@/lib/roles";
import { ApiError } from "@/services/api";
import { subProjectsService } from "@/services/subprojects.service";
import { SubProject } from "@/types/subproject.types";

function formatDate(value: string | null): string {
    if (!value) return "Sin fecha de fin";
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("es-BO").format(new Date(year, month - 1, day));
}

export default function SubProjectDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [subProject, setSubProject] = useState<SubProject | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setSubProject(await subProjectsService.getById(id));
        } catch (cause) {
            setError(cause instanceof ApiError ? cause.message : "No se pudo cargar el subproyecto.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    return <RequireAuth allowedRoles={PROJECT_MANAGER_ROLES}><AppShell>
        {loading ? <p className="text-sm text-gray-500">Cargando subproyecto…</p> : error || !subProject ? <section role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error ?? "El subproyecto no está disponible."}</section> : <div className="space-y-6">
            <WorkHierarchyBreadcrumbs items={[
                { type: "Cliente", label: subProject.clientCompanyName ?? "Sin empresa cliente", href: subProject.clientCompanyId ? `/client-companies/${subProject.clientCompanyId}` : undefined },
                { type: "Proyecto", label: subProject.projectTitle, href: `/projects/${subProject.projectId}` },
                { type: "Subproyecto", label: subProject.title }
            ]} />
            <header className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"><div className="border-l-4 border-violet-600 px-6 py-5 sm:px-7"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">{subProject.departmentName}</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">{subProject.title}</h1><p className="mt-2 text-sm leading-6 text-gray-600">{subProject.detail || "Sin detalle"}</p><div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600"><span><span className="font-semibold text-gray-800">Responsable:</span> {[subProject.assignedUserFirstName, subProject.assignedUserLastName].filter(Boolean).join(" ") || "Sin responsable asignado"}</span><span className="inline-flex items-center gap-2"><CalendarDays size={16} className="text-gray-400" />{formatDate(subProject.startDate)} — {formatDate(subProject.endDate)}</span></div></div></header>
            <section className="rounded-xl border border-gray-200 bg-white shadow-sm"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4"><div><h2 className="text-base font-semibold text-gray-950">Trabajo del subproyecto</h2><p className="mt-1 text-sm text-gray-500">Consulta las tareas o abre la planificación cuando esté disponible.</p></div><div className="flex items-center gap-2"><Link href={`/subprojects/${subProject.id}/gantt`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"><CalendarRange size={17} /> Ver Gantt</Link><button type="button" onClick={() => void load()} aria-label="Actualizar subproyecto" title="Actualizar" className="inline-flex size-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"><RefreshCw size={18} /></button></div></header><div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5"><p className="text-sm text-gray-600">Las tareas se mantienen en su vista operativa actual.</p><Link href={`/tasks?projectId=${subProject.projectId}&subProjectId=${subProject.id}`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"><Eye size={17} /> Ver tareas</Link></div></section>
        </div>}
    </AppShell></RequireAuth>;
}
