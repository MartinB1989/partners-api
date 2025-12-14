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

/**
 * Mapea los estados de orden a descripciones amigables en español
 * que explican al usuario qué está sucediendo con su pedido
 */
export function mapOrderStatusDescription(status: OrderStatus): string {
  const descriptionMap: Record<OrderStatus, string> = {
    PENDING_PAYMENT:
      'Estamos esperando la confirmación de tu pago. Una vez acreditado, procesaremos tu pedido.',
    PENDING:
      'Tu pago ha sido confirmado. Estamos comenzando a procesar tu pedido.',
    PROCESSING:
      'Tu pedido está siendo preparado para el envío. Pronto estará en camino.',
    SHIPPED:
      'Tu pedido ha sido enviado y está en camino. Recibirás la información de seguimiento pronto.',
    DELIVERED:
      'Tu pedido ha sido entregado con éxito. ¡Esperamos que disfrutes tu compra!',
    CANCELLED:
      'Tu pedido ha sido cancelado. Si tienes preguntas, por favor contacta a nuestro equipo de soporte.',
  };

  return descriptionMap[status] || 'Tu pedido ha sido actualizado.';
}
