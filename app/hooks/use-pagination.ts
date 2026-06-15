import { useMemo, useState, useEffect } from "react";

interface UsePaginationOptions {
  pageSize?: number;
  initialPage?: number;
}

interface UsePaginationResult<T> {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  totalItems: number;
  totalPages: number;
  paginatedData: T[];
  startIndex: number;
  endIndex: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  goToPrevious: () => void;
  goToNext: () => void;
  goToFirst: () => void;
  goToLast: () => void;
}

export function usePagination<T>(
  data: T[],
  options: UsePaginationOptions = {}
): UsePaginationResult<T> {
  const { pageSize: initialPageSize = 10, initialPage = 1 } = options;

  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);

  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Clamp current page when data length changes
  const safeCurrentPage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedData = useMemo(() => {
    return data.slice(startIndex, endIndex);
  }, [data, startIndex, endIndex]);

  const canGoPrevious = safeCurrentPage > 1;
  const canGoNext = safeCurrentPage < totalPages;

  const goToPrevious = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goToNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));
  const goToFirst = () => setCurrentPage(1);
  const goToLast = () => setCurrentPage(totalPages);

  return {
    currentPage: safeCurrentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,
    paginatedData,
    startIndex,
    endIndex,
    canGoPrevious,
    canGoNext,
    goToPrevious,
    goToNext,
    goToFirst,
    goToLast,
  };
}
