"use client";

import {
    useCallback,
    useEffect,
    useState
} from "react";
import {
    Pencil,
    Plus,
    RefreshCw,
    Trash2
} from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ADMIN_ROLES } from "@/lib/roles";
import { AppShell } from "@/components/layout/AppShell";
import { ProjectTypeDeleteDialog } from "@/components/project-types/ProjectTypeDeleteDialog";
import { ProjectTypeFormModal } from "@/components/project-types/ProjectTypeFormModal";
import { ApiError } from "@/services/api";
import { projectTypesService } from "@/services/project-types.service";
import { ProjectType } from "@/types/project-type.types";

export default function ProjectTypesPage() {
    const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedProjectType, setSelectedProjectType] =
        useState<ProjectType | null>(null);
    const [projectTypeToDelete, setProjectTypeToDelete] =
        useState<ProjectType | null>(null);

    const loadProjectTypes = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await projectTypesService.getAll({
                page: 1,
                pageSize: 100
            });

            setProjectTypes(result.items);
        } catch (error) {
            if (error instanceof ApiError) {
                setError(error.message);
            } else {
                setError("No se pudieron cargar los tipos de proyecto.");
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Carga inicial de tipos de proyecto al abrir la página.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadProjectTypes();
    }, [loadProjectTypes]);

    return (
        <RequireAuth allowedRoles={ADMIN_ROLES}>
            <AppShell>
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-blue-600">
                            Proyectos
                        </p>

                        <h1 className="mt-1 text-2xl font-semibold text-gray-900">
                            Tipos de proyecto
                        </h1>

                        <p className="mt-2 text-sm text-gray-600">
                            Categorías utilizadas para organizar los proyectos.
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedProjectType(null);
                                setIsFormOpen(true);
                            }}
                            className="flex h-10 items-center gap-2 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-700"
                        >
                            <Plus size={18} />
                            Nuevo tipo
                        </button>

                        <button
                            type="button"
                            title="Actualizar tipos de proyecto"
                            aria-label="Actualizar tipos de proyecto"
                            onClick={() => void loadProjectTypes()}
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
                        <table className="w-full min-w-[600px] border-collapse text-left">
                            <thead className="border-b border-gray-200 bg-gray-50">
                                <tr>
                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Nombre
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Descripción
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
                                            colSpan={3}
                                            className="px-5 py-10 text-center text-sm text-gray-500"
                                        >
                                            Cargando tipos de proyecto...
                                        </td>
                                    </tr>
                                ) : projectTypes.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={3}
                                            className="px-5 py-10 text-center text-sm text-gray-500"
                                        >
                                            No existen tipos de proyecto registrados.
                                        </td>
                                    </tr>
                                ) : (
                                    projectTypes.map((projectType) => (
                                        <tr key={projectType.id}>
                                            <td className="px-5 py-4 text-sm font-medium text-gray-900">
                                                {projectType.name}
                                            </td>

                                            <td className="px-5 py-4 text-sm text-gray-600">
                                                {projectType.description ||
                                                    "Sin descripción"}
                                            </td>

                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        title="Editar tipo de proyecto"
                                                        aria-label={`Editar ${projectType.name}`}
                                                        onClick={() => {
                                                            setSelectedProjectType(
                                                                projectType
                                                            );
                                                            setIsFormOpen(true);
                                                        }}
                                                        className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                                                    >
                                                        <Pencil size={18} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        title="Eliminar tipo de proyecto"
                                                        aria-label={`Eliminar ${projectType.name}`}
                                                        onClick={() =>
                                                            setProjectTypeToDelete(
                                                                projectType
                                                            )
                                                        }
                                                        className="rounded-md p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {isFormOpen && (
                    <ProjectTypeFormModal
                        projectType={selectedProjectType}
                        onClose={() => {
                            setIsFormOpen(false);
                            setSelectedProjectType(null);
                        }}
                        onSaved={loadProjectTypes}
                    />
                )}

                {projectTypeToDelete && (
                    <ProjectTypeDeleteDialog
                        projectType={projectTypeToDelete}
                        onClose={() => setProjectTypeToDelete(null)}
                        onDeleted={loadProjectTypes}
                    />
                )}
            </AppShell>
        </RequireAuth>
    );
}
