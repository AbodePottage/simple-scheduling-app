import type { ReactNode } from 'react';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  itemCount: number;
  noun: string;
  onPageChange: (page: number) => void;
}

function pageWindow(current: number, last: number): number[] {
  const pages: number[] = [];
  const start = Math.max(1, Math.min(current - 1, last - 2));
  const end = Math.min(last, start + 2);
  for (let value = start; value <= end; value += 1) {
    pages.push(value);
  }
  return pages;
}

export function Pagination({ page, pageSize, total, itemCount, noun, onPageChange }: PaginationProps): ReactNode {
  if (total === 0) {
    return null;
  }

  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = from + itemCount - 1;

  return (
    <div className="pagination">
      <span className="pagination-count">
        Showing {from}-{to} of {total} {noun}
      </span>
      {lastPage > 1 ? (
        <div className="pagination-controls" role="navigation" aria-label="Pagination">
          <button type="button" className="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Prev
          </button>
          {pageWindow(page, lastPage).map((value) => (
            <button
              key={value}
              type="button"
              className={value === page ? 'pagination-page active' : 'pagination-page'}
              aria-current={value === page ? 'page' : undefined}
              onClick={() => onPageChange(value)}
            >
              {value}
            </button>
          ))}
          <button
            type="button"
            className="secondary"
            disabled={page >= lastPage}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
