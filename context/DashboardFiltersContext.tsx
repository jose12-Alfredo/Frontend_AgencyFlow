"use client";

import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useMemo,
    useState
} from "react";
import { ClientCompany } from "@/types/client-company.types";
import { Department } from "@/types/department.types";
import { Project } from "@/types/project.types";
import { SubProject } from "@/types/subproject.types";
import { User } from "@/types/user.types";

export interface DashboardFilters {
    clientCompanyId: string;
    projectId: string;
    subProjectId: string;
    departmentId: string;
    responsibleUserId: string;
    period: string;
}

export interface DashboardFilterCatalogs {
    clients: ClientCompany[];
    projects: Project[];
    subProjects: SubProject[];
    departments: Department[];
    users: User[];
}

interface DashboardFiltersContextValue {
    filters: DashboardFilters;
    catalogs: DashboardFilterCatalogs;
    visibleProjects: Project[];
    visibleSubProjects: SubProject[];
    activeFilterCount: number;
    isLoading: boolean;
    error: string | null;
    setClientCompany: (id: string) => void;
    setProject: (id: string) => void;
    setSubProject: (id: string) => void;
    setDepartment: (id: string) => void;
    setResponsibleUser: (id: string) => void;
    setPeriod: (period: string) => void;
    clearFilters: () => void;
    retry: () => void;
}

const INITIAL_FILTERS: DashboardFilters = {
    clientCompanyId: "",
    projectId: "",
    subProjectId: "",
    departmentId: "",
    responsibleUserId: "",
    period: new Date().toISOString().slice(0, 7)
};

const DashboardFiltersContext = createContext<
    DashboardFiltersContextValue | undefined
>(undefined);

export function DashboardFiltersProvider({
    catalogs,
    isLoading,
    error,
    onRetry,
    children
}: {
    catalogs: DashboardFilterCatalogs;
    isLoading: boolean;
    error: string | null;
    onRetry: () => void;
    children: ReactNode;
}) {
    const [filters, setFilters] = useState<DashboardFilters>(INITIAL_FILTERS);

    const visibleProjects = useMemo(
        () => filters.clientCompanyId
            ? catalogs.projects.filter(
                (project) => project.clientCompanyId === filters.clientCompanyId
            )
            : catalogs.projects,
        [catalogs.projects, filters.clientCompanyId]
    );

    const visibleSubProjects = useMemo(() => {
        if (filters.projectId) {
            return catalogs.subProjects.filter(
                (subProject) => subProject.projectId === filters.projectId
            );
        }

        if (filters.clientCompanyId) {
            const projectIds = new Set(
                visibleProjects.map((project) => project.id)
            );

            return catalogs.subProjects.filter((subProject) =>
                projectIds.has(subProject.projectId)
            );
        }

        return catalogs.subProjects;
    }, [
        catalogs.subProjects,
        filters.clientCompanyId,
        filters.projectId,
        visibleProjects
    ]);

    const setClientCompany = useCallback((id: string) => {
        setFilters((current) => ({
            ...current,
            clientCompanyId: id,
            projectId: "",
            subProjectId: ""
        }));
    }, []);

    const setProject = useCallback((id: string) => {
        setFilters((current) => ({
            ...current,
            projectId: id,
            subProjectId: ""
        }));
    }, []);

    const setSubProject = useCallback((id: string) => {
        setFilters((current) => ({ ...current, subProjectId: id }));
    }, []);

    const setDepartment = useCallback((id: string) => {
        setFilters((current) => ({ ...current, departmentId: id }));
    }, []);

    const setResponsibleUser = useCallback((id: string) => {
        setFilters((current) => ({ ...current, responsibleUserId: id }));
    }, []);

    const setPeriod = useCallback((period: string) => {
        setFilters((current) => ({ ...current, period }));
    }, []);

    const clearFilters = useCallback(() => {
        setFilters(INITIAL_FILTERS);
    }, []);

    const activeFilterCount = Object.entries(filters).filter(
        ([key, value]) => key === "period" ? false : value !== ""
    ).length;

    const value = useMemo<DashboardFiltersContextValue>(() => ({
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
        retry: onRetry
    }), [
        activeFilterCount,
        catalogs,
        clearFilters,
        error,
        filters,
        isLoading,
        onRetry,
        setClientCompany,
        setDepartment,
        setPeriod,
        setProject,
        setResponsibleUser,
        setSubProject,
        visibleProjects,
        visibleSubProjects
    ]);

    return (
        <DashboardFiltersContext.Provider value={value}>
            {children}
        </DashboardFiltersContext.Provider>
    );
}

export function useDashboardFilters(): DashboardFiltersContextValue {
    const context = useContext(DashboardFiltersContext);

    if (context === undefined) {
        throw new Error(
            "useDashboardFilters debe utilizarse dentro de DashboardFiltersProvider."
        );
    }

    return context;
}
