"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { History, LoaderCircle, LockKeyhole, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/roles";
import { ApiError } from "@/services/api";
import { rolesService } from "@/services/roles.service";
import { Role, RolePermissionAudit, RolePermissionSummary } from "@/types/role.types";

interface RoleFormModalProps {
    role: Role | null;
    onClose: () => void;
    onSaved: () => Promise<void>;
}

export function RoleFormModal({ role, onClose, onSaved }: RoleFormModalProps) {
    const { user } = useAuth();
    const [name, setName] = useState(role?.name ?? "");
    const [description, setDescription] = useState(role?.description ?? "");
    const [permissionSummary, setPermissionSummary] = useState<RolePermissionSummary | null>(null);
    const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set());
    const [audit, setAudit] = useState<RolePermissionAudit[]>([]);
    const [isAuditOpen, setIsAuditOpen] = useState(false);
    const [isLoadingAudit, setIsLoadingAudit] = useState(false);
    const [isLoadingPermissions, setIsLoadingPermissions] = useState(role !== null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const canViewPermissions = hasPermission(user?.permissions, "permissions.view");
    const canManagePermissions = hasPermission(user?.permissions, "permissions.manage");
    const canViewAudit = hasPermission(user?.permissions, "permissions.audit.view");
    const permissionsAreEditable = Boolean(
        permissionSummary && !permissionSummary.isReadOnly && canManagePermissions
    );

    const loadPermissions = useCallback(async () => {
        if (!role || !canViewPermissions) {
            setIsLoadingPermissions(false);
            return;
        }

        setIsLoadingPermissions(true);
        try {
            const summary = await rolesService.getPermissions(role.id);
            setPermissionSummary(summary);
            setSelectedPermissionIds(new Set(
                summary.permissions.filter((permission) => permission.isAssigned)
                    .map((permission) => permission.id)
            ));
        } catch (loadError) {
            setError(loadError instanceof ApiError
                ? loadError.message
                : "No se pudieron cargar los permisos del rol.");
        } finally {
            setIsLoadingPermissions(false);
        }
    }, [canViewPermissions, role]);

    useEffect(() => {
        // El rol seleccionado determina el catálogo remoto que debe mostrarse.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadPermissions();
    }, [loadPermissions]);

    const groupedPermissions = useMemo(() => {
        const groups = new Map<string, RolePermissionSummary["permissions"]>();
        permissionSummary?.permissions.forEach((permission) => {
            groups.set(permission.module, [...(groups.get(permission.module) ?? []), permission]);
        });
        return Array.from(groups.entries());
    }, [permissionSummary]);

    function togglePermission(permissionId: string) {
        if (!permissionsAreEditable) return;
        setSelectedPermissionIds((current) => {
            const next = new Set(current);
            if (next.has(permissionId)) next.delete(permissionId);
            else next.add(permissionId);
            return next;
        });
    }

    function toggleModule(permissionIds: string[]) {
        if (!permissionsAreEditable) return;
        setSelectedPermissionIds((current) => {
            const next = new Set(current);
            const allSelected = permissionIds.every((id) => next.has(id));
            permissionIds.forEach((id) => {
                if (allSelected) next.delete(id);
                else next.add(id);
            });
            return next;
        });
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!name.trim()) {
            setError("El nombre del rol es obligatorio.");
            return;
        }

        setError(null);
        setIsSaving(true);
        try {
            const request = { name: name.trim(), description: description.trim() || null };
            if (role) {
                await rolesService.update(role.id, request);
                if (permissionSummary && permissionsAreEditable) {
                    await rolesService.updatePermissions(role.id, Array.from(selectedPermissionIds));
                }
            } else {
                await rolesService.create(request);
            }
            await onSaved();
            onClose();
        } catch (saveError) {
            setError(saveError instanceof ApiError ? saveError.message : "No se pudo guardar el rol.");
        } finally {
            setIsSaving(false);
        }
    }

    async function openAudit() {
        if (!role) return;
        setIsAuditOpen(true);
        setIsLoadingAudit(true);
        try {
            setAudit(await rolesService.getPermissionAudit(role.id));
        } catch (auditError) {
            setError(auditError instanceof ApiError
                ? auditError.message
                : "No se pudo cargar el historial de permisos.");
            setIsAuditOpen(false);
        } finally {
            setIsLoadingAudit(false);
        }
    }

    return (
        <div role="dialog" aria-modal="true" aria-labelledby="role-form-title"
             className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 sm:p-6">
            <section className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
                <header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4 sm:px-6">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Administración</p>
                        <h2 id="role-form-title" className="mt-1 text-xl font-semibold text-gray-950">
                            {role ? "Editar rol y permisos" : "Nuevo rol"}
                        </h2>
                    </div>
                    <button type="button" title="Cerrar" aria-label="Cerrar" onClick={onClose}
                            disabled={isSaving} className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 disabled:opacity-50">
                        <X size={20} />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
                        {error && <div role="alert" className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

                        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                            <div>
                                <label htmlFor="role-name" className="mb-2 block text-sm font-medium text-gray-700">Nombre</label>
                                <input id="role-name" type="text" value={name} onChange={(event) => setName(event.target.value)}
                                       autoFocus required maxLength={100}
                                       className="h-11 w-full rounded-md border border-gray-300 px-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
                            </div>
                            <div>
                                <label htmlFor="role-description" className="mb-2 block text-sm font-medium text-gray-700">Descripción</label>
                                <textarea id="role-description" value={description} onChange={(event) => setDescription(event.target.value)}
                                          rows={3} maxLength={500}
                                          className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
                            </div>
                        </div>

                        <div className="mb-4 mt-7 flex flex-wrap items-end justify-between gap-3 border-t border-gray-200 pt-6">
                            <div>
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={19} className="text-blue-600" />
                                    <h3 className="font-semibold text-gray-950">Permisos predeterminados</h3>
                                </div>
                                <p className="mt-1 text-sm text-gray-500">Se aplican automáticamente a todas las personas que tengan este rol.</p>
                            </div>
                            {role && canViewAudit && <button type="button" onClick={() => void openAudit()}
                                className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                                <History size={16} />Ver historial
                            </button>}
                        </div>

                        {!role ? (
                            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-800">
                                Crea el rol y luego vuelve a abrirlo para elegir sus permisos predeterminados.
                            </div>
                        ) : !canViewPermissions ? (
                            <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                                <ShieldAlert size={20} className="mt-0.5 shrink-0" />
                                No tienes permiso para consultar la configuración de acceso de este rol.
                            </div>
                        ) : isLoadingPermissions ? (
                            <div className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 py-12 text-sm text-gray-500">
                                <LoaderCircle size={18} className="animate-spin" />Cargando permisos del rol...
                            </div>
                        ) : permissionSummary && <>
                            {permissionSummary.isReadOnly && <Notice icon={LockKeyhole}>Los permisos de SuperUsuario son obligatorios y se muestran en modo de consulta.</Notice>}
                            {!permissionSummary.isReadOnly && !canManagePermissions && <Notice icon={LockKeyhole} amber>Puedes consultar estos permisos, pero no modificarlos.</Notice>}

                            <div className="space-y-4">
                                {groupedPermissions.map(([module, permissions]) => {
                                    const moduleIds = permissions.map((permission) => permission.id);
                                    const assignedCount = moduleIds.filter((id) => selectedPermissionIds.has(id)).length;
                                    const allSelected = assignedCount === moduleIds.length;
                                    return <section key={module} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                                        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-slate-50 px-4 py-3">
                                            <div><h4 className="text-sm font-semibold text-gray-900">{module}</h4><p className="mt-0.5 text-xs text-gray-500">{assignedCount} de {permissions.length} asignados</p></div>
                                            {permissionsAreEditable && <button type="button" onClick={() => toggleModule(moduleIds)} className="text-xs font-semibold text-blue-700 transition hover:text-blue-900">{allSelected ? "Quitar todos" : "Seleccionar todos"}</button>}
                                        </header>
                                        <div className="grid md:grid-cols-2">
                                            {permissions.map((permission) => <label key={permission.id}
                                                className={`flex gap-3 border-b border-gray-100 px-4 py-3.5 md:odd:border-r ${permissionsAreEditable ? "cursor-pointer hover:bg-blue-50/40" : "cursor-default"}`}>
                                                <input type="checkbox" checked={selectedPermissionIds.has(permission.id)} onChange={() => togglePermission(permission.id)}
                                                       disabled={!permissionsAreEditable || isSaving} className="mt-0.5 size-4 shrink-0 accent-blue-600" />
                                                <span className="min-w-0">
                                                    <span className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium text-gray-900">{permission.name}</span>{permission.isSensitive && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">Sensible</span>}</span>
                                                    <span className="mt-1 block text-xs leading-5 text-gray-500">{permission.description}</span>
                                                    <span className="mt-1 block font-mono text-[10px] text-gray-400">{permission.code}</span>
                                                </span>
                                            </label>)}
                                        </div>
                                    </section>;
                                })}
                            </div>
                        </>}
                    </div>

                    <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-white px-5 py-4 sm:px-6">
                        <div className="text-sm text-gray-500">{permissionSummary && <><span className="font-semibold text-gray-900">{selectedPermissionIds.size}</span> permisos asignados</>}</div>
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={onClose} disabled={isSaving} className="h-10 rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
                            <button type="submit" disabled={isSaving || isLoadingPermissions} className="h-10 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? "Guardando..." : "Guardar cambios"}</button>
                        </div>
                    </footer>
                </form>
            </section>

            {isAuditOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4">
                <section role="dialog" aria-modal="true" aria-labelledby="role-audit-title" className="flex max-h-[78vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
                    <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                        <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Auditoría</p><h3 id="role-audit-title" className="mt-1 text-lg font-semibold text-gray-950">Cambios de permisos · {role?.name}</h3></div>
                        <button type="button" aria-label="Cerrar historial" onClick={() => setIsAuditOpen(false)} className="rounded-md p-2 text-gray-500 hover:bg-gray-100"><X size={20} /></button>
                    </header>
                    <div className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto">
                        {isLoadingAudit ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500"><LoaderCircle size={18} className="animate-spin" />Cargando historial...</div>
                            : audit.length === 0 ? <p className="px-5 py-12 text-center text-sm text-gray-500">Todavía no existen cambios registrados.</p>
                            : audit.map((item) => <div key={item.id} className="grid gap-1 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                                <div><p className="text-sm font-medium text-gray-900">{item.isAssigned ? "Permiso concedido" : "Permiso retirado"}</p><p className="mt-1 font-mono text-xs text-gray-500">{item.permissionCode}</p><p className="mt-1 text-xs text-gray-400">Por {item.actorName}</p></div>
                                <time className="text-xs text-gray-400" dateTime={item.timestamp}>{new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.timestamp))}</time>
                            </div>)}
                    </div>
                </section>
            </div>}
        </div>
    );
}

function Notice({ icon: Icon, amber = false, children }: {
    icon: typeof LockKeyhole;
    amber?: boolean;
    children: React.ReactNode;
}) {
    return <div className={`mb-4 flex gap-3 rounded-lg border px-4 py-3 text-sm ${amber ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
        <Icon size={18} className="mt-0.5 shrink-0" />{children}
    </div>;
}
