"use client";

import {
    FormEvent,
    ReactNode,
    useCallback,
    useEffect,
    useState
} from "react";
import {
    CalendarDays,
    MessageSquare,
    Send,
    Trash2,
    UserRound,
    X
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/services/api";
import { subTaskCommentsService } from "@/services/subtask-comments.service";
import { SubTaskComment } from "@/types/subtask-comment.types";
import { SubTask } from "@/types/subtask.types";

interface SubTaskCommentsModalProps {
    subTask: SubTask;
    onClose: () => void;
    onCommentCountChange?: (count: number) => void;
}

function formatDateTime(value: string): string {
    return new Intl.DateTimeFormat("es-BO", {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(new Date(value));
}

function formatDate(value: string | null): string {
    if (!value) {
        return "Sin fecha";
    }

    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("es-BO").format(
        new Date(year, month - 1, day)
    );
}

const COMMENT_URL_PATTERN = /(https?:\/\/[^\s<>"']*[^\s<>"'.,!?;:)\]}])/gi;

function renderCommentContent(content: string): ReactNode[] {
    return content.split(COMMENT_URL_PATTERN).map((part, index) => {
        if (/^https?:\/\//i.test(part)) {
            return (
                <a
                    key={`${part}-${index}`}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all font-medium text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-800"
                >
                    {part}
                </a>
            );
        }

        return part;
    });
}

export function SubTaskCommentsModal({
    subTask,
    onClose,
    onCommentCountChange
}: SubTaskCommentsModalProps) {
    const { user } = useAuth();
    const [comments, setComments] = useState<SubTaskComment[]>([]);
    const [content, setContent] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadComments = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await subTaskCommentsService.getAll(subTask.id);
            setComments(result);
            onCommentCountChange?.(result.length);
        } catch (error) {
            if (error instanceof ApiError) {
                setError(error.message);
            } else {
                setError("No se pudieron cargar los comentarios.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [onCommentCountChange, subTask.id]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadComments();
    }, [loadComments]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const normalizedContent = content.trim();

        if (!normalizedContent) {
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const created = await subTaskCommentsService.create(
                subTask.id,
                normalizedContent
            );
            setComments((current) => [...current, created]);
            onCommentCountChange?.(comments.length + 1);
            setContent("");
        } catch (error) {
            if (error instanceof ApiError) {
                setError(error.message);
            } else {
                setError("No se pudo publicar el comentario.");
            }
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete(commentId: string) {
        setError(null);

        try {
            await subTaskCommentsService.remove(subTask.id, commentId);
            setComments((current) =>
                current.filter((comment) => comment.id !== commentId)
            );
            onCommentCountChange?.(
                comments.filter((comment) => comment.id !== commentId).length
            );
        } catch (error) {
            if (error instanceof ApiError) {
                setError(error.message);
            } else {
                setError("No se pudo eliminar el comentario.");
            }
        }
    }

    const responsible = [
        subTask.assignedUserFirstName,
        subTask.assignedUserLastName
    ].filter(Boolean).join(" ");

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="subtask-comments-title"
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/45 px-4 py-6"
        >
            <section className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
                <header className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
                    <div className="min-w-0 pr-4">
                        <p className="text-xs font-semibold uppercase text-blue-600">
                            {subTask.taskItemTitle}
                        </p>
                        <h2
                            id="subtask-comments-title"
                            className="mt-1 text-xl font-semibold text-gray-900"
                        >
                            {subTask.title}
                        </h2>
                        {subTask.detail && (
                            <p className="mt-2 text-sm leading-6 text-gray-600">
                                {subTask.detail}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        title="Cerrar"
                        aria-label="Cerrar"
                        onClick={onClose}
                        className="shrink-0 rounded-md p-2 text-gray-500 hover:bg-gray-100"
                    >
                        <X size={20} />
                    </button>
                </header>

                <div className="grid min-h-0 min-w-0 flex-1 md:grid-cols-[220px_minmax(0,1fr)]">
                    <aside className="border-b border-gray-200 bg-gray-50 p-5 md:border-b-0 md:border-r">
                        <p className="text-xs font-semibold uppercase text-gray-400">
                            Información
                        </p>
                        <dl className="mt-4 space-y-4 text-sm">
                            <div>
                                <dt className="flex items-center gap-2 text-xs text-gray-500">
                                    <CalendarDays size={15} /> Periodo
                                </dt>
                                <dd className="mt-1 font-medium text-gray-800">
                                    {formatDate(subTask.startDate)} - {formatDate(subTask.endDate)}
                                </dd>
                            </div>
                            <div>
                                <dt className="flex items-center gap-2 text-xs text-gray-500">
                                    <UserRound size={15} /> Responsable
                                </dt>
                                <dd className="mt-1 font-medium text-gray-800">
                                    {responsible || "Sin responsable"}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-gray-500">Estado</dt>
                                <dd className="mt-1 font-medium text-gray-800">
                                    {subTask.status}
                                </dd>
                            </div>
                        </dl>
                    </aside>

                    <div className="flex min-h-0 min-w-0 flex-col">
                        <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4">
                            <MessageSquare size={18} className="text-gray-500" />
                            <h3 className="text-sm font-semibold text-gray-900">
                                Comentarios ({comments.length})
                            </h3>
                        </div>

                        <div className="min-h-[220px] flex-1 space-y-4 overflow-y-auto px-5 py-4">
                            {isLoading ? (
                                <p className="py-8 text-center text-sm text-gray-500">
                                    Cargando comentarios...
                                </p>
                            ) : comments.length === 0 ? (
                                <p className="py-8 text-center text-sm text-gray-500">
                                    Aún no existen comentarios.
                                </p>
                            ) : (
                                comments.map((comment) => {
                                    const initials = `${comment.userFirstName.charAt(0)}${comment.userLastName.charAt(0)}`.toUpperCase();

                                    return (
                                        <article
                                            key={comment.id}
                                            className="flex min-w-0 gap-3"
                                        >
                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
                                                {initials}
                                            </div>
                                            <div className="min-w-0 max-w-full flex-1 overflow-hidden rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900">
                                                            {comment.userFirstName} {comment.userLastName}
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-gray-400">
                                                            {formatDateTime(comment.createdAt)}
                                                        </p>
                                                    </div>
                                                    {comment.userId === user?.id && (
                                                        <button
                                                            type="button"
                                                            title="Eliminar comentario"
                                                            aria-label="Eliminar comentario"
                                                            onClick={() => void handleDelete(comment.id)}
                                                            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="mt-2 max-w-full whitespace-pre-wrap [overflow-wrap:anywhere] text-sm leading-6 text-gray-700">
                                                    {renderCommentContent(comment.content)}
                                                </p>
                                            </div>
                                        </article>
                                    );
                                })
                            )}
                        </div>

                        {error && (
                            <div
                                role="alert"
                                className="mx-5 mb-3 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
                            >
                                {error}
                            </div>
                        )}

                        <form
                            onSubmit={handleSubmit}
                            className="border-t border-gray-200 bg-white p-4"
                        >
                            <div className="flex items-end gap-3">
                                <textarea
                                    value={content}
                                    onChange={(event) => setContent(event.target.value)}
                                    placeholder="Escribe un comentario..."
                                    rows={2}
                                    maxLength={2000}
                                    className="min-h-11 flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                                />
                                <button
                                    type="submit"
                                    title="Publicar comentario"
                                    aria-label="Publicar comentario"
                                    disabled={isSaving || !content.trim()}
                                    className="flex size-11 shrink-0 items-center justify-center rounded-md bg-gray-900 text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </section>
        </div>
    );
}
