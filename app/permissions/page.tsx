"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, History, RotateCcw, Save, ShieldCheck, X } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/services/api";
import { loadAllPages } from "@/services/pagination";
import { permissionsService } from "@/services/permissions.service";
import { usersService } from "@/services/users.service";
import { PermissionAudit, PermissionEffect, UserPermissionSummary } from "@/types/permission.types";
import { User } from "@/types/user.types";

export default function PermissionsPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUserId, setSelectedUserId] = useState("");
    const [summary, setSummary] = useState<UserPermissionSummary | null>(null);
    const [effects, setEffects] = useState<Record<string, PermissionEffect>>({});
    const [audit, setAudit] = useState<PermissionAudit[]>([]);
    const [showAudit, setShowAudit] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        void (async () => {
            try {
                const loaded = await loadAllPages((page, pageSize) => usersService.getAll({ page, pageSize }));
                setUsers(loaded);
                const first = loaded.find((item) => item.id !== currentUser?.id);
                if (first) setSelectedUserId(first.id);
            } catch (error) {
                setError(error instanceof ApiError ? error.message : "No se pudieron cargar los usuarios.");
            } finally {
                setIsLoading(false);
            }
        })();
    }, [currentUser?.id]);

    const loadPermissions = useCallback(async () => {
        if (!selectedUserId) { setSummary(null); return; }
        setIsLoading(true); setError(null); setMessage(null);
        try {
            const value = await permissionsService.getForUser(selectedUserId);
            setSummary(value);
            setEffects(Object.fromEntries(value.permissions.map((permission) => [permission.id, permission.userEffect])));
        } catch (error) {
            setError(error instanceof ApiError ? error.message : "No se pudieron cargar los permisos.");
        } finally { setIsLoading(false); }
    }, [selectedUserId]);

    useEffect(() => {
        // La selección determina qué configuración remota debe cargarse.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadPermissions();
    }, [loadPermissions]);

    const grouped = useMemo(() => {
        const groups = new Map<string, UserPermissionSummary["permissions"]>();
        summary?.permissions.forEach((permission) => groups.set(permission.module, [...(groups.get(permission.module) ?? []), permission]));
        return Array.from(groups.entries());
    }, [summary]);

    const activeCount = summary?.permissions.filter((permission) =>
        (effects[permission.id] ?? null) === "Allow" ||
        (effects[permission.id] ?? null) === null && permission.roleAllowed
    ).length ?? 0;

    async function save() {
        if (!summary) return;
        setIsSaving(true); setError(null); setMessage(null);
        try {
            const updated = await permissionsService.updateForUser(summary.userId,
                summary.permissions.map((permission) => ({ permissionId: permission.id, effect: effects[permission.id] ?? null })));
            setSummary(updated);
            setEffects(Object.fromEntries(updated.permissions.map((permission) => [permission.id, permission.userEffect])));
            setMessage("Los permisos se actualizaron correctamente.");
        } catch (error) {
            setError(error instanceof ApiError ? error.message : "No se pudieron guardar los permisos.");
        } finally { setIsSaving(false); }
    }

    async function openAudit() {
        setShowAudit(true); setError(null);
        try { setAudit(await permissionsService.getAudit()); }
        catch (error) { setError(error instanceof ApiError ? error.message : "No se pudo cargar el historial."); }
    }

    return <RequireAuth allowedRoles={["SuperUsuario"]}>
        <AppShell>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div><p className="text-sm font-medium text-blue-600">Administración</p><h1 className="mt-1 text-2xl font-semibold text-gray-900">Permisos por usuario</h1><p className="mt-2 text-sm text-gray-600">Concede excepciones sin cambiar el cargo ni el perfil de acceso.</p></div>
                <button type="button" onClick={() => void openAudit()} className="flex h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"><History size={17} />Ver historial</button>
            </div>

            {error && <div role="alert" className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {message && <div role="status" className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

            <section className="mb-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <label htmlFor="permission-user" className="mb-2 block text-sm font-medium text-gray-700">Persona</label>
                <select id="permission-user" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} className="h-11 w-full max-w-xl rounded-md border border-gray-300 bg-white px-3 text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
                    <option value="">Seleccionar usuario</option>
                    {users.filter((user) => user.id !== currentUser?.id).map((user) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName} · {user.jobPositionName || "Sin cargo"}</option>)}
                </select>
                {summary && <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-700">Cargo: {summary.jobPositionName || "Sin cargo"}</span><span className="rounded-full bg-blue-50 px-3 py-1.5 font-medium text-blue-700">Perfil: {summary.roleName}</span><span className="rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">{activeCount} permisos activos</span></div>}
            </section>

            {isLoading ? <div className="rounded-lg border border-gray-200 bg-white py-14 text-center text-sm text-gray-500">Cargando permisos...</div> : summary && <>
                <div className="space-y-5">{grouped.map(([module, permissions]) => <section key={module} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <header className="flex items-center gap-3 border-b border-gray-200 bg-slate-50 px-5 py-4"><span className="flex size-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700"><ShieldCheck size={18} /></span><div><h2 className="font-semibold text-gray-900">{module}</h2><p className="text-xs text-gray-500">{permissions.filter((permission) => (effects[permission.id] ?? null) === "Allow" || (effects[permission.id] ?? null) === null && permission.roleAllowed).length} de {permissions.length} permisos activos</p></div></header>
                    <div className="divide-y divide-gray-100">{permissions.map((permission) => <div key={permission.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div><div className="flex items-center gap-2"><p className="text-sm font-semibold text-gray-900">{permission.name}</p>{permission.isSensitive && <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">Sensible</span>}{!permission.isImplemented && <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-500">Pendiente de conectar</span>}</div><p className="mt-1 text-sm text-gray-500">{permission.description}</p><p className={`mt-1 text-xs font-semibold ${(effects[permission.id] ?? null) === "Allow" || (effects[permission.id] ?? null) === null && permission.roleAllowed ? "text-emerald-700" : "text-gray-500"}`}>{(effects[permission.id] ?? null) === "Allow" || (effects[permission.id] ?? null) === null && permission.roleAllowed ? "Activo para este usuario" : "Inactivo para este usuario"}</p></div>
                        <div className={`inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 ${!permission.isImplemented ? "pointer-events-none opacity-45" : ""}`}>
                            <EffectButton active={(effects[permission.id] ?? null) === null} onClick={() => setEffects((value) => ({ ...value, [permission.id]: null }))} icon={RotateCcw} label="Restablecer" />
                            <EffectButton active={effects[permission.id] === "Allow"} onClick={() => setEffects((value) => ({ ...value, [permission.id]: "Allow" }))} icon={Check} label="Permitido" tone="allow" />
                            <EffectButton active={effects[permission.id] === "Deny"} onClick={() => setEffects((value) => ({ ...value, [permission.id]: "Deny" }))} icon={X} label="Denegado" tone="deny" />
                        </div>
                    </div>)}</div>
                </section>)}</div>
                <div className="sticky bottom-4 mt-6 flex justify-end"><button type="button" onClick={() => void save()} disabled={isSaving} className="flex h-11 items-center gap-2 rounded-md bg-gray-900 px-5 text-sm font-semibold text-white shadow-lg hover:bg-gray-700 disabled:opacity-60"><Save size={17} />{isSaving ? "Guardando..." : "Guardar permisos"}</button></div>
            </>}

            {showAudit && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"><section className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl"><header className="flex items-center justify-between border-b border-gray-200 px-6 py-4"><div><p className="text-xs font-semibold uppercase text-blue-600">Auditoría</p><h2 className="mt-1 text-lg font-semibold">Historial de cambios</h2></div><button type="button" aria-label="Cerrar" onClick={() => setShowAudit(false)} className="rounded-md p-2 hover:bg-gray-100"><X size={20} /></button></header><div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100">{audit.length === 0 ? <p className="p-8 text-center text-sm text-gray-500">Todavía no existen cambios.</p> : audit.map((item) => <div key={item.id} className="px-6 py-4 text-sm"><p className="font-medium text-gray-900">{item.actorName} → {item.targetName}</p><p className="mt-1 text-gray-600">{item.permissionCode}: {item.action}</p><p className="mt-1 text-xs text-gray-400">{new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.timestamp))}</p></div>)}</div></section></div>}
        </AppShell>
    </RequireAuth>;
}

function EffectButton({ active, onClick, icon: Icon, label, tone = "base" }: { active: boolean; onClick: () => void; icon: typeof Check; label: string; tone?: "base" | "allow" | "deny" }) {
    const activeStyle = tone === "allow" ? "bg-emerald-600 text-white" : tone === "deny" ? "bg-red-600 text-white" : "bg-white text-gray-900 shadow-sm";
    return <button type="button" onClick={onClick} className={`flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition ${active ? activeStyle : "text-gray-500 hover:text-gray-900"}`}><Icon size={14} />{label}</button>;
}
