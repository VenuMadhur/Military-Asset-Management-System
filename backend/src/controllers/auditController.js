import { listAuditLogs as queryAuditLogs } from '../services/auditService.js';
import { sendSuccess } from '../utils/response.js';

export async function listAuditLogs(req, res, next) {
  try {
    const result = await queryAuditLogs({
      user: req.user,
      query: req.query,
    });
    return sendSuccess(res, {
      data: result.items,
      pagination: result.pagination,
    });
  } catch (err) {
    return next(err);
  }
}
