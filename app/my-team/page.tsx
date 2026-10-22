"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Crown, Plus, RefreshCw, Trash2, UsersRound } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { DirectorTeamMemberDialog } from "@/components/director/DirectorTeamMemberDialog";
import { DirectorTeamMemberRemoveDialog } from "@/components/director/DirectorTeamMemberRemoveDialog";
import { UserFormModal } from "@/components/users/UserFormModal";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/roles";
import { ApiError } from "@/services/api";
import { directorTeamService } from "@/services/director-team.service";
import { DepartmentUser } from "@/types/department-user.types";
import { Role } from "@/types/role.types";
import { JobPosition } from "@/types/job-position.types";

export default function MyTeamPage() {
    const { user } = useAuth();
    const userId = user?.id;
    const canCreate = hasPermission(user?.permissions, "director_team.users.create");
    const canRemove = hasPermission(user?.permissions, "director_team.members.remove");
    const [members, setMembers] = useState<DepartmentUser[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
    const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
    const [selectedId, setSelectedId] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [addingExisting, setAddingExisting] = useState(false);
    const [removing, setRemoving] = useState<DepartmentUser | null>(null);

    const selected = departments.find((item) => item.id === selectedId) ?? null;

    const load = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        setError(null);
        try {
            const available = await directorTeamService.getDepartments();
            const department = available.find((item) => item.id === selectedId) ?? available[0];
            setDepartments(available);
            if (!department) {
                setSelectedId("");
                setMembers([]);
                return;
            }
            const [team, allowedRoles, positions] = await Promise.all([
                directorTeamService.getMembers(department.id),
                directorTeamService.getAllowedRoles(),
                directorTeamService.getJobPositions()
            ]);
            setSelectedId(department.id);
            setMembers(team);
            setRoles(allowedRoles);
            setJobPositions(positions);
        } catch (cause) {
            setError(cause instanceof ApiError ? cause.message : "No se pudo cargar tu equipo.");
        } finally {
            setLoading(false);
        }
    }, [selectedId, userId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    const directors = useMemo(() => members.filter((member) => member.isDirector || member.userId === userId), [members, userId]);
    const team = useMemo(() => members.filter((member) => !directors.some((director) => director.id === member.id)), [directors, members]);

    return (
        <RequireAuth allowedRoles={["Director"]} allowedPermission="director_team.view">
            <AppShell>
                <header className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-blue-600">Gestión de equipo</p>
                        <h1 className="mt-1 text-2xl font-semibold text-gray-900">Mi equipo</h1>
                        <p className="mt-2 text-sm text-gray-600">Selecciona uno de los departamentos que puedes administrar.</p>
                        {departments.length > 1 && (
                            <label className="mt-4 block max-w-sm text-sm font-semibold text-gray-700">
                                Departamento
                                <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-1.5 block h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900">
                                    {departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                </select>
                            </label>
                        )}
                    </div>
                    <button onClick={() => void load()} className="rounded-md border border-gray-300 bg-white p-2.5 text-gray-600"><RefreshCw size={18} className={loading ? "animate-spin" : ""} /></button>
                </header>
                {error && <p role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                {loading ? <p className="mt-8 text-sm text-gray-500">Cargando equipo…</p> : !selected ? (
                    <p className="mt-8 rounded-xl border bg-white p-6 text-sm text-gray-500">No perteneces a un departamento disponible.</p>
                ) : (
                    <section className="mt-6 max-w-4xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                        <header className="flex items-center justify-between gap-4 border-b px-5 py-4">
                            <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><UsersRound size={20} /></span><div><h2 className="font-semibold text-gray-900">{selected.name}</h2><p className="text-xs text-gray-500">{members.length} integrantes</p></div></div>
                            {canCreate && <div className="flex gap-2"><button onClick={() => setAddingExisting(true)} className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700">Agregar existente</button><button onClick={() => setCreating(true)} disabled={roles.length === 0 || jobPositions.length === 0} className="inline-flex h-10 items-center gap-2 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white disabled:opacity-50"><Plus size={17} />Nuevo usuario</button></div>}
                        </header>
                        <div className="divide-y">{[...directors, ...team].map((member) => { const isDirector = directors.some((director) => director.id === member.id); return <div key={member.id} className="flex items-center gap-3 px-5 py-4"><span className="flex size-10 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">{member.userFirstName.slice(0, 1)}{member.userLastName.slice(0, 1)}</span><div className="min-w-0 flex-1"><p className="font-medium text-gray-900">{member.userFirstName} {member.userLastName}</p><p className="text-xs text-gray-500">{member.userRoleName || "Integrante del departamento"}</p></div>{isDirector ? <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-800"><Crown size={13} />Responsable</span> : canRemove && <button type="button" onClick={() => setRemoving(member)} title="Quitar integrante" className="rounded-md p-2 text-red-700 hover:bg-red-50"><Trash2 size={17} /></button>}</div>; })}</div>
                    </section>
                )}
                {creating && selected && <UserFormModal user={null} roles={roles} jobPositions={jobPositions} companies={[]} showClientCompany={false} onCreate={(request) => directorTeamService.create({ ...request, departmentId: selected.id, clientCompanyId: null })} onClose={() => setCreating(false)} onSaved={load} />}
                {addingExisting && selected && <DirectorTeamMemberDialog departmentId={selected.id} departmentName={selected.name} roles={roles} existingOnly onClose={() => setAddingExisting(false)} onSaved={load} />}
                {removing && <DirectorTeamMemberRemoveDialog member={removing} onClose={() => setRemoving(null)} onRemoved={load} />}
            </AppShell>
        </RequireAuth>
    );
}
