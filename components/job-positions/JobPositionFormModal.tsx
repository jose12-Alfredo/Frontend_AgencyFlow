"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { ApiError } from "@/services/api";
import { jobPositionsService } from "@/services/job-positions.service";
import { JobPosition } from "@/types/job-position.types";

interface Props {
    jobPosition: JobPosition | null;
    onClose: () => void;
    onSaved: () => Promise<void>;
}

export function JobPositionFormModal({ jobPosition, onClose, onSaved }: Props) {
    const [name, setName] = useState(jobPosition?.name ?? "");
    const [description, setDescription] = useState(jobPosition?.description ?? "");
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const isEditing = jobPosition !== null;

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!name.trim()) {
            setError("El nombre del cargo es obligatorio.");
            return;
        }
        setError(null);
        setIsSaving(true);
        try {
            const request = { name: name.trim(), description: description.trim() || null };
            if (isEditing) await jobPositionsService.update(jobPosition.id, request);
            else await jobPositionsService.create(request);
            await onSaved();
            onClose();
        } catch (error) {
            setError(error instanceof ApiError ? error.message : "No se pudo guardar el cargo.");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div role="dialog" aria-modal="true" aria-labelledby="job-position-form-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <section className="w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-xl">
                <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                        <p className="text-xs font-semibold uppercase text-blue-600">Administración</p>
                        <h2 id="job-position-form-title" className="mt-1 text-lg font-semibold text-gray-900">{isEditing ? "Editar cargo" : "Nuevo cargo"}</h2>
                    </div>
                    <button type="button" title="Cerrar" aria-label="Cerrar" onClick={onClose} disabled={isSaving} className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"><X size={20} /></button>
                </header>
                <form onSubmit={handleSubmit} className="space-y-5 p-6">
                    {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                    <div>
                        <label htmlFor="job-position-name" className="mb-2 block text-sm font-medium text-gray-700">Nombre del cargo</label>
                        <input id="job-position-name" value={name} onChange={(event) => setName(event.target.value)} autoFocus required maxLength={100} placeholder="Ej. Planner, Community Manager" className="h-11 w-full rounded-md border border-gray-300 px-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
                    </div>
                    <div>
                        <label htmlFor="job-position-description" className="mb-2 block text-sm font-medium text-gray-700">Descripción</label>
                        <textarea id="job-position-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={4} maxLength={500} placeholder="Responsabilidad principal o contexto del cargo" className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
                    </div>
                    <footer className="flex justify-end gap-3 border-t border-gray-200 pt-5">
                        <button type="button" onClick={onClose} disabled={isSaving} className="h-10 rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
                        <button type="submit" disabled={isSaving} className="h-10 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:opacity-60">{isSaving ? "Guardando..." : "Guardar cargo"}</button>
                    </footer>
                </form>
            </section>
        </div>
    );
}
