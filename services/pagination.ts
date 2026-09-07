import { PagedResult } from "@/types/common.types";

export async function loadAllPages<T>(
    loader: (page: number, pageSize: number) => Promise<PagedResult<T>>
): Promise<T[]> {
    const pageSize = 100;
    const firstPage = await loader(1, pageSize);
    const pageCount = Math.ceil(firstPage.totalItems / pageSize);
    const remainingPages = pageCount > 1
        ? await Promise.all(
            Array.from({ length: pageCount - 1 }, (_, index) =>
                loader(index + 2, pageSize)
            )
        )
        : [];

    return [
        ...firstPage.items,
        ...remainingPages.flatMap((page) => page.items)
    ];
}
