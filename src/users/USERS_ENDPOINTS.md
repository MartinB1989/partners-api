# Endpoints de Gestión de Usuarios

Este documento contiene los comandos CURL para probar los endpoints de gestión de usuarios.

## Obtener todos los usuarios

```bash
curl -X GET http://localhost:3001/api/users \
  -H "Authorization: Bearer TU_TOKEN_JWT"
```

## Obtener un usuario específico

```bash
curl -X GET http://localhost:3001/api/users/ID_DEL_USUARIO \
  -H "Authorization: Bearer TU_TOKEN_JWT"
```

## Crear un nuevo usuario

```bash
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{
    "name": "Nuevo Usuario",
    "email": "nuevo@ejemplo.com",
    "password": "nuevo123",
    "roles": ["CUSTOM"]
  }'
```

## Actualizar un usuario

```bash
curl -X PATCH http://localhost:3001/api/users/ID_DEL_USUARIO \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{
    "name": "Nombre Actualizado"
  }'
```

## Eliminar un usuario

```bash
curl -X DELETE http://localhost:3001/api/users/ID_DEL_USUARIO \
  -H "Authorization: Bearer TU_TOKEN_JWT"
```

---

## Configuración de Vendedor (Seller Settings)

Endpoints exclusivos para usuarios con roles **ADMIN** o **PRODUCTOR**.

### Obtener configuración del vendedor

Obtiene la configuración actual del vendedor autenticado. Si no existe, se crea automáticamente con valores por defecto (`acceptsHomeDelivery: false`, `acceptsPickup: false`).

```bash
curl -X GET http://localhost:3001/api/users/me/seller-settings \
  -H "Authorization: Bearer TU_TOKEN_JWT"
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "userId": "user-uuid",
    "acceptsHomeDelivery": false,
    "acceptsPickup": false,
    "createdAt": "2025-01-01T12:00:00Z",
    "updatedAt": "2025-01-01T12:00:00Z"
  },
  "message": "Operación realizada con éxito"
}
```

**Errores posibles:**
- `401`: No autenticado
- `403`: No autorizado (usuario no es ADMIN ni PRODUCTOR)
- `404`: Usuario no encontrado

---

### Actualizar configuración del vendedor

Actualiza las preferencias de entrega del vendedor. Todos los campos son opcionales.

```bash
curl -X PATCH http://localhost:3001/api/users/me/seller-settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{
    "acceptsHomeDelivery": true,
    "acceptsPickup": false
  }'
```

**Validaciones importantes:**
- Ambos campos son opcionales
- Cada campo debe ser un booleano
- Se permite que ambas opciones estén en `false`
- **Para habilitar `acceptsPickup: true`**, el vendedor **debe tener al menos una dirección de retiro activa** (`PickupAddress` con `isActive: true`)

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "userId": "user-uuid",
    "acceptsHomeDelivery": true,
    "acceptsPickup": false,
    "createdAt": "2025-01-01T12:00:00Z",
    "updatedAt": "2025-01-01T12:30:00Z"
  },
  "message": "Operación realizada con éxito"
}
```

**Errores posibles:**
- `400`: Datos inválidos (tipo de dato incorrecto)
- `401`: No autenticado
- `403`: No autorizado (usuario no es ADMIN ni PRODUCTOR)
- `404`: Usuario no encontrado
- `409`: Intento de habilitar `acceptsPickup: true` sin tener direcciones de retiro activas

**Ejemplo de error 409:**
```json
{
  "success": false,
  "statusCode": 409,
  "message": "Para aceptar retiros en persona debes tener al menos una dirección de retiro activa",
  "timestamp": "2025-01-01T10:30:00Z",
  "path": "/api/users/me/seller-settings"
}
```

---

### Ejemplos de uso completos

#### Habilitar solo envíos a domicilio
```bash
curl -X PATCH http://localhost:3001/api/users/me/seller-settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{"acceptsHomeDelivery": true}'
```

#### Habilitar ambas opciones
```bash
curl -X PATCH http://localhost:3001/api/users/me/seller-settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{
    "acceptsHomeDelivery": true,
    "acceptsPickup": true
  }'
```

#### Deshabilitar todas las opciones
```bash
curl -X PATCH http://localhost:3001/api/users/me/seller-settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{
    "acceptsHomeDelivery": false,
    "acceptsPickup": false
  }'
```

---

## Notas importantes

- Reemplaza `TU_TOKEN_JWT` con el token JWT obtenido después de iniciar sesión.
- Reemplaza `ID_DEL_USUARIO` con el ID real del usuario a consultar, actualizar o eliminar.
- Todos estos endpoints requieren autenticación (token JWT).
- El puerto del servidor es `3001` y todos los endpoints tienen el prefijo `/api`.
- Los endpoints de configuración de vendedor (`/me/seller-settings`) solo están disponibles para usuarios con roles **ADMIN** o **PRODUCTOR**.