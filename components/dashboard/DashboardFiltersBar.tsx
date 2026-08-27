"use client";

import type { ReactNode } from "react";
import {
    AlertCircle,
    RefreshCw,
    RotateCcw,
    SlidersHorizontal
} from "lucide-react";
import { useDashboardFilters } from "@/context/DashboardFiltersContext";

export function DashboardFiltersBar() {
    const {
        filters,
        catalogs,
        visibleProjects,
        visibleSubProjects,
        activeFilterCount,
        isLoading,
        error,
        setClientCompany,
        setProject,
        setSubProject,
        setDepartment,
        setResponsibleUser,
        setPeriod,
        clearFilters,
        retry
    } = useDashboardFilters();

    return (
        <section
            aria-labelledby="dashboard-filters-title"
            className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm"
        >
            <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                        <SlidersHorizontal size={16} />
                    </span>
                    <div className="min-w-0">
                        <h2 id="dashboard-filters-title" className="text-sm font-semibold text-gray-950">
                            Contexto del dashboard
                        </h2>
                        <p className="mt-0.5 text-xs text-gray-500">
                            Cliente → Proyecto → Subproyecto, con área, responsable y periodo.
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                    {activeFilterCount > 0 && (
                        <span className="text-xs font-semibold text-blue-700">
                            {activeFilterCount} {activeFilterCount === 1 ? "filtro activo" : "filtros activos"}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={clearFilters}
                        disabled={isLoading || activeFilterCount === 0}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <RotateCcw size={14} />
                        Limpiar
                    </button>
                </div>
            </div>

            {error && (
                <div role="alert" className="mx-4 mt-4 flex flex-col gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 sm:mx-5 sm:flex-row sm:items-center sm:justify-between">
                    <span className="flex items-center gap-2">
                        <AlertCircle size={16} className="shrink-0" />
                        {error}
                    </span>
                    <button
                        type="button"
                        onClick={retry}
                        className="inline-flex h-8 items-center justify-center gap-1.5 self-start rounded-md bg-white px-3 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 sm:self-auto"
                    >
                        <RefreshCw size={13} />
                        Reintentar
                    </button>
                </div>
            )}

            <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 sm:px-5">
                <FilterSelect
                    id="dashboard-client-filter"
                    label="Cliente"
                    value={filters.clientCompanyId}
                    onChange={setClientCompany}
                    disabled={isLoading || catalogs.clients.length === 0}
                >
                    <option value="">Todos los clientes</option>
                    {catalogs.clients.map((client) => (
                        <option key={client.id} value={client.id}>
                            {client.name}
                        </option>
                    ))}
                </FilterSelect>

                <FilterSelect
                    id="dashboard-project-filter"
                    label="Proyecto"
                    value={filters.projectId}
                    onChange={setProject}
                    disabled={isLoading || visibleProjects.length === 0}
                >
                    <option value="">Todos los proyectos</option>
                    {visibleProjects.map((project) => (
                        <option key={project.id} value={project.id}>
                            {project.title}
                        </option>
                    ))}
                </FilterSelect>

                <FilterSelect
                    id="dashboard-subproject-filter"
                    label="Subproyecto"
                    value={filters.subProjectId}
                    onChange={setSubProject}
                    disabled={isLoading || visibleSubProjects.length === 0}
                >
                    <option value="">Todos los subproyectos</option>
                    {visibleSubProjects.map((subProject) => (
                        <option key={subProject.id} value={subProject.id}>
                            {subProject.title}
                        </option>
                    ))}
                </FilterSelect>

                <FilterSelect
                    id="dashboard-department-filter"
                    label="Área"
                    value={filters.departmentId}
                    onChange={setDepartment}
                    disabled={isLoading || catalogs.departments.length === 0}
                >
                    <option value="">Todas las áreas</option>
                    {catalogs.departments.map((department) => (
                        <option key={department.id} value={department.id}>
                            {department.name}
                        </option>
                    ))}
                </FilterSelect>

                <FilterSelect
                    id="dashboard-responsible-filter"
                    label="Responsable"
                    value={filters.responsibleUserId}
                    onChange={setResponsibleUser}
                    disabled={isLoading || catalogs.users.length === 0}
                >
                    <option value="">Todos los responsables</option>
                    {catalogs.users.map((user) => (
                        <option key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
                        </option>
                    ))}
                </FilterSelect>

                <label htmlFor="dashboard-period-filter" className="min-w-0">
                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500">Mes</span>
                    <input
                    id="dashboard-period-filter"
                    type="month"
                    value={filters.period}
                    onChange={(event) => setPeriod(event.target.value)}
                    disabled={isLoading}
                    title="Pendiente de una definición de periodo planificado en el modelo de datos"
                    className="h-9 w-full min-w-0 rounded-md border border-gray-300 bg-white px-2.5 text-xs font-medium text-gray-800 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                />
                </label>
            </div>

            <p className="border-t border-gray-100 bg-gray-50 px-4 py-2 text-[11px] leading-4 text-gray-500 sm:px-5">
                Los KPI responden al contexto seleccionado. El periodo permanece en todo el historial hasta definir cómo se planifica el trabajo dentro de un rango de fechas.
            </p>
        </section>
    );
}

function FilterSelect({
    id,
    label,
    value,
    onChange,
    disabled,
    title,
    children
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    disabled: boolean;
    title?: string;
    children: ReactNode;
}) {
    return (
        <label htmlFor={id} className="min-w-0">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500">
                {label}
            </span>
            <select
                id={id}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                disabled={disabled}
                title={title}
                className="h-9 w-full min-w-0 rounded-md border border-gray-300 bg-white px-2.5 text-xs font-medium text-gray-800 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
            >
                {children}
            </select>
        </label>
    );
}
