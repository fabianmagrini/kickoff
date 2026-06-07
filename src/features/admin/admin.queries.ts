import { queryOptions } from '@tanstack/react-query';
import { getAuditLogFn } from './admin.server';

export const auditLogQueryOptions = queryOptions({
  queryKey: ['admin', 'audit-log'],
  queryFn: () => getAuditLogFn(),
});
