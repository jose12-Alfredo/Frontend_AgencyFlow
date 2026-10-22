"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { ApiError } from "@/services/api";
import { directorTeamService } from "@/services/director-team.service";
import { DepartmentUser } from "@/types/department-user.types";

export function DirectorTeamMemberRemoveDialog({ member, onClose, onRemoved }: {
    member: DepartmentUser;
    onClose: () => void;
    onRemoved: () => Promise<void>;
}) {
    const [removing, setRemoving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function remove() {
        setRemoving(true);
        setError(null);
        try {
            await directorTeamService.remove(member.id);
            await onRemoved();
            onClose();
        } catch (cause) {
            setError(cause instanceof ApiError ? cause.message : "No se pudo quitar al integrante.");
        } finally {
            setRemoving(false);
        }
    }

    return <div role="dialog" aria-modal="true" aria-labelledby="remove-member-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <header className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase text-red-600">Quitar del equipo</p><h2 id="remove-member-title" className="mt-1 text-xl font-semibold text-gray-900">¿Quitar a {member.userFirstName} {member.userLastName}?</h2></div><button type="button" onClick={onClose} className="rounded-md p-2 text-gray-500 hover:bg-gray-100" aria-label="Cerrar"><X size={19} /></button></header>
            <p className="mt-4 text-sm leading-6 text-gray-600">Se retirará su pertenencia a <strong>{member.departmentName}</strong>. Su cuenta y sus pertenencias a otras áreas seguirán activas.</p>
            {error && <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <footer className="mt-6 flex justify-end gap-3 border-t pt-4"><button type="button" onClick={onClose} disabled={removing} className="h-10 rounded-md border px-4 text-sm">Cancelar</button><button type="button" onClick={() => void remove()} disabled={removing} className="inline-flex h-10 items-center gap-2 rounded-md bg-red-700 px-4 text-sm font-semibold text-white disabled:opacity-50"><Trash2 size={16} />{removing ? "Quitando…" : "Quitar integrante"}</button></footer>
        </div>
    </div>;
}
