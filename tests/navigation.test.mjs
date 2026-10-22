import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("las rutas jerárquicas usan detalles canónicos y niveles etiquetados", () => {
    const tasks = read("app/tasks/page.tsx");
    const subTasks = read("app/subtasks/page.tsx");
    const breadcrumbs = read("components/navigation/WorkHierarchyBreadcrumbs.tsx");

    assert.match(tasks, /`\/projects\/\$\{selectedProject\.id\}`/);
    assert.match(tasks, /`\/subprojects\/\$\{selectedSubProject\.id\}`/);
    assert.doesNotMatch(tasks, /href=\{`\/subprojects\?projectId=/);
    assert.match(subTasks, /type: "Tarea", label: selectedTask\.title/);
    assert.doesNotMatch(subTasks, />Subtareas<\/span>/);
    for (const level of ["Cliente", "Proyecto", "Subproyecto", "Tarea"]) assert.match(breadcrumbs, new RegExp(level));
});

test("cliente, proyecto y subproyecto tienen rutas de detalle conectadas", () => {
    const clientList = read("app/client-companies/page.tsx");
    const clientDetail = read("app/client-companies/[id]/page.tsx");
    const projectDetail = read("app/projects/[id]/page.tsx");
    const subProjectDetail = read("app/subprojects/[id]/page.tsx");

    assert.match(clientList, /`\/client-companies\/\$\{company\.id\}`/);
    assert.match(clientDetail, /`\/projects\/\$\{project\.id\}`/);
    assert.match(projectDetail, /WorkHierarchyBreadcrumbs/);
    assert.match(subProjectDetail, /`\/projects\/\$\{subProject\.projectId\}`/);
});
