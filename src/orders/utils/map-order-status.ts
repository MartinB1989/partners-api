import { OrderStatus } from '@prisma/client';

/**
 * Mapea los estados de orden de la base de datos a nombres amigables en español
 * para mostrar al usuario en emails y notificaciones
 */
export function mapOrderStatusToSpanish(status: OrderStatus): string {
  const statusMap: Record<OrderStatus, string> = {
    PENDING_PAYMENT: 'Pendiente de pago',
    PENDING: 'En proceso',
    PROCESSING: 'En preparación',
    SHIPPED: 'Enviado',
    DELIVERED: 'Entregado',
    CANCELLED: 'Cancelado',
  };

  return statusMap[status] || status;
}
