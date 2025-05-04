# Comandos CURL para API de Productos

> **Nota:** Reemplazar `BASE_URL` con la URL base de tu API y `TU_TOKEN` con tu token de autenticación.

## Productos

### Crear un producto
```bash
curl -X POST \
  "${BASE_URL}/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "title": "Nombre del producto",
    "description": "Descripción detallada",
    "price": 99.99,
    "stock": 10,
    "active": true
  }'
```

### Obtener todos los productos
```bash
curl -X GET "${BASE_URL}/products?page=1&limit=10"
```

### Obtener productos del usuario autenticado
```bash
curl -X GET \
  "${BASE_URL}/products/my-products?page=1&limit=10" \
  -H "Authorization: Bearer TU_TOKEN"
```

### Obtener un producto por ID
```bash
curl -X GET "${BASE_URL}/products/ID_DEL_PRODUCTO"
```

### Actualizar un producto
```bash
curl -X PATCH \
  "${BASE_URL}/products/ID_DEL_PRODUCTO" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "title": "Nuevo nombre",
    "price": 129.99,
    "active": false
  }'
```

### Eliminar un producto
```bash
curl -X DELETE \
  "${BASE_URL}/products/ID_DEL_PRODUCTO" \
  -H "Authorization: Bearer TU_TOKEN"
```

## Imágenes de Productos

### Obtener URL prefirmada para subir imagen a S3
```bash
curl -X POST \
  "${BASE_URL}/products/images/presigned-url" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "contentType": "image/jpeg",
    "fileExtension": "jpg"
  }'
```

### Añadir imagen a un producto
```bash
curl -X POST \
  "${BASE_URL}/products/ID_DEL_PRODUCTO/images" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "url": "https://nombre-bucket.s3.region.amazonaws.com/images/id-imagen.jpg",
    "key": "images/id-imagen.jpg",
    "main": false,
    "order": 0
  }'
```

### Obtener URL prefirmada para eliminar imagen de S3
```bash
curl -X GET \
  "${BASE_URL}/products/ID_DEL_PRODUCTO/images/ID_DE_LA_IMAGEN/delete-url" \
  -H "Authorization: Bearer TU_TOKEN"
```

### Eliminar imagen de un producto
```bash
curl -X DELETE \
  "${BASE_URL}/products/ID_DEL_PRODUCTO/images/ID_DE_LA_IMAGEN" \
  -H "Authorization: Bearer TU_TOKEN"
```

### Establecer imagen principal
```bash
curl -X PATCH \
  "${BASE_URL}/products/ID_DEL_PRODUCTO/images/ID_DE_LA_IMAGEN/set-main" \
  -H "Authorization: Bearer TU_TOKEN"
``` 
