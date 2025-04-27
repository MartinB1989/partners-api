# Endpoints de Autenticación

Este documento contiene los comandos CURL para probar los endpoints de autenticación.

## Registro de Usuario

```bash
curl -X POST {BASE_URL}/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Usuario Prueba",
    "email": "usuario@ejemplo.com",
    "password": "123456",
    "roles": ["CUSTOM"]
  }'
```

## Inicio de Sesión

```bash
curl -X POST {BASE_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@ejemplo.com",
    "password": "123456"
  }'
```

## Obtener Perfil del Usuario Actual

```bash
curl -X GET {BASE_URL}/auth/profile \
  -H "Authorization: Bearer TU_TOKEN_JWT"
```

## Ejemplos con diferentes roles

### Crear un usuario administrador

```bash
curl -X POST {BASE_URL}/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin Usuario",
    "email": "admin@ejemplo.com",
    "password": "admin123",
    "roles": ["ADMIN", "CUSTOM"]
  }'
```

### Crear un usuario productor

```bash
curl -X POST {BASE_URL}/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Productor Ejemplo",
    "email": "productor@ejemplo.com",
    "password": "prod123",
    "roles": ["PRODUCTOR"]
  }'
```
```