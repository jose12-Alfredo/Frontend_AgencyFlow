"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
    ArrowLeft,
    BriefcaseBusiness,
    Building2,
    Crown,
    Eye,
    FolderKanban,
    Pencil,
    Plus,
    RefreshCw,
    Trash2,
    UsersRound
} from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ADMIN_ROLES } from "@/lib/roles";
import { AppShell } from "@/components/layout/AppShell";
import { ApiError } from "@/services/api";
import { departmentsService } from "@/services/departments.service";
import { departmentUsersService } from "@/services/department-users.service";
import { subProjectsService } from "@/services/subprojects.service";
import { rolesService } from "@/services/roles.service";
import { PagedResult } from "@/types/common.types";
import { Department } from "@/types/department.types";
import { DepartmentUser } from "@/types/department-user.types";
import { SubProject } from "@/types/subproject.types";
import { TaskItem } from "@/types/task.types";
import { User } from "@/types/user.types";
import { usersService } from "@/services/users.service";
import { tasksService } from "@/services/tasks.service";
import { DepartmentUserFormModal } from "@/components/department-users/DepartmentUserFormModal";
import { DepartmentUserDeleteDialog } from "@/components/department-users/DepartmentUserDeleteDialog";

async function loadAllPages<T>(
    loader: (page: number, pageSize: number) => Promise<PagedResult<T>>
): Promise<T[]> {
    const pageSize = 100;
    const firstPage = await loader(1, pageSize);
    const pageCount = Math.ceil(firstPage.totalItems / pageSize);
    const remainingPages = await Promise.all(
        Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
            loader(index + 2, pageSize)
        )
    );

    return [firstPage.items, ...remainingPages.map((page) => page.items)].flat();
}

