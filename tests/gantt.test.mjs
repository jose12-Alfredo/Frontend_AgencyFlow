import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const directory = path.dirname(fileURLToPath(import.meta.url));
const componentPath = path.resolve(directory, "../components/gantt/GanttTimeline.tsx");
Module._extensions[".css"] = (module) => { module.exports = { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) }; };
const compiled = ts.transpileModule(fs.readFileSync(componentPath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true }
});
const componentModule = new Module(componentPath);
componentModule.filename = componentPath;
componentModule.paths = Module._nodeModulePaths(path.dirname(componentPath));
componentModule._compile(compiled.outputText, componentPath);
const { GanttTimeline, flattenGanttRows } = componentModule.exports;

function node(id, type, children = [], startDate = "2025-01-01", endDate = "2025-01-31", status = "En curso", progressPercentage = 40) {
    return { id, type, title: id, startDate, endDate, status, responsibleName: "Ana Pérez", progressPercentage, children };
}
function render(root) {
    return renderToStaticMarkup(React.createElement(GanttTimeline, { content: { state: "ready", root }, onSelectNode() {} }));
}

test("el año conserva trimestres y doce meses alineados con la cuadrícula", () => {
    const html = render(node("Proyecto", "project", [node("Subproyecto", "subproject")]));
    assert.equal((html.match(/data-gantt-column="month"/g) ?? []).length, 12);
    assert.match(html, /T1/);
    assert.match(html, /T4/);
    assert.match(html, /Vista del calendario/);
    assert.match(html, /Cronograma de tareas/);
});

test("la jerarquía se puede expandir y contraer en cada nivel", () => {
    const root = node("P", "project", [node("S", "subproject", [node("T", "task", [node("ST", "subtask")])])]);
    const keys = ["project:P", "project:P/subproject:S", "project:P/subproject:S/task:T"];
    assert.deepEqual(flattenGanttRows(root, new Set()).map(({ node: item }) => item.id), ["P"]);
    assert.deepEqual(flattenGanttRows(root, new Set(keys.slice(0, 1))).map(({ node: item }) => item.id), ["P", "S"]);
    assert.deepEqual(flattenGanttRows(root, new Set(keys.slice(0, 2))).map(({ node: item }) => item.id), ["P", "S", "T"]);
    assert.deepEqual(flattenGanttRows(root, new Set(keys)).map(({ node: item }) => item.id), ["P", "S", "T", "ST"]);
    assert.deepEqual(flattenGanttRows(root, new Set([keys[0], keys[2]])).map(({ node: item }) => item.id), ["P", "S"]);
});

test("la jerarquía conserva columnas, responsable y avance y permite desplegar", () => {
    const root = node("Proyecto A", "project", [node("Subproyecto B", "subproject", [node("Tarea C", "task")])]);
    const html = render(root);
    for (const label of ["Proyecto", "Subproyecto", "Tarea", "Subtarea", "Responsable", "Avance"]) assert.match(html, new RegExp(label));
    assert.match(html, /Proyecto A/);
    assert.match(html, /Subproyecto B/);
    assert.doesNotMatch(html, /Tarea C/);
    assert.match(html, /aria-expanded="true"/);
    assert.match(html, /Ana Pérez/);
    assert.match(html, /40%/);
});

test("una barra de fechas inclusivas se alinea con los días del año y rellena su avance", () => {
    const html = render(node("Enero", "project", [], "2025-01-01", "2025-01-31", "En curso", 50));
    const bar = html.match(/class="bar active projectSummary" style="left:([^;]+);width:([^;]+)"/);
    assert.ok(bar, "debe existir una barra activa");
    assert.equal(bar[1], "0%");
    assert.ok(Math.abs(parseFloat(bar[2]) - 31 / 365 * 100) < 0.0001);
    assert.match(html, /data-gantt-progress="50" style="width:50%"/);
});

test("sin fechas no crea barra y mantiene una explicación", () => {
    const html = render(node("Sin fechas", "project", [], null, null));
    assert.match(html, /Sin fechas asignadas/);
    assert.doesNotMatch(html, /class="bar /);
});

test("la leyenda y el estado de las barras distinguen los tres avances", () => {
    const html = render(node("Raíz", "project", [node("Hijo", "subproject"), node("Terminado", "subproject", [], "2025-01-01", "2025-01-31", "Completada", 100)], "2025-01-01", "2025-02-01", "Pendiente", 17));
    assert.match(html, /Pendiente/);
    assert.match(html, /En curso/);
    assert.match(html, /Completada/);
    assert.match(html, /class="bar pending projectSummary"/);
    assert.match(html, /class="bar active subprojectSummary"/);
    assert.match(html, /class="bar complete subprojectSummary"/);
    assert.match(html, /data-gantt-progress="17"/);
});

test("carga, vacío y error muestran sus estados", () => {
    const renderState = (content) => renderToStaticMarkup(React.createElement(GanttTimeline, { content, onSelectNode() {} }));
    assert.match(renderState({ state: "loading" }), /Cargando planificación/);
    assert.match(renderState({ state: "empty" }), /No hay trabajo planificado/);
    assert.match(renderState({ state: "error", message: "Sin conexión", onRetry() {} }), /Sin conexión/);
});
