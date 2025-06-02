# Endpoints de Órdenes

Este documento contiene los comandos CURL para probar los endpoints del módulo de órdenes.

## Creación de órdenes

### Crear una orden directamente (sin usar carrito)
```bash
curl -X POST \
  "${BASE_URL}/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cliente@ejemplo.com",
    "name": "Nombre Cliente",
    "phone": "1122334455",
    "total": 3000.00,
    "deliveryType": "SHIPPING",
    "notes": "Instrucciones adicionales para la entrega",
    "address": {
      "street": "Av. Corrientes",
      "number": "1234",
      "city": "Buenos Aires",
      "state": "CABA",
      "zipCode": "C1043AAZ"
    },
    "items": [
      {
        "productId": 1,
        "title": "Producto Ejemplo",
        "unitPrice": 1500.00,
        "quantity": 2,
        "subTotal": 3000.00,
        "imageUrl": "https://ejemplo.com/imagen.jpg"
      }
    ]
  }'
```

### Crear una orden con retiro en tienda
```bash
curl -X POST \
  "${BASE_URL}/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cliente@ejemplo.com",
    "name": "Nombre Cliente",
    "phone": "1122334455",
    "total": 2500.00,
    "deliveryType": "PICKUP",
    "notes": "Pasaré a retirar por la tarde",
    "items": [
      {
        "productId": 2,
        "title": "Otro Producto",
        "unitPrice": 2500.00,
        "quantity": 1,
        "subTotal": 2500.00,
        "imageUrl": "https://ejemplo.com/imagen2.jpg"
      }
    ]
  }'
```

## Consulta de órdenes

### Obtener una orden por ID
```bash
curl -X GET \
  "${BASE_URL}/orders/1"
```

**Respuesta:**
```json
{
  "id": 1,
  "email": "cliente@ejemplo.com",
  "name": "Nombre Cliente",
  "phone": "1122334455",
  "total": 3000.00,
  "deliveryType": "SHIPPING",
  "notes": "Instrucciones adicionales para la entrega",
  "status": "PENDING_PAYMENT",
  "createdAt": "2023-08-01T14:30:00.000Z",
  "updatedAt": "2023-08-01T14:30:00.000Z",
  "addressId": "def456",
  "items": [
    {
      "id": 1,
      "productId": 1,
      "title": "Producto Ejemplo",
      "unitPrice": 1500.00,
      "quantity": 2,
      "subTotal": 3000.00,
      "imageUrl": "https://ejemplo.com/imagen.jpg",
      "orderId": 1,
      "createdAt": "2023-08-01T14:30:00.000Z",
      "updatedAt": "2023-08-01T14:30:00.000Z"
    }
  ],
  "address": {
    "id": "def456",
    "street": "Av. Corrientes",
    "number": "1234",
    "city": "Buenos Aires",
    "state": "CABA",
    "zipCode": "C1043AAZ",
    "createdAt": "2023-08-01T14:30:00.000Z",
    "updatedAt": "2023-08-01T14:30:00.000Z"
  }
}
```

## Notas sobre la creación de órdenes

- La dirección (`address`) es requerida solo cuando el tipo de entrega es `SHIPPING`.
- Para el tipo de entrega `PICKUP`, no es necesario proporcionar una dirección.
- La dirección se asociará solo a esta orden específica.
- El sistema verifica automáticamente la disponibilidad de stock antes de crear la orden.
- Los valores de `total` y `subTotal` son proporcionados por el frontend y no se recalculan en el backend.
- El campo `imageUrl` en los items es opcional.
- El estado inicial de la orden es siempre `PENDING_PAYMENT`.

## Estados de la orden

El sistema maneja los siguientes estados para las órdenes:

- `PENDING_PAYMENT`: Esperando confirmación de pago
- `PENDING`: Pago confirmado, orden pendiente de procesamiento
- `PROCESSING`: Orden en proceso de preparación
- `SHIPPED`: Orden enviada al cliente
- `DELIVERED`: Orden entregada al cliente
- `CANCELLED`: Orden cancelada

## Consideraciones de integración

Al crear una orden:

1. El stock de los productos se actualiza automáticamente.
2. El sistema valida que haya suficiente stock para cada producto.
3. Todas las operaciones (creación de orden, ítems, actualización de stock) se realizan en una transacción, garantizando la integridad de los datos. 
