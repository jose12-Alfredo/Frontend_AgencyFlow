import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface WorkCrumb {
    label: string;
    type: "Cliente" | "Proyecto" | "Subproyecto" | "Tarea";
    href?: string;
}

export function WorkHierarchyBreadcrumbs({ items }: { items: WorkCrumb[] }) {
    return <nav aria-label="Ruta del trabajo" className="max-w-full overflow-x-auto pb-1">
        <ol className="flex min-w-max items-center gap-1.5 text-sm">
            {items.map((item, index) => {
                const current = index === items.length - 1;
                const content = <span className="flex max-w-52 flex-col leading-tight">
                    <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-gray-400">{item.type}</span>
                    <span className={`truncate ${current ? "font-semibold text-gray-900" : "font-medium text-blue-700"}`} title={item.label}>{item.label}</span>
                </span>;
                return <li key={`${item.type}:${item.label}`} className="flex items-center gap-1.5">
                    {index > 0 && <ChevronRight size={14} className="shrink-0 text-gray-300" aria-hidden="true" />}
                    {item.href && !current ? <Link href={item.href} className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{content}</Link> : <span aria-current={current ? "page" : undefined}>{content}</span>}
                </li>;
            })}
        </ol>
    </nav>;
}
