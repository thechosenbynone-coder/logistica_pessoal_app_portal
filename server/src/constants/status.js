export const DeploymentStatus = Object.freeze({
  PLANNED: 'PLANNED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELED: 'CANCELED',
});

export const DocumentStatus = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
});

export const FinancialRequestStatus = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PAID: 'PAID',
});

export const EpiRequestStatus = Object.freeze({
  OPEN: 'OPEN',
  APPROVED: 'APPROVED',
  DELIVERED: 'DELIVERED',
  RETURNED: 'RETURNED',
});
