# Comandos CURL para API de Categorías

> **Nota:** Reemplazar `BASE_URL` con la URL base de tu API y `TU_TOKEN` con tu token de autenticación.

## Categorías

### Obtener todas las categorías
```bash
curl -X GET "${BASE_URL}/categories"
```

### Crear una categoría (solo administradores)
```bash
curl -X POST \
  "${BASE_URL}/categories" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "name": "Nombre de la categoría"
  }'
```

### Actualizar una categoría (solo administradores)
```bash
curl -X PATCH \
  "${BASE_URL}/categories/ID_DE_LA_CATEGORIA" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "name": "Nuevo nombre de la categoría"
  }'
```

### Eliminar una categoría (solo administradores)
```bash
curl -X DELETE \
  "${BASE_URL}/categories/ID_DE_LA_CATEGORIA" \
  -H "Authorization: Bearer TU_TOKEN"
``` 
