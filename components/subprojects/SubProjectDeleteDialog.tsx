"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { ApiError } from "@/services/api";
import { subProjectsService } from "@/services/subprojects.service";
import { SubProject } from "@/types/subproject.types";

interface SubProjectDeleteDialogProps {
    subProject: SubProject;
    onClose: () => void;
    onDeleted: () => Promise<void>;
}

export function SubProjectDeleteDialog({
    subProject,
    onClose,
    onDeleted
}: SubProjectDeleteDialogProps) {
    const [error, setError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    async function handleDelete() {
        setError(null);
        setIsDeleting(true);

        try {
            await subProjectsService.remove(subProject.id);
            await onDeleted();
            onClose();
        } catch (error) {
            if (error instanceof ApiError) {
                setError(error.message);
            } else {
                setError("No se pudo eliminar el subproyecto.");
            }
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-subproject-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        >
            <section className="w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-xl">
                <div className="p-6">
                    <div className="flex gap-4">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                            <AlertTriangle size={20} />
                        </div>

                        <div>
                            <h2
                                id="delete-subproject-title"
                                className="text-lg font-semibold text-gray-900"
                            >
                                Eliminar subproyecto
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-gray-600">
                                ¿Quieres eliminar el subproyecto{" "}
                                <strong>{subProject.title}</strong>? Dejará de
                                aparecer en el sistema.
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div
                            role="alert"
                            className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                        >
                            {error}
                        </div>
                    )}
                </div>

                <footer className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isDeleting}
                        className="h-10 rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        onClick={() => void handleDelete()}
                        disabled={isDeleting}
                        className="h-10 rounded-md bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isDeleting
                            ? "Eliminando..."
                            : "Eliminar subproyecto"}
                    </button>
                </footer>
            </section>
        </div>
    );
}
