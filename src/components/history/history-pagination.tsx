import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DEFAULT_CHANGE_HISTORY_PAGE_SIZE } from "@/lib/change-history/types";

type HistoryPaginationSearchParams = {
  entity_type?: string;
  changed_by?: string;
};

function buildHistoryHref(
  page: number,
  searchParams: HistoryPaginationSearchParams,
) {
  const params = new URLSearchParams();

  if (searchParams.entity_type) {
    params.set("entity_type", searchParams.entity_type);
  }

  if (searchParams.changed_by) {
    params.set("changed_by", searchParams.changed_by);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `/history?${query}` : "/history";
}

export function getHistoryPageRange(
  page: number,
  totalCount: number,
  pageSize = DEFAULT_CHANGE_HISTORY_PAGE_SIZE,
) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalCount);

  return { start, end, totalPages, safePage };
}

export function HistoryPageSummary({
  page,
  totalCount,
  pageSize = DEFAULT_CHANGE_HISTORY_PAGE_SIZE,
}: {
  page: number;
  totalCount: number;
  pageSize?: number;
}) {
  const { start, end } = getHistoryPageRange(page, totalCount, pageSize);

  return (
    <p className="text-sm text-muted-foreground">
      Showing {start}-{end} of {totalCount} change
      {totalCount === 1 ? "" : "s"}
    </p>
  );
}

export function HistoryPagination({
  page,
  totalCount,
  searchParams,
  pageSize = DEFAULT_CHANGE_HISTORY_PAGE_SIZE,
}: {
  page: number;
  totalCount: number;
  searchParams: HistoryPaginationSearchParams;
  pageSize?: number;
}) {
  const { totalPages, safePage } = getHistoryPageRange(
    page,
    totalCount,
    pageSize,
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Page {safePage} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        {safePage > 1 ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={buildHistoryHref(safePage - 1, searchParams)}>
              Previous
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
        )}
        {safePage < totalPages ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={buildHistoryHref(safePage + 1, searchParams)}>
              Next
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
