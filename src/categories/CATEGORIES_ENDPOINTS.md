# Comandos CURL para API de Categorías

> **Nota:** Reemplazar `BASE_URL` con la URL base de tu API y `TU_TOKEN` con tu token de autenticación.

## Categorías

### Obtener todas las categorías
```bash
curl -X GET "${BASE_URL}/categories"
```
La respuesta incluirá la jerarquía completa de cada categoría (padre e hijos).

### Obtener la jerarquía completa de categorías
```bash
curl -X GET "${BASE_URL}/categories/hierarchy"
```

Esta ruta devuelve todas las categorías organizadas en una estructura jerárquica anidada:
- Categorías de nivel 1 como elementos raíz
- Cada categoría incluye sus subcategorías anidadas en la propiedad `children`
- Las subcategorías de nivel 3 están anidadas dentro de sus respectivas categorías de nivel 2

#### Ejemplo de Respuesta:

```json
[
  {
    "id": 1,
    "name": "Electrónica",
    "idName": "electronica",
    "level": 1,
    "parentId": null,
    "children": [
      {
        "id": 2,
        "name": "Teléfonos",
        "idName": "telefonos",
        "level": 2,
        "parentId": 1,
        "children": [
          {
            "id": 3,
            "name": "Smartphones",
            "idName": "smartphones",
            "level": 3,
            "parentId": 2,
            "children": []
          },
          {
            "id": 4,
            "name": "Teléfonos básicos",
            "idName": "telefonos-basicos",
            "level": 3,
            "parentId": 2,
            "children": []
          }
        ]
      }
    ]
  }
]
```

#### Caso de Uso:
Ideal para construir menús de navegación, filtros por categoría, o árboles de selección en una interfaz de usuario.

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

## Filtrar Categorías

### GET /categories/filter

Filtra las categorías según diferentes criterios.

#### Query Parameters

| Parámetro | Tipo   | Requerido | Descripción                                    |
|-----------|--------|-----------|------------------------------------------------|
| level     | number | No        | Nivel de la categoría (1-3)                    |
| name      | string | No        | Nombre de la categoría (búsqueda parcial)      |
| idName    | string | No        | idName de la categoría (búsqueda parcial)      |

#### Ejemplos de Uso

```http
GET /categories/filter?level=1
GET /categories/filter?name=ropa
GET /categories/filter?idName=ropa-deportiva
GET /categories/filter?level=2&name=zapatillas
```

#### Respuesta

```json
[
  {
    "id": 1,
    "name": "Ropa",
    "idName": "ropa",
    "level": 1,
    "parentId": null,
    "parent": null,
    "children": [
      {
        "id": 2,
        "name": "Ropa Deportiva",
        "idName": "ropa-deportiva",
        "level": 2,
        "parentId": 1,
        "parent": null,
        "children": []
      }
    ]
  }
]
```

#### Notas

- La búsqueda por `name` e `idName` es insensible a mayúsculas/minúsculas
- Los filtros son opcionales y pueden combinarse
- Los resultados se ordenan por nivel y nombre
- Incluye las relaciones `parent` y `children`
