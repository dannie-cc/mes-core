import type { TICKET_STATUS } from '@/common/enums';

/**
 * Base mail interface for sending raw emails
 */
export interface ISendMail {
    to: string | string[];
    subject: string;
    from?: string;
    html: string;
}

/**
 * Email verification interface
 * Used for: sendVerification()
 */
export interface ISendVerificationMail {
    email: string;
    name: string;
    code: string;
}

/**
 * Password reset interface
 * Used for: sendPasswordReset()
 */
export interface ISendPasswordResetMail {
    email: string;
    name: string;
    resetUrl: string;
    resetToken: string;
}

/**
 * Ticket confirmation interface
 * Used for: sendTicketConfirmation()
 */
export interface ISendTicketConfirmation {
    email: string;
    name?: string;
    ticketNumber: string;
    status: TICKET_STATUS;
}

/**
 * Admin ticket notification interface
 * Used for: sendAdminTicketNotification()
 */
export interface ISendAdminTicketNotification {
    ticketId: string;
    ticketNumber: string;
    ticketType: string;
    customerName: string;
    customerEmail: string;
    ticketSubject?: string;
    createdAt: string;
}

/**
 * Order status notification interface
 * Used for: sendOrderNotification()
 */
export interface ISendOrderStatusMail {
    email: string;
    name: string;
    stageName: string;
    status: string;
    details?: string;
}

/**
 * Email template enum
 * Maps service methods to their corresponding email templates
 */
export enum EMAIL_TEMPLATE {
    VERIFICATION = 'verification',
    PASSWORD_RESET = 'reset-password',
    TICKET_CREATION = 'ticket-confirmation',
    TICKET_STATUS_NOTIFICATION = 'ticket-notification',
    ADMIN_TICKET_NOTIFICATION = 'admin-ticket-notification',
    ORDER_STATUS = 'order-status',
}
