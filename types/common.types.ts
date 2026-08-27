export interface PagedResult<T> {
    totalItems: number;
    page: number;
    pageSize: number;
    items: T[];
}