import { useState, useMemo, useEffect } from "react";

const PAGE_SIZE = 6;

export function usePagination<T>(items: T[] | undefined, pageSize: number = PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const list = items ?? [];
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }, [list, page, pageSize]);

  const setPageSafe = (p: number | ((prev: number) => number)) => {
    setPage((prev) => {
      const next = typeof p === "function" ? p(prev) : p;
      return Math.max(1, Math.min(next, totalPages));
    });
  };

  return {
    page,
    setPage: setPageSafe,
    totalPages,
    paginatedItems,
  };
}
