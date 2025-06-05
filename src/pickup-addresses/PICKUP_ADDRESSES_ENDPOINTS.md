# Endpoints de Gestión de Direcciones de Retiro

Este documento contiene los comandos CURL para probar los endpoints de gestión de direcciones de retiro. Estos endpoints solo están disponibles para usuarios con roles ADMIN o PRODUCTOR, excepto el endpoint público especificado.

## Obtener todas las direcciones de retiro del usuario

```bash
curl -X GET http://localhost:3000/pickup-addresses \
  -H "Authorization: Bearer TU_TOKEN_JWT"
```

### Respuesta
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "name": "Punto 1",
            "street": "Watt ",
            "number": "1769",
            "city": "Laferrere",
            "state": "Buenos Aires",
            "zipCode": "1757",
            "country": "Argentina",
            "additionalInfo": "",
            "latitude": -34.7512,
            "longitude": -58.5889,
            "isActive": true,
            "userId": "360ca087-e4ef-4d1d-8460-cbc490038e79",
            "createdAt": "2025-05-21T05:02:00.666Z",
            "updatedAt": "2025-05-21T05:02:00.666Z"
        }
    ],
    "message": "Operación realizada con éxito"
}
```

## Obtener públicamente todas las direcciones de retiro (Endpoint Público)

```bash
curl -X GET http://localhost:3000/pickup-addresses/public
```

### Respuesta
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "name": "Punto 1",
            "street": "Watt ",
            "number": "1769",
            "city": "Laferrere",
            "state": "Buenos Aires",
            "zipCode": "1757",
            "country": "Argentina",
            "additionalInfo": "",
            "latitude": -34.7512,
            "longitude": -58.5889,
            "isActive": true,
            "userId": "360ca087-e4ef-4d1d-8460-cbc490038e79",
            "createdAt": "2025-05-21T05:02:00.666Z",
            "updatedAt": "2025-05-21T05:02:00.666Z"
        },
        {
            "id": 2,
            "name": "Punto 2",
            "street": "Av. Corrientes",
            "number": "1234",
            "city": "Buenos Aires",
            "state": "CABA",
            "zipCode": "C1043AAZ",
            "country": "Argentina",
            "additionalInfo": "Planta baja, local 4",
            "latitude": -34.6037,
            "longitude": -58.3816,
            "isActive": true,
            "userId": "5e2f63d4-b9a8-4b5c-b9d3-f3c6d7b8e9a0",
            "createdAt": "2025-05-22T10:15:30.123Z",
            "updatedAt": "2025-05-22T10:15:30.123Z"
        }
    ],
    "message": "Operación realizada con éxito"
}
```

## Obtener una dirección de retiro específica

```bash
curl -X GET http://localhost:3000/pickup-addresses/ID_DIRECCION \
  -H "Authorization: Bearer TU_TOKEN_JWT"
```

### Respuesta
```json
{
  "id": 1,
  "name": "Tienda Principal",
  "street": "Av. Corrientes",
  "number": "1234",
  "city": "Buenos Aires",
  "state": "CABA",
  "zipCode": "C1043AAZ",
  "country": "Argentina",
  "additionalInfo": "Planta baja, local 4",
  "latitude": -34.6037,
  "longitude": -58.3816,
  "isActive": true,
  "userId": 5,
  "createdAt": "2023-10-15T14:30:00.000Z",
  "updatedAt": "2023-10-15T14:30:00.000Z"
}
```

## Crear una nueva dirección de retiro

```bash
curl -X POST http://localhost:3000/pickup-addresses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{
    "name": "Tienda Principal",
    "street": "Av. Corrientes",
    "number": "1234",
    "city": "Buenos Aires",
    "state": "CABA",
    "zipCode": "C1043AAZ",
    "additionalInfo": "Planta baja, local 4",
    "latitude": -34.6037,
    "longitude": -58.3816,
    "isActive": true
  }'
```

### Respuesta
```json
{
  "id": 2,
  "name": "Tienda Principal",
  "street": "Av. Corrientes",
  "number": "1234",
  "city": "Buenos Aires",
  "state": "CABA",
  "zipCode": "C1043AAZ",
  "country": "Argentina",
  "additionalInfo": "Planta baja, local 4",
  "latitude": -34.6037,
  "longitude": -58.3816,
  "isActive": true,
  "userId": 5,
  "createdAt": "2023-10-15T14:45:00.000Z",
  "updatedAt": "2023-10-15T14:45:00.000Z"
}
```

## Actualizar una dirección de retiro

```bash
curl -X PATCH http://localhost:3000/pickup-addresses/ID_DIRECCION \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{
    "name": "Depósito Central",
    "additionalInfo": "Entrada por calle lateral, timbre 2",
    "isActive": true
  }'
```

### Respuesta
```json
{
  "id": 1,
  "name": "Depósito Central",
  "street": "Av. Corrientes",
  "number": "1234",
  "city": "Buenos Aires",
  "state": "CABA",
  "zipCode": "C1043AAZ",
  "country": "Argentina",
  "additionalInfo": "Entrada por calle lateral, timbre 2",
  "isActive": true,
  "userId": 5,
  "createdAt": "2023-10-15T14:30:00.000Z",
  "updatedAt": "2023-10-15T15:20:00.000Z"
}
```

## Eliminar una dirección de retiro

```bash
curl -X DELETE http://localhost:3000/pickup-addresses/ID_DIRECCION \
  -H "Authorization: Bearer TU_TOKEN_JWT"
```

### Respuesta
```json 
{
  "statusCode": 200,
  "message": "Dirección de retiro eliminada correctamente"
}
```

## Notas importantes

- Reemplaza `TU_TOKEN_JWT` con el token JWT obtenido después de iniciar sesión.
- Reemplaza `ID_DIRECCION` con el ID numérico real de la dirección de retiro.
- Todos estos endpoints requieren autenticación (token JWT).
- Solo usuarios con roles ADMIN o PRODUCTOR pueden acceder a estos endpoints.
- Cada usuario solo puede administrar sus propias direcciones de retiro.
- El campo `country` por defecto es "Argentina" y es opcional en la creación. 
