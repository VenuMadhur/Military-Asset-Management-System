import env from './env.js';

export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  BASE_COMMANDER: 'BASE_COMMANDER',
  LOGISTICS_OFFICER: 'LOGISTICS_OFFICER',
});

/**
 * Configurable authorization policy.
 * Allows restricting Logistics Officer from global scope to assigned home base
 * via LOGISTICS_GLOBAL_SCOPE=false without code changes.
 */
export const policies = {
  logistics: {
    globalScope: env.logisticsGlobalScope,
    allowedAuditEntityTypes: ['PURCHASE', 'TRANSFER'],
    canApproveTransfers: true,
    canDispatchTransfers: true,
    canCompleteTransfers: true,
    canCancelTransfers: true,
    canRejectTransfers: true,
  },
};

export function hasGlobalBaseAccess(user) {
  if (!user) return false;
  if (user.role === ROLES.ADMIN) return true;
  if (user.role === ROLES.LOGISTICS_OFFICER) return policies.logistics.globalScope;
  return false;
}
