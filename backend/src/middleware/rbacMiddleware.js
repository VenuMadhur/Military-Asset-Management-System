import { hasGlobalBaseAccess, ROLES } from '../config/policies.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

export function authorizeRoles(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to perform this operation'));
    }
    return next();
  };
}

/**
 * Enforces base-level data isolation.
 * - ADMIN: global access across all bases.
 * - LOGISTICS_OFFICER: governed by policies.logistics.globalScope.
 * - BASE_COMMANDER: strictly restricted to req.user.baseId; any attempt to supply
 *   another baseId via route param, query param, or request body returns 403 Forbidden.
 */
export function enforceBaseScope({ paramName = null, forceBodyBaseId = false, allowGlobalLogistics = true } = {}) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const isGlobal =
      req.user.role === ROLES.ADMIN ||
      (req.user.role === ROLES.LOGISTICS_OFFICER && allowGlobalLogistics && hasGlobalBaseAccess(req.user));

    if (isGlobal) {
      const requestedBaseId =
        (paramName && req.params?.[paramName]) || req.query?.baseId || req.body?.baseId || null;
      req.effectiveBaseId = requestedBaseId || null;
      return next();
    }

    if (!req.user.baseId) {
      return next(new ForbiddenError('Your account is not assigned to any military base'));
    }

    const userBaseId = req.user.baseId;

    if (paramName && req.params?.[paramName] && req.params[paramName] !== userBaseId) {
      return next(new ForbiddenError('Access to another military base is forbidden'));
    }

    if (req.query?.baseId && req.query.baseId !== userBaseId) {
      return next(new ForbiddenError('Access to another military base is forbidden'));
    }

    if (req.body && typeof req.body === 'object' && req.body.baseId && req.body.baseId !== userBaseId) {
      return next(new ForbiddenError('Cannot specify or modify another military base'));
    }

    req.effectiveBaseId = userBaseId;

    if (forceBodyBaseId && req.body && typeof req.body === 'object') {
      req.body.baseId = userBaseId;
    }

    return next();
  };
}

/**
 * Reusable resource-level authorization check for base-owned records.
 */
export function authorizeResourceAccess(user, resourceBaseId) {
  if (!user) {
    throw new UnauthorizedError('Authentication required');
  }
  if (hasGlobalBaseAccess(user)) {
    return true;
  }
  if (!user.baseId || resourceBaseId !== user.baseId) {
    throw new ForbiddenError('You are not authorized to access resources of another base');
  }
  return true;
}
