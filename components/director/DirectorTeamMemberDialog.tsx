"use client";

import { FormEvent, ReactNode, useState } from "react";
import { Search, UserPlus, UserRoundCheck, X } from "lucide-react";
import { ApiError } from "@/services/api";
import {
    directorTeamService,
    ExistingTeamMemberCandidate
} from "@/services/director-team.service";
import { Role } from "@/types/role.types";

interface Props {
    departmentId: string;
    departmentName: string;
    roles: Role[];
    onClose: () => void;
    onSaved: () => Promise<void>;
}

type MemberMode = "new" | "existing";

const allowedNames = new Set(["Operativo 1", "Operativo 2", "Pasante"]);

export function DirectorTeamMemberDialog({
    departmentId,
    departmentName,
    roles,
    onClose,
    onSaved
}: Props) {
    const allowedRoles = roles.filter((role) => allowedNames.has(role.name));
    const [mode, setMode] = useState<MemberMode>("new");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [roleId, setRoleId] = useState("");
    const [search, setSearch] = useState("");
    const [candidates, setCandidates] = useState<ExistingTeamMemberCandidate[]>([]);
    const [selectedUserId, setSelectedUserId] = useState("");
    const [candidatesLoaded, setCandidatesLoaded] = useState(false);
    const [searching, setSearching] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function loadCandidates(searchValue: string) {
        setSearching(true);
        setError(null);

        try {
            const result = await directorTeamService.getCandidates({
                departmentId,
                search: searchValue.trim(),
                page: 1,
                pageSize: 50
            });
            setCandidates(result.items);
            setCandidatesLoaded(true);
            setSelectedUserId((current) =>
                result.items.some((candidate) => candidate.id === current) ? current : ""
            );
        } catch (cause) {
            setError(cause instanceof ApiError ? cause.message : "No se pudieron cargar los usuarios existentes.");
        } finally {
            setSearching(false);
        }
    }

    function selectMode(nextMode: MemberMode) {
        setMode(nextMode);
        setError(null);

        if (nextMode === "existing" && !candidatesLoaded) {
            void loadCandidates("");
        }
    }

    async function submitNew(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError(null);

        try {
            await directorTeamService.create({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                phone: phone.trim() || null,
                email: email.trim() || null,
                password,
                roleId,
                clientCompanyId: null,
                departmentId
            });
            await onSaved();
            onClose();
        } catch (cause) {
            setError(cause instanceof ApiError ? cause.message : "No se pudo crear el integrante.");
        } finally {
            setSaving(false);
        }
    }

    async function submitSearch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        await loadCandidates(search);
    }

    async function addExisting() {
        if (!selectedUserId) return;
        setSaving(true);
        setError(null);

        try {
            await directorTeamService.addExisting(selectedUserId, departmentId);
            await onSaved();
            onClose();
        } catch (cause) {
            setError(cause instanceof ApiError ? cause.message : "No se pudo agregar el integrante.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-member-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
            <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <header className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{departmentName}</p>
                        <h2 id="team-member-title" className="mt-1 text-xl font-semibold text-gray-900">Agregar integrante</h2>
                        <p className="mt-1 text-sm text-gray-500">Crea una cuenta o incorpora una que ya existe.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                    >
                        <X size={20} />
                    </button>
                </header>

                <div className="grid grid-cols-2 gap-2 bg-gray-50 px-6 py-4">
                    <ModeButton
                        active={mode === "new"}
                        icon={<UserPlus size={18} />}
                        label="Usuario nuevo"
                        onClick={() => selectMode("new")}
                    />
                    <ModeButton
                        active={mode === "existing"}
                        icon={<UserRoundCheck size={18} />}
                        label="Usuario existente"
                        onClick={() => selectMode("existing")}
                    />
                </div>

                <div className="overflow-y-auto px-6 py-5">
                    {error && (
                        <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {error}
                        </p>
                    )}

                    {mode === "new" ? (
                        <form onSubmit={submitNew} className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Nombre" value={firstName} onChange={setFirstName} required />
                                <Field label="Apellido" value={lastName} onChange={setLastName} required />
                            </div>
                            <Field label="Teléfono" value={phone} onChange={setPhone} />
                            <Field label="Correo" value={email} onChange={setEmail} type="email" />
                            <Field label="Contraseña" value={password} onChange={setPassword} type="password" required />
                            <label className="block text-sm font-medium text-gray-700">
                                Rol
                                <select
                                    required
                                    value={roleId}
                                    onChange={(event) => setRoleId(event.target.value)}
                                    className="mt-1 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                >
                                    <option value="">Seleccionar rol</option>
                                    {allowedRoles.map((role) => (
                                        <option key={role.id} value={role.id}>{role.name}</option>
                                    ))}
                                </select>
                            </label>

                            <footer className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                                <button type="button" onClick={onClose} className="h-10 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700">Cancelar</button>
                                <button disabled={saving || !roleId} className="h-10 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white disabled:opacity-50">
                                    {saving ? "Guardando..." : "Crear e incorporar"}
                                </button>
                            </footer>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
                                La cuenta, contraseña y rol actual se conservarán. Solo se agregará al usuario a {departmentName}.
                            </div>

                            <form onSubmit={submitSearch} className="flex gap-2">
                                <label className="relative min-w-0 flex-1">
                                    <span className="sr-only">Buscar por nombre o correo</span>
                                    <Search size={17} className="pointer-events-none absolute left-3 top-3 text-gray-400" />
                                    <input
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder="Buscar por nombre o correo"
                                        className="h-11 w-full rounded-lg border border-gray-300 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    />
                                </label>
                                <button
                                    type="submit"
                                    disabled={searching}
                                    className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 disabled:opacity-50"
                                >
                                    {searching ? "Buscando..." : "Buscar"}
                                </button>
                            </form>

                            <div className="max-h-72 space-y-2 overflow-y-auto pr-1" aria-live="polite">
                                {searching && !candidatesLoaded ? (
                                    <p className="py-8 text-center text-sm text-gray-500">Cargando usuarios...</p>
                                ) : candidates.length === 0 ? (
                                    <p className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
                                        {candidatesLoaded ? "No hay usuarios disponibles con esa búsqueda." : "Busca una cuenta existente."}
                                    </p>
                                ) : candidates.map((candidate) => {
                                    const selected = candidate.id === selectedUserId;
                                    return (
                                        <button
                                            type="button"
                                            key={candidate.id}
                                            onClick={() => setSelectedUserId(candidate.id)}
                                            aria-pressed={selected}
                                            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selected ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}
                                        >
                                            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
                                                {candidate.firstName.slice(0, 1)}{candidate.lastName.slice(0, 1)}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-semibold text-gray-900">{candidate.firstName} {candidate.lastName}</span>
                                                <span className="block truncate text-xs text-gray-500">{candidate.email || "Sin correo registrado"}</span>
                                                {candidate.belongsToOtherDepartments && (
                                                    <span className="mt-1 block text-xs text-violet-700">Ya pertenece a otra área</span>
                                                )}
                                            </span>
                                            <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">{candidate.roleName}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <footer className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                                <button type="button" onClick={onClose} className="h-10 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700">Cancelar</button>
                                <button
                                    type="button"
                                    onClick={() => void addExisting()}
                                    disabled={saving || !selectedUserId}
                                    className="h-10 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white disabled:opacity-50"
                                >
                                    {saving ? "Agregando..." : "Agregar al equipo"}
                                </button>
                            </footer>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ModeButton({
    active,
    icon,
    label,
    onClick
}: {
    active: boolean;
    icon: ReactNode;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${active ? "border-gray-900 bg-gray-900 text-white shadow-sm" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}
        >
            {icon}
            {label}
        </button>
    );
}

function Field({
    label,
    value,
    onChange,
    type = "text",
    required = false
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    required?: boolean;
}) {
    return (
        <label className="block text-sm font-medium text-gray-700">
            {label}
            <input
                required={required}
                type={type}
                minLength={type === "password" ? 8 : undefined}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
        </label>
    );
}
