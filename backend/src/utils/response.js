export function sendSuccess(res, { statusCode = 200, message = null, data = null, pagination = null } = {}) {
  const payload = { success: true };
  if (message) payload.message = message;
  if (data !== null && data !== undefined) payload.data = data;
  if (pagination) payload.pagination = pagination;
  return res.status(statusCode).json(payload);
}

export function parsePagination(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function buildPaginationMeta({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
