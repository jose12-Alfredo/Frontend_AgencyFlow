"use client";

import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, RotateCw, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { GanttNode, GanttNodeType } from "@/types/gantt.types";
import styles from "./GanttTimeline.module.css";

type View = "year" | "month";
type Zoom = "week" | "day";
type Selection = { node: GanttNode; ancestors: GanttNode[] };
type Row = Selection & { key: string; depth: number };
type Segment = { date: Date; next: Date; label: string; title: string };
export type GanttContent = { state: "loading" } | { state: "error"; message: string; onRetry: () => void } | { state: "empty" } | { state: "ready"; root: GanttNode };
type Props = { content: GanttContent; onSelectNode: (node: GanttNode, ancestors: GanttNode[]) => void };

const levels: GanttNodeType[] = ["project", "subproject", "task", "subtask"];
const levelNames = ["Proyecto", "Subproyecto", "Tarea", "Subtarea"];
const fullDate = new Intl.DateTimeFormat("es-BO", { day: "2-digit", month: "short", year: "numeric" });
const monthName = new Intl.DateTimeFormat("es-BO", { month: "long" });
const shortMonth = new Intl.DateTimeFormat("es-BO", { month: "short" });
const weekday = new Intl.DateTimeFormat("es-BO", { weekday: "short" });
const fromIso = (value: string) => { const [y, m, d] = value.split("-").map(Number); return new Date(y, m - 1, d, 12); };
const today = () => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12); };
const day = (date: Date) => Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
const addDays = (date: Date, amount: number) => { const next = new Date(date); next.setDate(next.getDate() + amount); return next; };
const dateText = (date: Date | string | null) => date ? fullDate.format(typeof date === "string" ? fromIso(date) : date) : "Sin asignar";
const progress = (value: number | null) => value === null || !Number.isFinite(value) ? null : Math.max(0, Math.min(100, value));
const hasDates = (node: GanttNode): node is GanttNode & { startDate: string; endDate: string } => Boolean(node.startDate && node.endDate && day(fromIso(node.endDate)) >= day(fromIso(node.startDate)));
const tone = (status: string): "pending" | "active" | "complete" => { const value = status.toLocaleLowerCase("es"); return value.includes("complet") || value.includes("finaliz") ? "complete" : value.includes("curso") || value.includes("proceso") || value.includes("revisi") ? "active" : "pending"; };
const toneLabel = (status: string) => ({ pending: "Pendiente", active: "En curso", complete: "Completada" })[tone(status)];
const position = (date: Date, start: Date, days: number) => (day(date) - day(start)) / days * 100;

export function flattenGanttRows(node: GanttNode, expanded: Set<string>, ancestors: GanttNode[] = []): Row[] {
    const key = [...ancestors, node].map((part) => `${part.type}:${part.id}`).join("/");
    return expanded.has(key) ? [{ node, ancestors, key, depth: ancestors.length }, ...node.children.flatMap((child) => flattenGanttRows(child, expanded, [...ancestors, node]))] : [{ node, ancestors, key, depth: ancestors.length }];
}
function initialDate(root: GanttNode): Date {
    const dates: number[] = [];
    const ranges: [number, number][] = [];
    const visit = (node: GanttNode) => {
        if (node.startDate) dates.push(day(fromIso(node.startDate)));
        if (node.endDate) dates.push(day(fromIso(node.endDate)));
        if (hasDates(node)) ranges.push([day(fromIso(node.startDate)), day(fromIso(node.endDate))]);
        node.children.forEach(visit);
    };
    visit(root);
    const now = today();
    if (!dates.length || ranges.some(([start, end]) => day(now) >= start && day(now) <= end)) return now;
    const earliest = new Date(Math.min(...dates) * 86_400_000);
    return new Date(earliest.getUTCFullYear(), earliest.getUTCMonth(), earliest.getUTCDate(), 12);
}
function bounds(anchor: Date, view: View) {
    return view === "year" ? { start: new Date(anchor.getFullYear(), 0, 1, 12), end: new Date(anchor.getFullYear() + 1, 0, 1, 12) } : { start: new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12), end: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1, 12) };
}
function segments(start: Date, end: Date, view: View, zoom: Zoom): Segment[] {
    const result: Segment[] = [];
    if (view === "year") {
        for (let i = 0; i < 12; i++) { const date = new Date(start.getFullYear(), i, 1, 12); result.push({ date, next: new Date(start.getFullYear(), i + 1, 1, 12), label: shortMonth.format(date), title: monthName.format(date) }); }
    } else if (zoom === "week") {
        for (let date = start; day(date) < day(end);) {
            const monday = addDays(date, 7 - ((date.getDay() + 6) % 7));
            const next = day(monday) < day(end) ? monday : end;
            const last = addDays(next, -1);
            result.push({ date, next, label: `${date.getDate()}–${last.getDate()}`, title: `${dateText(date)} — ${dateText(last)}` });
            date = next;
        }
    } else {
        for (let date = start; day(date) < day(end); date = addDays(date, 1)) result.push({ date, next: addDays(date, 1), label: String(date.getDate()), title: `${weekday.format(date)} ${dateText(date)}` });
    }
    return result;
}

