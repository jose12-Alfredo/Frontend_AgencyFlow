import { CalendarRange, ServerCog } from "lucide-react";

interface GanttEndpointPendingProps {
    scope: "proyecto" | "subproyecto";
}

export function GanttEndpointPending({ scope }: GanttEndpointPendingProps) {
    return <section className="overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-sm">
        <div className="border-l-4 border-indigo-600 px-6 py-6">
            <div className="flex size-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700"><CalendarRange size={22} /></div>
            <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">Diagrama de Gantt</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">La interfaz está lista para mostrar la jerarquía y la planificación de este {scope}. Falta que la API publique el árbol autorizado de tareas y subtareas.</p>
        </div>
        <div className="flex gap-3 border-t border-indigo-100 bg-indigo-50/55 px-6 py-4 text-sm text-indigo-950"><ServerCog className="mt-0.5 size-5 shrink-0 text-indigo-600" /><p><span className="font-semibold">Pendiente de API.</span> Esta vista no consulta listados parciales ni intenta reconstruir permisos en el navegador.</p></div>
    </section>;
}
