# Endpoints del Carrito de Compras

Este documento contiene los comandos CURL para probar los endpoints del carrito de compras.

## Carritos para usuarios autenticados

### Obtener el carrito del usuario autenticado
```bash
curl -X GET \
  "${BASE_URL}/carts" \
  -H "Authorization: Bearer TU_TOKEN_JWT"
```

### Añadir un producto al carrito
```bash
curl -X POST \
  "${BASE_URL}/carts/items" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{
    "productId": 123,
    "quantity": 2
  }'
```

### Actualizar la cantidad de un producto en el carrito
```bash
curl -X PATCH \
  "${BASE_URL}/carts/items/123" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{
    "quantity": 3
  }'
```

### Eliminar un producto del carrito
```bash
curl -X DELETE \
  "${BASE_URL}/carts/items/123" \
  -H "Authorization: Bearer TU_TOKEN_JWT"
```

### Actualizar el carrito (dirección, tipo de entrega)
```bash
curl -X PATCH \
  "${BASE_URL}/carts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{
    "addressId": "uuid-de-direccion",
    "deliveryType": "SHIPPING"
  }'
```

### Establecer tipo de entrega
```bash
curl -X PATCH \
  "${BASE_URL}/carts/delivery-type" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{
    "deliveryType": "SHIPPING"
  }'
```

### Vaciar el carrito
```bash
curl -X DELETE \
  "${BASE_URL}/carts/clear" \
  -H "Authorization: Bearer TU_TOKEN_JWT"
```

### Crear una dirección para el usuario
```bash
curl -X POST \
  "${BASE_URL}/carts/addresses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{
    "street": "Calle Principal",
    "number": "123",
    "city": "Madrid",
    "state": "Madrid",
    "zipCode": "28001",
    "country": "España"
  }'
```

### Obtener direcciones del usuario
```bash
curl -X GET \
  "${BASE_URL}/carts/addresses" \
  -H "Authorization: Bearer TU_TOKEN_JWT"
```

## Carritos para usuarios anónimos

### Obtener el carrito anónimo
```bash
curl -X GET "${BASE_URL}/carts/anonymous"
```

### Añadir un producto al carrito anónimo
```bash
curl -X POST \
  "${BASE_URL}/carts/anonymous/items" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": 123,
    "quantity": 2
  }'
```

### Actualizar la cantidad de un producto en el carrito anónimo
```bash
curl -X PATCH \
  "${BASE_URL}/carts/anonymous/items/123" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 3
  }'
```

### Eliminar un producto del carrito anónimo
```bash
curl -X DELETE "${BASE_URL}/carts/anonymous/items/123"
```

### Actualizar el carrito anónimo (dirección, tipo de entrega)
```bash
curl -X PATCH \
  "${BASE_URL}/carts/anonymous" \
  -H "Content-Type: application/json" \
  -d '{
    "addressId": "uuid-de-direccion",
    "deliveryType": "SHIPPING"
  }'
```

### Establecer tipo de entrega para carrito anónimo
```bash
curl -X PATCH \
  "${BASE_URL}/carts/anonymous/delivery-type" \
  -H "Content-Type: application/json" \
  -d '{
    "deliveryType": "PICKUP"
  }'
```

### Vaciar el carrito anónimo
```bash
curl -X DELETE "${BASE_URL}/carts/anonymous/clear"
```

### Crear una dirección para el carrito anónimo
```bash
curl -X POST \
  "${BASE_URL}/carts/anonymous/addresses" \
  -H "Content-Type: application/json" \
  -d '{
    "street": "Calle Principal",
    "number": "123",
    "city": "Madrid",
    "state": "Madrid",
    "zipCode": "28001",
    "country": "España"
  }'
```

## Transferencia de carrito anónimo a usuario autenticado

### Transferir carrito anónimo a usuario autenticado
```bash
curl -X POST \
  "${BASE_URL}/carts/transfer" \
  -H "Authorization: Bearer TU_TOKEN_JWT"
```

**Nota**: Esta operación transferirá todos los productos del carrito anónimo al carrito del usuario autenticado y luego vaciará el carrito anónimo.

## Notas sobre DeliveryType

El tipo de entrega puede ser:
- `SHIPPING`: Para envío a domicilio (requiere dirección)
- `PICKUP`: Para retirar en tienda (no requiere dirección)

## Integración con Órdenes (Pendiente de implementación)

En el futuro, el carrito se integrará con el sistema de órdenes de la siguiente manera:

### Checkout del carrito para usuarios autenticados (Pendiente)
```bash
curl -X POST \
  "${BASE_URL}/orders/checkout" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{
    "notes": "Instrucciones adicionales para la entrega"
  }'
```

### Checkout del carrito para usuarios anónimos (Pendiente)
```bash
curl -X POST \
  "${BASE_URL}/orders/anonymous/checkout" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cliente@ejemplo.com",
    "name": "Cliente Ejemplo",
    "phone": "600123456",
    "notes": "Instrucciones adicionales para la entrega"
  }'
```

El modelo de órdenes incluye:
- Información del usuario (registrado o anónimo)
- Dirección de entrega (si se seleccionó envío a domicilio)
- Productos comprados con precios y cantidades
- Tipo de entrega (envío o recogida)
- Estado del pedido (PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED)

Después de realizar el checkout, el carrito se vaciará y se creará una orden con todos los datos correspondientes. 
