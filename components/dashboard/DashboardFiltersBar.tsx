"use client";

import type { ReactNode } from "react";
import { AlertCircle, RefreshCw, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useDashboardFilters } from "@/context/DashboardFiltersContext";

export function DashboardFiltersBar() {
    const {
        filters, catalogs, visibleProjects, visibleSubProjects, activeFilterCount,
        isLoading, error, setClientCompany, setProject, setSubProject,
        setDepartment, setResponsibleUser, setPeriod, clearFilters, retry
    } = useDashboardFilters();

    return (
        <section aria-label="Filtros del dashboard" className="shrink-0 rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center gap-2 p-2">
                <span className="flex shrink-0 items-center gap-1.5 px-1 text-xs font-semibold text-slate-700">
                    <SlidersHorizontal size={15} className="text-violet-700" aria-hidden="true" />
                    <span className="hidden 2xl:inline">Filtrar</span>
                </span>
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                    <FilterSelect id="dashboard-client-filter" label="Cliente" value={filters.clientCompanyId} onChange={setClientCompany} disabled={isLoading || catalogs.clients.length === 0}>
                        <option value="">Todos los clientes</option>
                        {catalogs.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                    </FilterSelect>
                    <FilterSelect id="dashboard-project-filter" label="Proyecto" value={filters.projectId} onChange={setProject} disabled={isLoading || visibleProjects.length === 0}>
                        <option value="">Todos los proyectos</option>
                        {visibleProjects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
                    </FilterSelect>
                    <FilterSelect id="dashboard-subproject-filter" label="Subproyecto" value={filters.subProjectId} onChange={setSubProject} disabled={isLoading || visibleSubProjects.length === 0}>
                        <option value="">Todos los subproyectos</option>
                        {visibleSubProjects.map((subProject) => <option key={subProject.id} value={subProject.id}>{subProject.title}</option>)}
                    </FilterSelect>
                    <FilterSelect id="dashboard-department-filter" label="Área" value={filters.departmentId} onChange={setDepartment} disabled={isLoading || catalogs.departments.length === 0}>
                        <option value="">Todas las áreas</option>
                        {catalogs.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                    </FilterSelect>
                    <FilterSelect id="dashboard-responsible-filter" label="Responsable" value={filters.responsibleUserId} onChange={setResponsibleUser} disabled={isLoading || catalogs.users.length === 0}>
                        <option value="">Todos los responsables</option>
                        {catalogs.users.map((user) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>)}
                    </FilterSelect>
                    <label htmlFor="dashboard-period-filter" className="min-w-0">
                        <span className="sr-only">Mes</span>
                        <input id="dashboard-period-filter" type="month" value={filters.period} onChange={(event) => setPeriod(event.target.value)} disabled={isLoading} title="El periodo respeta las métricas temporales disponibles; la planificación por rango aún no está definida" className="h-8 w-full min-w-0 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-700 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:opacity-50" />
                    </label>
                </div>
                {activeFilterCount > 0 && (
                    <button type="button" onClick={clearFilters} disabled={isLoading} className="inline-flex h-8 shrink-0 items-center gap-1 px-1 text-xs font-semibold text-violet-700 hover:text-violet-900 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-violet-600 disabled:opacity-50">
                        <RotateCcw size={13} aria-hidden="true" /> Limpiar
                    </button>
                )}
            </div>
            {error && (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border-t border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                    <span className="inline-flex items-center gap-1.5"><AlertCircle size={14} aria-hidden="true" />{error}</span>
                    <button type="button" onClick={retry} className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-rose-600"><RefreshCw size={13} aria-hidden="true" /> Reintentar</button>
                </div>
            )}
        </section>
    );
}

function FilterSelect({ id, label, value, onChange, disabled, children }: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    disabled: boolean;
    children: ReactNode;
}) {
    return (
        <label htmlFor={id} className="min-w-0">
            <span className="sr-only">{label}</span>
            <select id={id} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="h-8 w-full min-w-0 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-700 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:opacity-50">
                {children}
            </select>
        </label>
    );
}
