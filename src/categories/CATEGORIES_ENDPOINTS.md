# Comandos CURL para API de Categorías

> **Nota:** Reemplazar `BASE_URL` con la URL base de tu API y `TU_TOKEN` con tu token de autenticación.

## Categorías

### Obtener todas las categorías
```bash
curl -X GET "${BASE_URL}/categories"
```
La respuesta incluirá la jerarquía completa de cada categoría (padre e hijos).

### Crear una categoría (solo administradores)
```bash
curl -X POST \
  "${BASE_URL}/categories" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "name": "Nombre de la categoría",
    "level": 1,
    "parentId": null
  }'
```

> **Notas sobre los niveles:**
> - `level`: 1 (categoría principal), 2 (subcategoría), 3 (sub-subcategoría)
> - `parentId`: null para nivel 1, ID de la categoría padre para niveles 2 y 3

### Actualizar una categoría (solo administradores)
```bash
curl -X PATCH \
  "${BASE_URL}/categories/ID_DE_LA_CATEGORIA" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "name": "Nuevo nombre de la categoría",
    "level": 2,
    "parentId": ID_DE_LA_CATEGORIA_PADRE
  }'
```

### Eliminar una categoría (solo administradores)
```bash
curl -X DELETE \
  "${BASE_URL}/categories/ID_DE_LA_CATEGORIA" \
  -H "Authorization: Bearer TU_TOKEN"
``` 

> **Nota:** No se pueden eliminar categorías que tengan subcategorías. 