export default function DepartmentDetailPage() {
    const params = useParams<{ id: string }>();
    const departmentId = params.id;
    const [department, setDepartment] = useState<Department | null>(null);
    const [members, setMembers] = useState<DepartmentUser[]>([]);
    const [subProjects, setSubProjects] = useState<SubProject[]>([]);
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [directorUsers, setDirectorUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<DepartmentUser | null>(null);
    const [memberToDelete, setMemberToDelete] = useState<DepartmentUser | null>(null);
    const [viewedMember, setViewedMember] = useState<DepartmentUser | null>(null);

    const loadDetail = useCallback(async () => {
        if (!departmentId) return;
        setIsLoading(true);
        setError(null);

        try {
            const rolesResult = await rolesService.getAll({ page: 1, pageSize: 100 });
            const directorRole = rolesResult.items.find((role) => role.name === "Director");
            const [nextDepartment, nextMembers, nextSubProjects, nextTasks, nextUsers, nextDirectorUsers] = await Promise.all([
                departmentsService.getById(departmentId),
                loadAllPages((page, pageSize) => departmentUsersService.getAll({
                    page,
                    pageSize,
                    departmentId
                })),
                loadAllPages((page, pageSize) => subProjectsService.getAll({
                    page,
                    pageSize,
                    departmentId
                })),
                loadAllPages((page, pageSize) => tasksService.getAll({ page, pageSize })),
                loadAllPages((page, pageSize) => usersService.getAll({ page, pageSize })),
                directorRole
                    ? loadAllPages((page, pageSize) => usersService.getAll({
                        page,
                        pageSize,
                        roleId: directorRole.id
                    }))
                    : Promise.resolve([])
            ]);
            setDepartment(nextDepartment);
            setMembers(nextMembers);
            setSubProjects(nextSubProjects);
            setTasks(nextTasks);
            setUsers(nextUsers);
            setDirectorUsers(nextDirectorUsers);
        } catch (loadError) {
            setError(loadError instanceof ApiError
                ? loadError.message
                : "No se pudo cargar el detalle del departamento.");
        } finally {
            setIsLoading(false);
        }
    }, [departmentId]);

    useEffect(() => {
        // La carga inicial sincroniza la vista con los datos del área.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadDetail();
    }, [loadDetail]);

    const directors = useMemo(
        () => members.filter((member) => member.isDirector),
        [members]
    );
    const teamMembers = useMemo(
        () => members.filter((member) => !member.isDirector),
        [members]
    );
    const projects = useMemo(() => {
        const groups = new Map<string, SubProject[]>();
        subProjects.forEach((subProject) => {
            groups.set(subProject.projectId, [
                ...(groups.get(subProject.projectId) ?? []),
                subProject
            ]);
        });
        return Array.from(groups, ([id, items]) => {
            const subProjectProgress = items.map((subProject) => {
                const subProjectTasks = tasks.filter(
                    (task) => task.subProjectId === subProject.id
                );
                const isCompleted = subProjectTasks.length > 0
                    ? subProjectTasks.every((task) => task.status === "Completado")
                    : subProject.status === "Completado";

                return { ...subProject, isCompleted };
            });
            const completedSubProjects = subProjectProgress.filter(
                (subProject) => subProject.isCompleted
            ).length;
            const progress = Math.round((completedSubProjects / items.length) * 100);
            const activeSubProject = subProjectProgress.find(
                (subProject) => !subProject.isCompleted
            );

            return {
            id,
            title: items[0].projectTitle,
            clientName: items[0].clientCompanyName,
            subProjectCount: items.length,
            completedSubProjects,
            progress,
            status: activeSubProject?.status ?? "Completado"
            };
        });
    }, [subProjects, tasks]);

    return (
        <RequireAuth allowedRoles={ADMIN_ROLES}>
            <AppShell>
                <div className="mx-auto max-w-7xl">
                    <Link href="/departments" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800 transition hover:text-blue-800">
                        <ArrowLeft size={16} /> Volver a departamentos
                    </Link>

                    {error ? (
                        <section role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                            {error}
                        </section>
                    ) : isLoading || !department ? (
                        <section className="mt-6 flex min-h-80 items-center justify-center rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-sm">
                            <RefreshCw size={19} className="mr-2 animate-spin text-blue-600" /> Cargando departamento...
                        </section>
                    ) : (
                        <>
                            <header className="mt-5 rounded-xl border border-gray-300 bg-white px-5 py-6 shadow-sm sm:px-7">
                                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex items-start gap-4">
                                        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm"><Building2 size={23} /></span>
                                        <div>
                                            <p className="text-sm font-bold uppercase tracking-[0.1em] text-violet-800">Organización · Departamento</p>
                                            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-950">{department.name}</h1>
                                            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-800">{department.description ?? "Sin descripción registrada."}</p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => void loadDetail()} className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-md border border-gray-400 bg-white px-3 text-sm font-semibold text-gray-800 transition hover:border-blue-700 hover:bg-blue-50 hover:text-blue-900">
                                        <RefreshCw size={15} /> Actualizar
                                    </button>
                                </div>
                                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                                    <DepartmentMetric icon={UsersRound} label="Integrantes" value={members.length} />
                                    <DepartmentMetric icon={Crown} label="Directores" value={directors.length} tone="violet" />
                                    <DepartmentMetric icon={FolderKanban} label="Proyectos vinculados" value={projects.length} tone="blue" />
                                </div>
                            </header>

                            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,.95fr)]">
                                <section className="overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm">
                                    <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
                                        <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-lg bg-violet-100 text-violet-900"><UsersRound size={20} /></span><div><h2 className="text-lg font-bold text-gray-950">Equipo del área</h2><p className="mt-0.5 text-sm font-medium text-gray-700">{members.length} {members.length === 1 ? "persona asignada" : "personas asignadas"}</p></div></div>
                                        <button type="button" onClick={() => { setSelectedMember(null); setIsMemberFormOpen(true); }} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-violet-700 bg-white px-3 text-sm font-semibold text-violet-900 transition hover:bg-violet-100"><Plus size={16} /> Agregar miembro</button>
                                    </div>
                                    {members.length === 0 ? <EmptyPanel text="Aún no hay integrantes asignados a esta área." /> : <div className="divide-y divide-gray-100">
                                        {directors.map((member) => <MemberRow key={member.id} member={member} onView={() => setViewedMember(member)} onEdit={() => { setSelectedMember(member); setIsMemberFormOpen(true); }} onDelete={() => setMemberToDelete(member)} />)}
                                        {teamMembers.map((member) => <MemberRow key={member.id} member={member} onView={() => setViewedMember(member)} onEdit={() => { setSelectedMember(member); setIsMemberFormOpen(true); }} onDelete={() => setMemberToDelete(member)} />)}
                                    </div>}
                                </section>

                                <section className="overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm">
                                    <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-lg bg-blue-100 text-blue-900"><BriefcaseBusiness size={20} /></span><div><h2 className="text-lg font-bold text-gray-950">Proyectos del área</h2><p className="mt-0.5 text-sm font-medium text-gray-700">Según sus subproyectos asignados</p></div></div><Link href={`/subprojects?departmentId=${department.id}`} className="text-sm font-semibold text-blue-800 underline-offset-2 hover:text-blue-950 hover:underline">Ver todos los proyectos</Link></div>
                                    {projects.length === 0 ? <EmptyPanel text="Aún no hay proyectos vinculados a esta área." /> : <div className="space-y-3 p-4">
                                        {projects.map((project) => <Link key={project.id} href={`/subprojects?projectId=${project.id}`} className="block rounded-lg border border-gray-300 p-4 transition hover:border-blue-700 hover:bg-blue-50"><div className="flex gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-900"><FolderKanban size={19} /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-base font-bold text-gray-950">{project.title}</h3><p className="mt-1 truncate text-sm font-medium text-gray-700">Cliente: {project.clientName ?? "Sin cliente asignado"}</p></div><span className={`shrink-0 rounded border px-2 py-1 text-xs font-bold ${project.status === "Completado" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-blue-300 bg-blue-50 text-blue-900"}`}>{project.status}</span></div><div className="mt-3"><div className="mb-1.5 flex justify-between text-sm font-medium text-gray-700"><span>{project.completedSubProjects} de {project.subProjectCount} subproyectos completados</span><strong className="text-gray-950">{project.progress}%</strong></div><span className="block h-2 overflow-hidden rounded-full bg-gray-200"><span className="block h-full rounded-full bg-blue-700" style={{ width: `${project.progress}%` }} /></span></div></div></div></Link>)}
                                    </div>}
                                </section>
                            </div>
                            {isMemberFormOpen && <DepartmentUserFormModal assignment={selectedMember} assignments={members} users={users} directorUsers={directorUsers} departments={[department]} lockedDepartment={department} onClose={() => { setIsMemberFormOpen(false); setSelectedMember(null); }} onSaved={loadDetail} />}
                            {memberToDelete && <DepartmentUserDeleteDialog assignment={memberToDelete} onClose={() => setMemberToDelete(null)} onDeleted={loadDetail} />}
                            {viewedMember && <MemberInfoDialog member={viewedMember} onClose={() => setViewedMember(null)} />}
                        </>
                    )}
                </div>
            </AppShell>
        </RequireAuth>
    );
}

function DepartmentMetric({ icon: Icon, label, value, tone = "gray" }: { icon: typeof UsersRound; label: string; value: number; tone?: "gray" | "violet" | "blue" }) {
    const tones = { gray: "border-gray-300 bg-gray-50 text-gray-950", violet: "border-violet-300 bg-violet-100 text-violet-950", blue: "border-blue-300 bg-blue-100 text-blue-950" };
    return <div className={`flex items-center gap-3 rounded-lg border px-3 py-3 ${tones[tone]}`}><Icon size={20} strokeWidth={2.25} /><div><p className="text-xl font-bold leading-none">{value}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide">{label}</p></div></div>;
}

function MemberRow({ member, onView, onEdit, onDelete }: { member: DepartmentUser; onView: () => void; onEdit: () => void; onDelete: () => void }) {
    const fullName = `${member.userFirstName} ${member.userLastName}`;
    const initials = fullName.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
    return <div className={`flex items-center gap-3 px-5 py-4 ${member.isDirector ? "border-l-4 border-violet-700 bg-violet-50" : ""}`}><span className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${member.isDirector ? "bg-violet-700 text-white" : "bg-gray-200 text-gray-800"}`}>{initials}</span><div className="min-w-0 flex-1"><p className="truncate text-base font-bold text-gray-950">{fullName}</p><p className="mt-0.5 truncate text-sm font-medium text-gray-700">{member.userRoleName || "Sin rol registrado"}</p></div>{member.isDirector ? <span className="inline-flex items-center gap-1 rounded-full border border-violet-400 bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-950"><Crown size={14} /> Director</span> : <span className="rounded-full border border-gray-300 bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-800">Integrante</span>}<div className="flex shrink-0 items-center gap-1"><button type="button" title="Ver integrante" onClick={onView} className="rounded p-2 text-gray-700 hover:bg-gray-200 hover:text-gray-950"><Eye size={16} /></button><button type="button" title="Editar pertenencia" onClick={onEdit} className="rounded p-2 text-blue-800 hover:bg-blue-100 hover:text-blue-950"><Pencil size={16} /></button><button type="button" title="Quitar del área" onClick={onDelete} className="rounded p-2 text-red-700 hover:bg-red-100 hover:text-red-900"><Trash2 size={16} /></button></div></div>;
}

function EmptyPanel({ text }: { text: string }) {
    return <p className="px-5 py-12 text-center text-sm font-medium text-gray-700">{text}</p>;
}

function MemberInfoDialog({ member, onClose }: { member: DepartmentUser; onClose: () => void }) {
    return <div role="dialog" aria-modal="true" aria-labelledby="member-info-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onMouseDown={onClose}><section className="w-full max-w-sm rounded-xl border border-gray-300 bg-white p-6 shadow-xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-wide text-violet-800">Equipo del área</p><h2 id="member-info-title" className="mt-1 text-xl font-bold text-gray-950">{member.userFirstName} {member.userLastName}</h2></div><button type="button" onClick={onClose} className="rounded p-2 text-gray-700 hover:bg-gray-200">×</button></div><dl className="mt-5 space-y-3 text-base"><div><dt className="text-sm font-bold uppercase tracking-wide text-gray-700">Rol</dt><dd className="mt-1 font-medium text-gray-950">{member.userRoleName || "Sin rol registrado"}</dd></div><div><dt className="text-sm font-bold uppercase tracking-wide text-gray-700">Pertenencia</dt><dd className="mt-1 font-medium text-gray-950">{member.isDirector ? "Director del área" : "Integrante del área"}</dd></div></dl></section></div>;
}
