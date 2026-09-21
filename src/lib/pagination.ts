export const PAGE_SIZE = 20;

export function paginationParams(page?: string) {
  const pageNum = Math.max(1, Number(page) || 1);
  return { page: pageNum, limit: PAGE_SIZE, offset: (pageNum - 1) * PAGE_SIZE };
}

export function totalPages(totalCount: number) {
  return Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
}
