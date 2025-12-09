# Sistema de Pagos - Mercado Pago Integration

## Documentación Técnica para Desarrolladores

Este documento describe la arquitectura e implementación del sistema de pagos integrado con **Mercado Pago Checkout Pro** en el backend NestJS del marketplace.

---

## Tabla de Contenidos

1. [Resumen de Arquitectura](#resumen-de-arquitectura)
2. [Modelo de Datos](#modelo-de-datos)
3. [Flujo de Pago Completo](#flujo-de-pago-completo)
4. [Estructura del Módulo](#estructura-del-módulo)
5. [Servicios](#servicios)
6. [Controladores](#controladores)
7. [Webhooks](#webhooks)
8. [Estados de Pago](#estados-de-pago)
9. [Configuración](#configuración)
10. [Testing](#testing)
11. [Troubleshooting](#troubleshooting)

---

## Resumen de Arquitectura

### Componentes Principales

```
┌─────────────────┐
│    Frontend     │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────────────────────────────┐
│                  Backend (NestJS)                        │
│                                                          │
│  ┌──────────────┐      ┌──────────────┐                │
│  │   Payments   │◄─────┤   Webhooks   │                │
│  │  Controller  │      │  Controller  │                │
│  └──────┬───────┘      └──────┬───────┘                │
│         │                     │                         │
│         ↓                     ↓                         │
│  ┌──────────────┐      ┌──────────────┐                │
│  │   Payments   │      │   Webhooks   │                │
│  │   Service    │◄─────┤   Service    │                │
│  └──────┬───────┘      └──────────────┘                │
│         │                                               │
│         ↓                                               │
│  ┌──────────────┐                                       │
│  │  MercadoPago │                                       │
│  │   Service    │                                       │
│  └──────┬───────┘                                       │
│         │                                               │
│         ↓                                               │
│  ┌──────────────┐                                       │
│  │   Prisma     │                                       │
│  │   Service    │                                       │
│  └──────────────┘                                       │
└──────────────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────┐
│  Mercado Pago   │
│      API        │
└─────────────────┘
```

### Principios de Diseño

- **Separación de Responsabilidades**: Cada servicio tiene un propósito único y bien definido
- **Idempotencia**: Los webhooks pueden procesarse múltiples veces sin efectos secundarios
- **Trazabilidad**: Logging exhaustivo en cada paso del flujo
- **Extensibilidad**: Preparado para agregar otros métodos de pago (Stripe, transferencias, etc.)
- **Seguridad**: Validación de webhooks mediante firma HMAC

---

## Modelo de Datos

### Payment (Prisma Schema)

```prisma
model Payment {
  id                String        @id @default(uuid())
  orderId           Int           @unique          // Relación 1-a-1 con Order
  paymentMethod     PaymentMethod
  externalId        String?                        // ID del pago en Mercado Pago
  preferenceId      String?                        // ID de la preferencia de MP
  status            PaymentStatus @default(PENDING)
  amount            Float                          // Monto total del pago
  currency          String        @default("ARS")
  metadata          Json?                          // Datos adicionales del pago
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  order             Order         @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([externalId])
  @@index([status])
}
```

### Enums

#### PaymentMethod
```prisma
enum PaymentMethod {
  MERCADOPAGO
  // Futuros: STRIPE, TRANSFERENCIA, EFECTIVO
}
```

#### PaymentStatus
```prisma
enum PaymentStatus {
  PENDING           // Pago pendiente de procesamiento
  APPROVED          // Pago aprobado por Mercado Pago
  REJECTED          // Pago rechazado
  CANCELLED         // Pago cancelado por el usuario
  REFUNDED          // Pago reembolsado
  IN_PROCESS        // Pago en proceso (MP específico)
}
```

### Relación con Order

```prisma
model Order {
  // ... otros campos
  payment           Payment?
}
```

**Importante**: La relación es 1-a-1 (un pago por orden).

---

## Flujo de Pago Completo

### 1. Creación de Orden (POST /api/orders)

```typescript
// El usuario crea una orden desde el frontend
POST /api/orders
{
  "email": "user@example.com",
  "name": "Juan Pérez",
  "total": 5000,
  "deliveryType": "SHIPPING",
  "items": [...]
}

// Backend automáticamente:
// 1. Crea la Order con status PENDING_PAYMENT
// 2. Crea Payment con status PENDING y amount = order.total
// 3. Reduce stock de productos
// 4. NO envía email (se envía cuando pago es APPROVED)
```

**Archivo**: [orders.service.ts:102-110](../../orders/orders.service.ts#L102-L110)

```typescript
// Crear registro de Payment asociado a la orden
await tx.payment.create({
  data: {
    orderId: newOrder.id,
    paymentMethod: PaymentMethod.MERCADOPAGO,
    status: PaymentStatus.PENDING,
    amount: newOrder.total,
    currency: 'ARS',
  },
});
```

### 2. Generación de Preferencia (POST /api/payments/create-preference)

```typescript
// Frontend solicita preferencia de pago
POST /api/payments/create-preference
{
  "orderId": 123
}

// Backend responde con:
{
  "success": true,
  "data": {
    "preferenceId": "123456-abc-def",
    "initPoint": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=..."
  }
}

// Frontend redirige al usuario a initPoint
```

**Archivo**: [payments.controller.ts:20-39](./payments.controller.ts#L20-L39)

**Proceso interno**:

1. Valida que la orden existe y está en estado `PENDING_PAYMENT`
2. Verifica o crea el registro `Payment`
3. Llama a `MercadoPagoService.createPreference()`
4. Actualiza `Payment.preferenceId`
5. Retorna `preferenceId` e `initPoint` al frontend

### 3. Pago en Mercado Pago

```
Usuario completa el pago en la plataforma de Mercado Pago
  ↓
Mercado Pago procesa el pago
  ↓
Mercado Pago envía webhook a: POST /api/webhooks/mercadopago
  ↓
Backend procesa webhook y actualiza estado
```

### 4. Procesamiento de Webhook (POST /api/webhooks/mercadopago)

```typescript
// Mercado Pago envía notificación
POST /api/webhooks/mercadopago
{
  "action": "payment.updated",
  "type": "payment",
  "data": {
    "id": "123456789"  // ID del pago en Mercado Pago
  }
}

// Backend:
// 1. Valida webhook signature (opcional, por seguridad)
// 2. Consulta información del pago en MP API
// 3. Actualiza Payment.externalId y Payment.status
// 4. Sincroniza Order.status
// 5. Si status = APPROVED, envía email de confirmación
// 6. Retorna 200 OK
```

**Archivo**: [webhooks.controller.ts:15-47](./webhooks/webhooks.controller.ts#L15-L47)

### 5. Retorno al Frontend

```
Mercado Pago redirige al usuario:
  - Success: http://localhost:3000/checkout/success?payment_id=XXX&status=approved
  - Failure: http://localhost:3000/checkout/failure
  - Pending: http://localhost:3000/checkout/pending

Frontend puede consultar:
  GET /api/orders/:id para ver estado actualizado
  GET /api/payments/order/:orderId para ver información del pago
```

---

## Estructura del Módulo

```
src/payments/
├── payments.module.ts              # Módulo principal
├── payments.controller.ts          # Endpoints de pagos
├── payments.service.ts             # Lógica de negocio de pagos
│
├── mercadopago/                    # Submódulo de Mercado Pago
│   ├── mercadopago.service.ts      # Integración con MP SDK
│   ├── mercadopago.constants.ts    # Constantes y mapeos
│   └── dto/
│       ├── create-preference.dto.ts
│       └── webhook-notification.dto.ts
│
├── webhooks/                       # Submódulo de webhooks
│   ├── webhooks.controller.ts      # Endpoint para webhooks
│   └── webhooks.service.ts         # Procesamiento de webhooks
│
└── dto/
    ├── create-payment.dto.ts
    └── index.ts
```

---

## Servicios

### PaymentsService

**Responsabilidades**:
- Crear y actualizar registros de `Payment` en la base de datos
- Orquestar el flujo de pago con Mercado Pago
- Sincronizar estados entre `Payment` y `Order`
- Proveer métodos de consulta de pagos

**Métodos principales**:

#### `createPayment(orderId, paymentMethod)`
Crea un nuevo registro de pago asociado a una orden.

```typescript
const payment = await paymentsService.createPayment(123, PaymentMethod.MERCADOPAGO);
// Retorna: Payment { id, orderId, status: PENDING, amount, ... }
```

#### `initiateMercadoPagoPayment(orderId)`
Inicia el flujo de pago con Mercado Pago:

1. Valida que la orden existe y está en `PENDING_PAYMENT`
2. Crea o recupera el `Payment` existente
3. Genera preferencia en Mercado Pago
4. Actualiza `Payment.preferenceId`
5. Retorna `preferenceId` e `initPoint`

```typescript
const result = await paymentsService.initiateMercadoPagoPayment(123);
// Retorna: { preferenceId, initPoint, payment }
```

**Archivo**: [payments.service.ts:54-99](./payments.service.ts#L54-L99)

#### `updatePaymentStatus(externalId, status, metadata?)`
Actualiza el estado de un pago usando el `externalId` (ID de Mercado Pago).

**Idempotencia**: Si el pago ya tiene el mismo estado, no realiza actualización.

```typescript
const payment = await paymentsService.updatePaymentStatus(
  'MP123456',
  PaymentStatus.APPROVED,
  { mercadoPagoData: {...} }
);
```

**Archivo**: [payments.service.ts:101-137](./payments.service.ts#L101-L137)

#### `updatePaymentByOrderNumber(orderNumber, externalId, status, metadata?)`
Actualiza el pago usando el `orderNumber` (external_reference de MP).

Útil en webhooks donde Mercado Pago envía el `external_reference`.

**Archivo**: [payments.service.ts:139-184](./payments.service.ts#L139-L184)

#### `getPaymentByOrderId(orderId)`
Obtiene el pago asociado a una orden.

```typescript
const payment = await paymentsService.getPaymentByOrderId(123);
// Retorna: Payment con order incluido
```

#### `mapPaymentStatusToOrderStatus(paymentStatus)`
Mapea estados de `Payment` a estados de `Order`:

| PaymentStatus | OrderStatus |
|--------------|-------------|
| APPROVED | PENDING |
| REJECTED | CANCELLED |
| CANCELLED | CANCELLED |
| PENDING | PENDING_PAYMENT |
| IN_PROCESS | PENDING_PAYMENT |

**Archivo**: [payments.service.ts:218-230](./payments.service.ts#L218-L230)

---

### MercadoPagoService

**Responsabilidades**:
- Inicializar SDK de Mercado Pago
- Crear preferencias de pago
- Consultar información de pagos
- Validar firmas de webhooks (seguridad)

**Inicialización**:

```typescript
constructor(private configService: ConfigService) {
  const accessToken = this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN');

  this.client = new MercadoPagoConfig({ accessToken });
  this.preference = new Preference(this.client);
  this.payment = new Payment(this.client);
}
```

**Archivo**: [mercadopago.service.ts:15-30](./mercadopago/mercadopago.service.ts#L15-L30)

#### `createPreference(order)`
Crea una preferencia de pago en Mercado Pago.

**Estructura de la preferencia**:

```typescript
{
  items: [{
    id: order.orderNumber,
    title: `Orden #${order.orderNumber}`,
    quantity: 1,
    unit_price: order.total,
    currency_id: 'ARS'
  }],
  payer: {
    name: order.name,
    email: order.email,
    phone: { number: order.phone }
  },
  back_urls: {
    success: `${FRONTEND_URL}/checkout/success`,
    failure: `${FRONTEND_URL}/checkout/failure`,
    pending: `${FRONTEND_URL}/checkout/pending`
  },
  auto_return: 'approved',
  notification_url: `${BACKEND_URL}/api/webhooks/mercadopago`,
  external_reference: order.orderNumber,  // CLAVE: vincula con nuestra orden
  metadata: {
    order_id: order.id,
    delivery_type: order.deliveryType
  }
}
```

**Archivo**: [mercadopago.service.ts:32-96](./mercadopago/mercadopago.service.ts#L32-L96)

**Retorna**:
```typescript
{
  preferenceId: "123456-abc-def",
  initPoint: "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=..."
}
```

#### `getPayment(paymentId)`
Consulta información detallada de un pago desde la API de Mercado Pago.

```typescript
const paymentInfo = await mercadoPagoService.getPayment('MP123456');
// Retorna: objeto con status, external_reference, amount, payer, etc.
```

**Archivo**: [mercadopago.service.ts:98-116](./mercadopago/mercadopago.service.ts#L98-L116)

#### `validateWebhookSignature(body, signature)`
Valida la firma HMAC del webhook para evitar solicitudes fraudulentas.

**Algoritmo**:
```typescript
const hash = crypto
  .createHmac('sha256', MERCADOPAGO_WEBHOOK_SECRET)
  .update(JSON.stringify(body))
  .digest('hex');

return hash === signature;
```

**Archivo**: [mercadopago.service.ts:118-149](./mercadopago/mercadopago.service.ts#L118-L149)

---

### WebhooksService

**Responsabilidades**:
- Procesar notificaciones de webhooks de Mercado Pago
- Actualizar estados de `Payment` y `Order`
- Enviar email de confirmación cuando el pago es aprobado

#### `handleMercadoPagoNotification(data)`
Procesa la notificación de webhook de Mercado Pago.

**Flujo**:

1. Valida que `data.data.id` existe (ID del pago en MP)
2. Consulta información del pago desde MP API
3. Extrae `external_reference` (orderNumber) y `status`
4. Mapea estado de MP a `PaymentStatus`
5. Actualiza `Payment` usando `orderNumber`
6. Actualiza `Order.status` según el nuevo `PaymentStatus`
7. Si `status = APPROVED`, envía email de confirmación
8. Retorna `{ success: true }`

**Archivo**: [webhooks.service.ts:20-81](./webhooks/webhooks.service.ts#L20-L81)

**Idempotencia**:
- Si el pago ya tiene el estado recibido, no actualiza (evita procesamiento duplicado)
- Logs detallados en cada paso para debugging

#### `handlePaymentApproved(orderId)` (privado)
Envía email de confirmación de orden cuando el pago es aprobado.

```typescript
// Solo se ejecuta si PaymentStatus === APPROVED
await sendOrderConfirmationEmailUseCase.execute(order);
```

**Archivo**: [webhooks.service.ts:83-110](./webhooks/webhooks.service.ts#L83-L110)

**Importante**:
- Los errores al enviar email NO interrumpen el flujo del webhook
- Si falla el envío de email, se loggea el error pero el webhook retorna 200 OK

---

## Controladores

### PaymentsController

**Ruta base**: `/api/payments`

#### `POST /api/payments/create-preference`

Crea una preferencia de pago en Mercado Pago.

**Auth**: `OptionalJwtAuthGuard` (permite usuarios autenticados y anónimos)

**Request**:
```json
{
  "orderId": 123
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "preferenceId": "123456-abc-def",
    "initPoint": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=123456-abc-def"
  },
  "message": "Preferencia de pago creada exitosamente"
}
```

**Validaciones**:
- La orden debe existir
- La orden debe estar en estado `PENDING_PAYMENT`
- Si el usuario está autenticado, valida que la orden le pertenece (opcional, no implementado actualmente)

**Archivo**: [payments.controller.ts:20-39](./payments.controller.ts#L20-L39)

#### `GET /api/payments/:id`

Obtiene información de un pago por su ID.

**Auth**: `OptionalJwtAuthGuard`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "orderId": 123,
    "paymentMethod": "MERCADOPAGO",
    "externalId": "MP123456",
    "preferenceId": "123456-abc-def",
    "status": "APPROVED",
    "amount": 5000,
    "currency": "ARS",
    "createdAt": "2025-12-08T...",
    "order": { ... }
  }
}
```

**Archivo**: [payments.controller.ts:41-47](./payments.controller.ts#L41-L47)

#### `GET /api/payments/order/:orderId`

Obtiene el pago asociado a una orden específica.

**Auth**: `OptionalJwtAuthGuard`

**Response**: Igual que `GET /api/payments/:id`

**Archivo**: [payments.controller.ts:49-65](./payments.controller.ts#L49-L65)

---

### WebhooksController

**Ruta base**: `/api/webhooks`

#### `POST /api/webhooks/mercadopago`

Recibe notificaciones de webhooks de Mercado Pago.

**Auth**: `@Public()` (endpoint público, accesible sin autenticación)

**Headers**:
- `x-signature`: Firma HMAC del webhook (opcional, para validación)
- `x-request-id`: ID único de la notificación

**Request (ejemplo)**:
```json
{
  "action": "payment.updated",
  "type": "payment",
  "data": {
    "id": "123456789"
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

**Importante**:
- Siempre retorna 200 OK para que Mercado Pago no reintente
- Si hay error, loggea pero retorna `{ success: false, message: ... }`
- Logging exhaustivo de cada webhook recibido

**Archivo**: [webhooks.controller.ts:15-47](./webhooks/webhooks.controller.ts#L15-L47)

---

## Webhooks

### Tipos de Notificaciones

Mercado Pago envía dos tipos de notificaciones:

1. **payment**: Cambio de estado de un pago (más común)
2. **merchant_order**: Cambio en la orden de Mercado Pago (menos común)

Actualmente solo procesamos notificaciones de tipo `payment`.

### Estructura del Webhook

```json
{
  "action": "payment.created | payment.updated",
  "type": "payment",
  "data": {
    "id": "123456789"  // ID del pago en Mercado Pago
  },
  "date_created": "2025-12-08T12:00:00Z",
  "id": 123456,
  "live_mode": true,
  "user_id": "987654321"
}
```

### Mapeo de Estados

**Constante**: [mercadopago.constants.ts:11-18](./mercadopago/mercadopago.constants.ts#L11-L18)

```typescript
export const PAYMENT_STATUS_MAP: Record<string, PaymentStatus> = {
  approved: PaymentStatus.APPROVED,
  pending: PaymentStatus.PENDING,
  in_process: PaymentStatus.IN_PROCESS,
  rejected: PaymentStatus.REJECTED,
  cancelled: PaymentStatus.CANCELLED,
  refunded: PaymentStatus.REFUNDED,
};
```

### Flujo de Procesamiento

```
Webhook recibido
  ↓
1. Log del webhook completo
  ↓
2. Validar que data.data.id existe
  ↓
3. Consultar MP API: GET /v1/payments/{id}
  ↓
4. Extraer external_reference (orderNumber)
  ↓
5. Mapear status de MP a PaymentStatus
  ↓
6. Actualizar Payment.externalId y Payment.status
  ↓
7. Actualizar Order.status según mapeo
  ↓
8. Si APPROVED → Enviar email
  ↓
9. Retornar 200 OK
```

### Idempotencia

**Problema**: Mercado Pago puede enviar el mismo webhook múltiples veces.

**Solución**: Antes de actualizar, verificamos si el estado ya es el mismo:

```typescript
if (payment.status === status) {
  this.logger.log(`Payment already has status ${status}, skipping update`);
  return payment;  // No actualizar
}
```

**Archivo**: [payments.service.ts:116-121](./payments.service.ts#L116-L121)

### Seguridad

#### Validación de Firma (Opcional)

Mercado Pago envía header `x-signature` con firma HMAC SHA-256 del payload.

```typescript
const isValid = mercadoPagoService.validateWebhookSignature(body, signature);

if (!isValid) {
  throw new UnauthorizedException('Invalid webhook signature');
}
```

**Nota**: Actualmente NO está implementado en el webhook controller por simplicidad del MVP, pero el método existe y está disponible.

#### IP Whitelisting (Futuro)

Para producción, se recomienda validar que los webhooks vengan de IPs oficiales de Mercado Pago.

---

## Estados de Pago

### PaymentStatus → OrderStatus Mapping

| PaymentStatus | Descripción | OrderStatus | Acción |
|--------------|-------------|-------------|--------|
| `PENDING` | Pago pendiente de procesamiento | `PENDING_PAYMENT` | Esperar |
| `IN_PROCESS` | Pago en proceso (MP) | `PENDING_PAYMENT` | Esperar |
| `APPROVED` | Pago aprobado | `PENDING` | Enviar email, procesar orden |
| `REJECTED` | Pago rechazado por MP | `CANCELLED` | Notificar usuario |
| `CANCELLED` | Pago cancelado por usuario | `CANCELLED` | Notificar usuario |
| `REFUNDED` | Pago reembolsado | `CANCELLED` | Notificar usuario |

### Ciclo de Vida de un Payment

```
PENDING (creación de orden)
  ↓
PENDING (generación de preferencia)
  ↓
IN_PROCESS (usuario pagando en MP)
  ↓
APPROVED / REJECTED / CANCELLED (webhook de MP)
```

---

## Configuración

### Variables de Entorno

**Requeridas** en `.env`:

```env
# Mercado Pago Configuration
MERCADOPAGO_ACCESS_TOKEN=TEST-XXXXXXXXXXXXXXXXXX
MERCADOPAGO_PUBLIC_KEY=TEST-XXXXXXXXXXXXXXXXXX
MERCADOPAGO_WEBHOOK_SECRET=your-webhook-secret-key

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001
```

### Obtener Credenciales de Mercado Pago

1. **Crear cuenta en Mercado Pago Developers**: https://www.mercadopago.com.ar/developers
2. **Crear aplicación**:
   - Ir a "Tus integraciones"
   - Crear nueva aplicación
   - Tipo: "Pagos online"
   - Solución: "Checkout Pro"
3. **Obtener credenciales de TEST**:
   - Navegar a la aplicación creada
   - Ir a "Credenciales de prueba"
   - Copiar `Access Token` y `Public Key`

### Configurar Webhook URL

En el panel de Mercado Pago:
1. Ir a "Tus integraciones" → Tu aplicación
2. Configurar "URL de notificaciones"
3. Para desarrollo local, usar **ngrok**:
   ```bash
   ngrok http 3001
   # Usar URL de ngrok: https://abc123.ngrok.io/api/webhooks/mercadopago
   ```
4. Para producción, usar URL del servidor

---

## Testing

### 1. Testing Local

#### Tarjetas de Prueba

Mercado Pago provee tarjetas de prueba para simular pagos:

| Tarjeta | Número | CVV | Fecha | Resultado |
|---------|--------|-----|-------|-----------|
| Visa | 4509 9535 6623 3704 | 123 | 11/25 | Aprobado |
| Mastercard | 5031 7557 3453 0604 | 123 | 11/25 | Aprobado |
| Visa | 4074 0000 0000 0004 | 123 | 11/25 | Rechazado |

**Más tarjetas**: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards

#### Usuarios de Prueba

Crear usuarios de prueba en: https://www.mercadopago.com.ar/developers/panel/test-users

```json
{
  "email": "test_user_123456@testuser.com",
  "password": "Tu contraseña configurada"
}
```

### 2. Testing de Webhooks Localmente

#### Opción 1: ngrok (Recomendado)

```bash
# Instalar ngrok
npm install -g ngrok

# Exponer puerto local
ngrok http 3001

# Configurar URL de webhook en MP
https://abc123.ngrok.io/api/webhooks/mercadopago
```

#### Opción 2: Webhook.site (Para Debugging)

1. Ir a https://webhook.site/
2. Copiar URL única generada
3. Configurar en MP como notification_url
4. Verificar payload que envía MP
5. Luego simular webhook llamando a tu endpoint local

### 3. Flujo de Testing Completo

```bash
# 1. Crear orden
POST http://localhost:3001/api/orders
{
  "email": "test@test.com",
  "name": "Test User",
  "total": 1000,
  "deliveryType": "SHIPPING",
  "items": [...]
}
# Respuesta: { order: { id: 123, orderNumber: "abc123", ... } }

# 2. Crear preferencia
POST http://localhost:3001/api/payments/create-preference
{
  "orderId": 123
}
# Respuesta: { preferenceId, initPoint }

# 3. Abrir initPoint en navegador
# 4. Pagar con tarjeta de prueba
# 5. Mercado Pago envía webhook automáticamente

# 6. Verificar estado actualizado
GET http://localhost:3001/api/orders/123
# Respuesta: { order: { status: "PENDING", payment: { status: "APPROVED" } } }

# 7. Verificar email enviado (Mailtrap)
```

### 4. Simulación Manual de Webhook

```bash
# Para testing sin MP, simular webhook manualmente
POST http://localhost:3001/api/webhooks/mercadopago
{
  "action": "payment.updated",
  "type": "payment",
  "data": {
    "id": "TEST123"
  }
}

# Nota: Requiere que exista un pago en MP con ese ID
# o modificar código para testing
```

---

## Troubleshooting

### Problema: Webhook no llega

**Causas posibles**:
1. URL de webhook incorrecta en configuración de MP
2. ngrok no está corriendo
3. Backend no está corriendo
4. Firewall bloqueando requests

**Solución**:
- Verificar URL en panel de MP
- Verificar logs de ngrok: ver si llega request
- Verificar logs del backend: `WebhooksController`
- Usar webhook.site para verificar payload de MP

### Problema: Payment no se actualiza

**Causas posibles**:
1. `external_reference` no coincide con `orderNumber`
2. Error al consultar pago en MP API
3. Token de MP inválido

**Solución**:
- Verificar logs: buscar error al consultar MP API
- Verificar que `external_reference` en preferencia = `order.orderNumber`
- Verificar credenciales de MP en `.env`

### Problema: Email de confirmación no se envía

**Causas posibles**:
1. Error en `SendOrderConfirmationEmailUseCase`
2. Credenciales de Mailtrap incorrectas
3. Error al obtener orden completa

**Solución**:
- Verificar logs: buscar error en `handlePaymentApproved`
- Verificar que orden existe y tiene items
- Verificar credenciales de Mailtrap en `.env`
- **Importante**: Error de email NO interrumpe webhook (retorna 200 OK)

### Problema: Estado de pago no cambia de PENDING

**Causas posibles**:
1. Webhook no llega
2. Error en mapeo de estados
3. Pago no fue aprobado en MP

**Solución**:
- Verificar en panel de MP si el pago fue aprobado
- Verificar logs de webhook: ver si llegó notificación
- Consultar directamente: `GET /api/payments/order/:orderId`
- Verificar `PAYMENT_STATUS_MAP` tiene el estado de MP

### Debugging

#### Logs a revisar

```bash
# Logs de creación de preferencia
[PaymentsService] MercadoPago preference created for order 123: preference-id

# Logs de webhook
[WebhooksController] Webhook received - Request ID: xxx
[WebhooksController] Webhook body: {...}
[WebhooksService] Processing MercadoPago webhook notification: {...}
[WebhooksService] Payment info from MercadoPago: {...}
[PaymentsService] Payment 123 status updated from PENDING to APPROVED
[OrdersService] Order 123 status updated to PENDING

# Logs de email
[WebhooksService] Sending order confirmation email for order abc123
[WebhooksService] Order confirmation email sent successfully
```

#### Verificar estado en base de datos

```sql
-- Ver payment de una orden
SELECT * FROM "Payment" WHERE "orderId" = 123;

-- Ver orden con payment
SELECT o.*, p.* FROM "Order" o
LEFT JOIN "Payment" p ON p."orderId" = o.id
WHERE o.id = 123;

-- Ver últimos payments
SELECT * FROM "Payment" ORDER BY "createdAt" DESC LIMIT 10;
```

---

## Extensibilidad: Agregar Nuevos Métodos de Pago

El sistema está diseñado para soportar múltiples métodos de pago.

### 1. Agregar nuevo PaymentMethod

```prisma
enum PaymentMethod {
  MERCADOPAGO
  STRIPE        // Nuevo
  TRANSFERENCIA // Nuevo
}
```

### 2. Crear servicio específico

```typescript
// src/payments/stripe/stripe.service.ts
@Injectable()
export class StripeService {
  async createPaymentIntent(order: Order) {
    // Implementación con Stripe SDK
  }
}
```

### 3. Actualizar PaymentsService

```typescript
async initiatePayment(orderId: number, method: PaymentMethod) {
  switch (method) {
    case PaymentMethod.MERCADOPAGO:
      return this.initiateMercadoPagoPayment(orderId);
    case PaymentMethod.STRIPE:
      return this.initiateStripePayment(orderId);
    // ...
  }
}
```

### 4. Crear webhook específico

```typescript
// src/payments/webhooks/stripe-webhooks.controller.ts
@Post('stripe')
@Public()
async handleStripeWebhook(@Body() body: any) {
  // Procesar webhook de Stripe
}
```

---

## Referencias

### Documentación Oficial
- [Mercado Pago Developers](https://www.mercadopago.com.ar/developers)
- [Checkout Pro Docs](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro)
- [Webhooks Guide](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/your-integrations/notifications/webhooks)
- [SDK Node.js](https://github.com/mercadopago/sdk-nodejs)

### Testing
- [Tarjetas de Prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards)
- [Usuarios de Prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-users)

### Herramientas
- [ngrok](https://ngrok.com/) - Túnel para webhooks locales
- [Webhook.site](https://webhook.site/) - Debugging de webhooks
- [Postman](https://www.postman.com/) - Testing de APIs

---

## Notas Finales

### Mejoras Futuras

1. **Queue System**: Procesar webhooks en cola (Bull/BullMQ) para mejor escalabilidad
2. **Retry Logic**: Reintentar actualización si webhook falla
3. **Rate Limiting**: Limitar requests al endpoint de webhook
4. **IP Whitelisting**: Validar IPs de Mercado Pago
5. **Webhook Signature**: Implementar validación obligatoria en producción
6. **Monitoring**: Métricas de tasa de aprobación/rechazo
7. **Alerting**: Notificaciones si webhooks fallan repetidamente

### Consideraciones de Producción

- **Credenciales**: Usar credenciales de PRODUCCIÓN en `.env`
- **HTTPS**: Backend debe usar HTTPS para webhooks
- **Logging**: Configurar log level apropiado (no DEBUG en prod)
- **Secrets Rotation**: Rotar `WEBHOOK_SECRET` periódicamente
- **Monitoring**: Monitorear tiempos de respuesta de MP API
- **Backup**: Guardar webhooks raw en tabla para auditoría

---

**Documento creado**: 2025-12-08
**Versión**: 1.0
**Mantenido por**: Equipo de Backend
**Última actualización**: 2025-12-08
