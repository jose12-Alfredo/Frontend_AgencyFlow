"use client";

import { useCallback, useEffect, useState } from "react";
import { BriefcaseBusiness, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { JobPositionDeleteDialog } from "@/components/job-positions/JobPositionDeleteDialog";
import { JobPositionFormModal } from "@/components/job-positions/JobPositionFormModal";
import { AppShell } from "@/components/layout/AppShell";
import { ADMIN_ROLES } from "@/lib/roles";
import { ApiError } from "@/services/api";
import { jobPositionsService } from "@/services/job-positions.service";
import { JobPosition } from "@/types/job-position.types";

export default function JobPositionsPage() {
    const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedJobPosition, setSelectedJobPosition] = useState<JobPosition | null>(null);
    const [jobPositionToDelete, setJobPositionToDelete] = useState<JobPosition | null>(null);

    const loadJobPositions = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await jobPositionsService.getAll({ page: 1, pageSize: 100 });
            setJobPositions(result.items);
        } catch (error) {
            setError(error instanceof ApiError ? error.message : "No se pudieron cargar los cargos.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadJobPositions();
    }, [loadJobPositions]);

    return (
        <RequireAuth allowedRoles={ADMIN_ROLES}>
            <AppShell>
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-blue-600">Administración</p>
                        <h1 className="mt-1 text-2xl font-semibold text-gray-900">Cargos</h1>
                        <p className="mt-2 text-sm text-gray-600">Nombres de puesto que identifican la función real de cada persona.</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <button type="button" onClick={() => { setSelectedJobPosition(null); setIsFormOpen(true); }} className="flex h-10 items-center gap-2 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-700">
                            <Plus size={18} />Nuevo cargo
                        </button>
                        <button type="button" title="Actualizar cargos" aria-label="Actualizar cargos" onClick={() => void loadJobPositions()} disabled={isLoading} className="rounded-md border border-gray-300 bg-white p-2.5 text-gray-600 transition hover:bg-gray-50 disabled:opacity-50">
                            <RefreshCw size={19} className={isLoading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {error && <div role="alert" className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

                <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] border-collapse text-left">
                            <thead className="border-b border-gray-200 bg-gray-50">
                                <tr>
                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">Cargo</th>
                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">Descripción</th>
                                    <th className="w-32 px-5 py-3 text-right text-xs font-semibold uppercase text-gray-500">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {isLoading ? (
                                    <tr><td colSpan={3} className="px-5 py-10 text-center text-sm text-gray-500">Cargando cargos...</td></tr>
                                ) : jobPositions.length === 0 ? (
                                    <tr><td colSpan={3} className="px-5 py-12 text-center">
                                        <BriefcaseBusiness className="mx-auto text-gray-300" size={32} />
                                        <p className="mt-3 text-sm font-medium text-gray-700">Aún no hay cargos registrados</p>
                                        <p className="mt-1 text-sm text-gray-500">Crea cargos como Planner o Community Manager.</p>
                                    </td></tr>
                                ) : jobPositions.map((jobPosition) => (
                                    <tr key={jobPosition.id}>
                                        <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><BriefcaseBusiness size={18} /></span><span className="text-sm font-medium text-gray-900">{jobPosition.name}</span></div></td>
                                        <td className="px-5 py-4 text-sm text-gray-600">{jobPosition.description || "Sin descripción"}</td>
                                        <td className="px-5 py-4 text-right"><div className="flex items-center justify-end gap-1">
                                            <button type="button" title="Editar cargo" aria-label={`Editar ${jobPosition.name}`} onClick={() => { setSelectedJobPosition(jobPosition); setIsFormOpen(true); }} className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"><Pencil size={18} /></button>
                                            <button type="button" title="Eliminar cargo" aria-label={`Eliminar ${jobPosition.name}`} onClick={() => setJobPositionToDelete(jobPosition)} className="rounded-md p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600"><Trash2 size={18} /></button>
                                        </div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {isFormOpen && <JobPositionFormModal jobPosition={selectedJobPosition} onClose={() => { setIsFormOpen(false); setSelectedJobPosition(null); }} onSaved={loadJobPositions} />}
                {jobPositionToDelete && <JobPositionDeleteDialog jobPosition={jobPositionToDelete} onClose={() => setJobPositionToDelete(null)} onDeleted={loadJobPositions} />}
            </AppShell>
        </RequireAuth>
    );
}
