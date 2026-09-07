import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError } from "./errors";

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type Pagination = {
  page: number;
  limit: number;
  skip: number;
};

export function parsePagination(request: NextRequest): Pagination {
  const url = new URL(request.url);
  const result = paginationSchema.safeParse({
    page: url.searchParams.get("page") ?? 1,
    limit: url.searchParams.get("limit") ?? DEFAULT_PAGE_SIZE,
  });
  if (!result.success) {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid pagination", result.error.issues);
  }
  const { page, limit } = result.data;
  return { page, limit, skip: (page - 1) * limit };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  pagination: Pagination,
  request: NextRequest
) {
  const url = new URL(request.url);
  const totalPages = Math.ceil(total / pagination.limit);
  const nextPage = pagination.page < totalPages ? pagination.page + 1 : null;
  const prevPage = pagination.page > 1 ? pagination.page - 1 : null;

  const buildUrl = (page: number | null) => {
    if (page === null) return null;
    const u = new URL(url.toString());
    u.searchParams.set("page", String(page));
    u.searchParams.set("limit", String(pagination.limit));
    return `${u.pathname}?${u.searchParams.toString()}`;
  };

  return {
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
      next: buildUrl(nextPage),
      prev: buildUrl(prevPage),
    },
  };
}