function State({ content }: { content: Exclude<GanttContent, { state: "ready" }> }) {
    if (content.state === "loading") return <section className={styles.state} aria-live="polite"><RotateCw className="mx-auto size-5 animate-spin text-indigo-600 motion-reduce:animate-none" /><p>Cargando planificación…</p></section>;
    if (content.state === "error") return <section className={styles.state} role="alert"><strong>No se pudo cargar la planificación</strong><p>{content.message}</p><button type="button" onClick={content.onRetry}>Reintentar</button></section>;
    return <section className={styles.state}><CalendarDays className="mx-auto size-6 text-slate-400" /><strong>No hay trabajo planificado para mostrar</strong><p>Las tareas visibles aparecerán aquí cuando se creen.</p></section>;
}
export function GanttTimeline({ content, onSelectNode }: Props) {
    if (content.state !== "ready") return <State content={content} />;
    return <Tree key={`${content.root.type}:${content.root.id}`} root={content.root} onSelectNode={onSelectNode} />;
}
function Tree({ root, onSelectNode }: { root: GanttNode; onSelectNode: Props["onSelectNode"] }) {
    const [expanded, setExpanded] = useState(() => new Set([`${root.type}:${root.id}`]));
    const [view, setView] = useState<View>("year");
    const [zoom, setZoom] = useState<Zoom>("week");
    const [anchor, setAnchor] = useState(() => initialDate(root));
    const [selected, setSelected] = useState<Selection | null>(null);
    const rows = useMemo(() => flattenGanttRows(root, expanded), [root, expanded]);
    const { start, end } = bounds(anchor, view);
    const days = day(end) - day(start);
    const units = segments(start, end, view, zoom);
    const now = today();
    const todayVisible = day(now) >= day(start) && day(now) < day(end);
    const toggle = (key: string) => setExpanded((previous) => { const next = new Set(previous); if (next.has(key)) next.delete(key); else next.add(key); return next; });
    const shift = (amount: -1 | 1) => setAnchor((date) => view === "year" ? new Date(date.getFullYear() + amount, date.getMonth(), 1, 12) : new Date(date.getFullYear(), date.getMonth() + amount, 1, 12));
    return <section className={styles.panel} data-view={view} data-zoom={zoom} aria-label="Planificación Gantt">
        <header className={styles.toolbar}>
            <div className={styles.heading}><h1>Planificación</h1><p>La barra indica duración; el relleno muestra el avance real.</p></div>
            <div className={styles.controls}>
                <div className={styles.switch} aria-label="Vista del calendario"><button type="button" aria-pressed={view === "year"} onClick={() => setView("year")}>Año</button><button type="button" aria-pressed={view === "month"} onClick={() => setView("month")}>Mes</button></div>
                {view === "month" && <div className={styles.switch} aria-label="Zoom del mes"><button type="button" aria-pressed={zoom === "week"} onClick={() => setZoom("week")}>Semanas</button><button type="button" aria-pressed={zoom === "day"} onClick={() => setZoom("day")}>Días</button></div>}
                <div className={styles.periodControls}><button type="button" onClick={() => shift(-1)} aria-label="Periodo anterior"><ChevronLeft size={16} /></button><span aria-live="polite">{view === "year" ? start.getFullYear() : `${monthName.format(start)} ${start.getFullYear()}`}</span><button type="button" onClick={() => shift(1)} aria-label="Periodo siguiente"><ChevronRight size={16} /></button></div>
                <button type="button" className={styles.todayButton} onClick={() => setAnchor(today())}>Hoy</button>
            </div>
        </header>
        <div className={styles.meta}><span>{dateText(start)} — {dateText(addDays(end, -1))}</span><div className={styles.legend} aria-label="Leyenda de estados">{(["pending", "active", "complete"] as const).map((status, i) => <span key={status}><i className={styles[status]} />{["Pendiente", "En curso", "Completada"][i]}</span>)}</div></div>
        {selected && <Detail selected={selected} onClose={() => setSelected(null)} onOpen={() => onSelectNode(selected.node, selected.ancestors)} />}
        <div className={styles.scroller} tabIndex={0} aria-label="Cronograma de tareas">
            <div className={styles.stickyHeader}>
                <div className={styles.detailHeader}><div className={styles.hierarchyHeaders}>{levelNames.map((label) => <span key={label}>{label}</span>)}</div><span className={styles.mobileHeader}>Actividad</span><span>Responsable</span><span>Avance</span></div>
                <div className={styles.calendarHeader}>
                    <div className={styles.calendarGroup}>{view === "year" ? [0, 1, 2, 3].map((q) => { const a = new Date(start.getFullYear(), q * 3, 1, 12), b = new Date(start.getFullYear(), q * 3 + 3, 1, 12); return <span key={q} style={{ left: `${position(a, start, days)}%`, width: `${(day(b) - day(a)) / days * 100}%` }}>T{q + 1}<small>{start.getFullYear()}</small></span>; }) : <span className={styles.wholeMonth}>{monthName.format(start)} {start.getFullYear()}<small>{zoom === "week" ? "semanas" : "días"}</small></span>}</div>
                    <div className={styles.calendarUnits}>{units.map(({ date, next, label, title }) => <span key={day(date)} data-gantt-column={view === "year" ? "month" : zoom} data-narrow={view === "year" ? String(date.getMonth() + 1) : undefined} title={title} style={{ left: `${position(date, start, days)}%`, width: `${(day(next) - day(date)) / days * 100}%` }}>{label}</span>)}</div>
                </div>
            </div>
            <div>{rows.map((row) => <div key={row.key} className={styles.row} data-level={row.node.type}>
                <div className={styles.details}>
                    <div className={styles.hierarchyCells}>{levels.map((level) => <div key={level} className={styles.hierarchyCell}>{row.node.type === level && <><i className={`${styles.typeMark} ${styles[level]}`} /><span className={styles.cellContent}>{row.node.children.length > 0 && <Expand row={row} expanded={expanded.has(row.key)} onToggle={toggle} />}<button type="button" className={styles.name} title={row.node.title} aria-label={`Ver ficha de ${row.node.title}`} onClick={() => setSelected(row)}>{row.node.title}</button></span></>}</div>)}</div>
                    <div className={styles.mobileActivity} style={{ "--indent": `${row.depth * 10}px` } as CSSProperties}><i className={`${styles.typeMark} ${styles[row.node.type]}`} />{row.node.children.length > 0 && <Expand row={row} expanded={expanded.has(row.key)} onToggle={toggle} />}<button type="button" className={styles.name} title={`${levelNames[levels.indexOf(row.node.type)]}: ${row.node.title}`} aria-label={`Ver ficha de ${row.node.title}`} onClick={() => setSelected(row)}>{row.node.title}</button></div>
                    <span className={styles.responsible} title={row.node.responsibleName ?? "Sin responsable"}>{row.node.responsibleName ?? "—"}</span>
                    <span className={styles.progress}>{progress(row.node.progressPercentage) === null ? "—" : `${progress(row.node.progressPercentage)}%`}</span>
                </div>
                <Timeline row={row} start={start} end={end} days={days} units={units} now={todayVisible ? now : null} onSelect={setSelected} />
            </div>)}</div>
        </div>
    </section>;
}
function Expand({ row, expanded, onToggle }: { row: Row; expanded: boolean; onToggle: (key: string) => void }) {
    return <button type="button" className={styles.expand} aria-label={`${expanded ? "Contraer" : "Expandir"} ${row.node.title}`} aria-expanded={expanded} onClick={() => onToggle(row.key)}>{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>;
}
function Timeline({ row, start, end, days, units, now, onSelect }: { row: Row; start: Date; end: Date; days: number; units: Segment[]; now: Date | null; onSelect: (row: Selection) => void }) {
    const node = row.node, scheduled = hasDates(node);
    const begins = scheduled ? day(fromIso(node.startDate)) : 0, finishes = scheduled ? day(fromIso(node.endDate)) + 1 : 0;
    const visible = scheduled && finishes > day(start) && begins < day(end);
    const left = Math.max(0, (begins - day(start)) / days * 100), right = Math.min(100, (finishes - day(start)) / days * 100);
    const completed = begins + (finishes - begins) * (progress(node.progressPercentage) ?? 0) / 100;
    const visibleStart = Math.max(begins, day(start)), visibleEnd = Math.min(finishes, day(end));
    const fill = visible ? Math.max(0, Math.min(visibleEnd, completed) - visibleStart) / (visibleEnd - visibleStart) * 100 : 0;
    return <div className={styles.timeline}>{units.slice(1).map(({ date }) => <i key={day(date)} className={styles.gridLine} style={{ left: `${position(date, start, days)}%` }} />)}{now && <i className={styles.todayLine} aria-label="Hoy" style={{ left: `${position(now, start, days) + 50 / days}%` }} />}{visible && <button type="button" className={`${styles.bar} ${styles[tone(node.status)]} ${node.type === "project" ? styles.projectSummary : node.type === "subproject" ? styles.subprojectSummary : ""}`} style={{ left: `${left}%`, width: `${right - left}%` }} onClick={() => onSelect(row)} title={`${node.title} · ${dateText(node.startDate)} — ${dateText(node.endDate)} · ${toneLabel(node.status)} · ${progress(node.progressPercentage) === null ? "Sin dato de avance" : `${progress(node.progressPercentage)}% de avance`}`} aria-label={`Ver ficha de ${node.title}: ${dateText(node.startDate)} a ${dateText(node.endDate)}`}><span data-gantt-progress={progress(node.progressPercentage) ?? 0} style={{ width: `${fill}%` }} /></button>}{!scheduled && <span className={styles.noDates}>Sin fechas asignadas</span>}</div>;
}
function Detail({ selected, onClose, onOpen }: { selected: Selection; onClose: () => void; onOpen: () => void }) {
    const node = selected.node, days = hasDates(node) ? day(fromIso(node.endDate)) - day(fromIso(node.startDate)) + 1 : null;
    const fields = [["Inicio", dateText(node.startDate)], ["Fin", dateText(node.endDate)], ["Duración", days === null ? "Sin fechas" : `${days} ${days === 1 ? "día" : "días"}`], ["Responsable", node.responsibleName ?? "Sin responsable"], ["Avance", progress(node.progressPercentage) === null ? "Sin dato" : `${progress(node.progressPercentage)}%`]];
    return <aside className={styles.detailCard} aria-live="polite"><div className={styles.detailTitle}><strong title={node.title}>{node.title}</strong><span className={`${styles.badge} ${styles[tone(node.status)]}`}>{toneLabel(node.status)}</span></div><dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd title={value}>{value}</dd></div>)}</dl><div className={styles.detailActions}><button type="button" onClick={onOpen} aria-label={`Abrir detalle de ${node.title}`} title="Abrir detalle"><ExternalLink size={16} /></button><button type="button" onClick={onClose} aria-label="Cerrar ficha" title="Cerrar ficha"><X size={17} /></button></div></aside>;
}
