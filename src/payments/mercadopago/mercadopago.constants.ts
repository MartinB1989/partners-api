import { PaymentStatus } from '@prisma/client';

export const MERCADOPAGO_CONFIG = {
  CURRENCY: 'ARS',
  WEBHOOK_TOPIC: {
    PAYMENT: 'payment',
    MERCHANT_ORDER: 'merchant_order',
  },
};

export const PAYMENT_STATUS_MAP: Record<string, PaymentStatus> = {
  approved: PaymentStatus.APPROVED,
  pending: PaymentStatus.PENDING,
  in_process: PaymentStatus.IN_PROCESS,
  rejected: PaymentStatus.REJECTED,
  cancelled: PaymentStatus.CANCELLED,
  refunded: PaymentStatus.REFUNDED,
};
