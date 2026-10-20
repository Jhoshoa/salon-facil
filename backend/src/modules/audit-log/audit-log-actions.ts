// Known action/target-type strings written to admin_audit_logs. Kept as plain string constants
// (not a Prisma enum) so a new admin capability can start logging a new action without a
// migration -- see the comment on the AdminAuditLog model in schema.prisma.
export const AUDIT_ACTION = {
  USER_STATUS_CHANGED: 'user.status_changed',
  USER_ROLE_CHANGED: 'user.role_changed',
  VENUE_APPROVED: 'venue.approved',
  VENUE_REJECTED: 'venue.rejected',
  REVIEW_DELETED: 'review.deleted',
  REVIEW_RESPONDED: 'review.responded',
  PAYMENT_REFUNDED: 'payment.refunded',
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

export const AUDIT_TARGET_TYPE = {
  USER: 'User',
  VENUE: 'Venue',
  REVIEW: 'Review',
  PAYMENT: 'Payment',
} as const;

export type AuditTargetType = (typeof AUDIT_TARGET_TYPE)[keyof typeof AUDIT_TARGET_TYPE];
