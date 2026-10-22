"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { ApiError } from "@/services/api";
import { jobPositionsService } from "@/services/job-positions.service";
import { JobPosition } from "@/types/job-position.types";

interface Props {
    jobPosition: JobPosition;
    onClose: () => void;
    onDeleted: () => Promise<void>;
}

export function JobPositionDeleteDialog({ jobPosition, onClose, onDeleted }: Props) {
    const [error, setError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    async function handleDelete() {
        setError(null);
        setIsDeleting(true);
        try {
            await jobPositionsService.remove(jobPosition.id);
            await onDeleted();
            onClose();
        } catch (error) {
            setError(error instanceof ApiError ? error.message : "No se pudo eliminar el cargo.");
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <div role="dialog" aria-modal="true" aria-labelledby="delete-job-position-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <section className="w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-xl">
                <div className="p-6">
                    <div className="flex gap-4">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600"><AlertTriangle size={20} /></div>
                        <div>
                            <h2 id="delete-job-position-title" className="text-lg font-semibold text-gray-900">Eliminar cargo</h2>
                            <p className="mt-2 text-sm leading-6 text-gray-600">¿Quieres eliminar el cargo <strong>{jobPosition.name}</strong>? No podrás eliminarlo si tiene usuarios asignados.</p>
                        </div>
                    </div>
                    {error && <div role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                    <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-5">
                        <button type="button" onClick={onClose} disabled={isDeleting} className="h-10 rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
                        <button type="button" onClick={() => void handleDelete()} disabled={isDeleting} className="h-10 rounded-md bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60">{isDeleting ? "Eliminando..." : "Eliminar cargo"}</button>
                    </div>
                </div>
            </section>
        </div>
    );
}
