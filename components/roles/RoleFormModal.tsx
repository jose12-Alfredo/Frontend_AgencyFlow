"use client";

import {
    FormEvent,
    useState
} from "react";
import { X } from "lucide-react";
import { ApiError } from "@/services/api";
import { rolesService } from "@/services/roles.service";
import { Role } from "@/types/role.types";

interface RoleFormModalProps {
    role: Role | null;
    onClose: () => void;
    onSaved: () => Promise<void>;
}

export function RoleFormModal({
                                  role,
                                  onClose,
                                  onSaved
                              }: RoleFormModalProps) {
    const [name, setName] = useState(role?.name ?? "");
    const [description, setDescription] = useState(
        role?.description ?? ""
    );
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const isEditing = role !== null;

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (!name.trim()) {
            setError("El nombre del rol es obligatorio.");
            return;
        }

        setError(null);
        setIsSaving(true);

        try {
            const request = {
                name: name.trim(),
                description: description.trim() || null
            };

            if (isEditing) {
                await rolesService.update(
                    role.id,
                    request
                );
            } else {
                await rolesService.create(request);
            }

            await onSaved();
            onClose();
        } catch (error) {
            if (error instanceof ApiError) {
                setError(error.message);
            } else {
                setError("No se pudo guardar el rol.");
            }
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-form-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        >
            <section className="w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-xl">
                <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                        <p className="text-xs font-semibold uppercase text-blue-600">
                            Administración
                        </p>

                        <h2
                            id="role-form-title"
                            className="mt-1 text-lg font-semibold text-gray-900"
                        >
                            {isEditing
                                ? "Editar rol"
                                : "Nuevo rol"}
                        </h2>
                    </div>

                    <button
                        type="button"
                        title="Cerrar"
                        aria-label="Cerrar"
                        onClick={onClose}
                        disabled={isSaving}
                        className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>
                </header>

                <form
                    onSubmit={handleSubmit}
                    className="space-y-5 p-6"
                >
                    {error && (
                        <div
                            role="alert"
                            className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                        >
                            {error}
                        </div>
                    )}

                    <div>
                        <label
                            htmlFor="role-name"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Nombre
                        </label>

                        <input
                            id="role-name"
                            type="text"
                            value={name}
                            onChange={(event) =>
                                setName(event.target.value)
                            }
                            autoFocus
                            required
                            maxLength={100}
                            className="h-11 w-full rounded-md border border-gray-300 px-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="role-description"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Descripción
                        </label>

                        <textarea
                            id="role-description"
                            value={description}
                            onChange={(event) =>
                                setDescription(event.target.value)
                            }
                            rows={4}
                            maxLength={500}
                            className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <footer className="flex justify-end gap-3 border-t border-gray-200 pt-5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="h-10 rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={isSaving}
                            className="h-10 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSaving
                                ? "Guardando..."
                                : "Guardar rol"}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}