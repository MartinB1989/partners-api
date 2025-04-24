# Endpoints de Gestión de Usuarios

Este documento contiene los comandos CURL para probar los endpoints de gestión de usuarios.

## Obtener todos los usuarios

```bash
curl -X GET http://localhost:3000/users \
  -H "Authorization: Bearer TU_TOKEN_JWT"
```

## Obtener un usuario específico

```bash
curl -X GET http://localhost:3000/users/ID_DEL_USUARIO \
  -H "Authorization: Bearer TU_TOKEN_JWT"
```

## Crear un nuevo usuario

```bash
curl -X POST http://localhost:3000/users \
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
curl -X PATCH http://localhost:3000/users/ID_DEL_USUARIO \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{
    "name": "Nombre Actualizado"
  }'
```

## Eliminar un usuario

```bash
curl -X DELETE http://localhost:3000/users/ID_DEL_USUARIO \
  -H "Authorization: Bearer TU_TOKEN_JWT"
```

## Notas importantes

- Reemplaza `TU_TOKEN_JWT` con el token JWT obtenido después de iniciar sesión.
- Reemplaza `ID_DEL_USUARIO` con el ID real del usuario a consultar, actualizar o eliminar.
- Todos estos endpoints requieren autenticación (token JWT).