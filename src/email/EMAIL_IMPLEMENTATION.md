# Implementación de Sistema de Emails con Mailtrap

## Resumen

Se ha implementado un sistema de emails modular y escalable usando **Mailtrap** como proveedor de envío. La arquitectura permite el envío de emails de confirmación de compra y está preparada para agregar otros tipos de emails en el futuro.

## Estructura Implementada

```
src/email/
├── email.controller.ts              # Controlador con endpoint de prueba
├── email.module.ts                  # Módulo de email
├── email.service.ts                 # Servicio principal de email
├── mailtrap.service.ts              # Servicio de integración con Mailtrap
├── constants/
│   └── email.constants.ts           # Constantes de templates
├── dto/
│   ├── index.ts
│   └── send-test-email.dto.ts       # DTO para endpoint de prueba
└── use-cases/
    └── send-order-confirmation-email.use-case.ts  # Use case para confirmación de compra
```

## Características

- ✅ Integración con Mailtrap v4.2.0
- ✅ Envío individual de emails
- ✅ Soporte para envío en lotes (batch)
- ✅ Envío automático de email de confirmación al crear una orden
- ✅ Endpoint de prueba para validar la integración
- ✅ Manejo de errores sin interrumpir el flujo
- ✅ Logging detallado
- ✅ Arquitectura modular lista para agregar más tipos de emails

## Variables de Entorno Requeridas

Asegúrate de que tu archivo `.env` contenga:

```env
MAILTRAP_TOKEN=tu_token_de_mailtrap
MAILTRAP_SENDER_EMAIL=tu_email@latinvm.com
```

Estas variables ya están agregadas en `.env.example`.

## Configuración de Templates

Actualmente, el proyecto tiene configurado el template para:

- **ORDER_CONFIRMATION**: Email de confirmación de compra (UUID pendiente)

Para agregar el UUID del template:

1. Ve a [Mailtrap Dashboard](https://mailtrap.io)
2. Copia el UUID del template de confirmación de compra
3. Abre `src/email/constants/email.constants.ts`
4. Reemplaza el valor vacío en `ORDER_CONFIRMATION.uuid`:

```typescript
ORDER_CONFIRMATION: {
  uuid: 'tu-uuid-aqui', // ← Agregar el UUID
  name: 'ORDER_CONFIRMATION',
  maxRetries: 3,
},
```

## Usar el Endpoint de Prueba

Para verificar que la integración funciona correctamente, envía un POST a:

```
POST /api/email/test/send-order-confirmation
```

### Body (JSON):

```json
{
  "to": "cliente@example.com",
  "templateVariables": {
    "orderNumber": "#ORD-2024-001",
    "customerName": "Juan Pérez",
    "total": 15999.99,
    "itemsCount": 3
  }
}
```

### Parámetros opcionales:

- `templateVariables`: Opcional. Datos del template. Si no se proporciona, se usan valores por defecto.

### Respuesta exitosa:

```json
{
  "message": "Email de confirmación de compra enviado exitosamente",
  "email": "cliente@example.com"
}
```

## Flujo Automático de Email en Órdenes

Cuando se crea una orden mediante `POST /api/orders`:

1. **OrdersController** crea la orden
2. **SendOrderConfirmationEmailUseCase** se ejecuta automáticamente
3. **EmailService** envía el email usando el template configurado
4. Si hay error al enviar, se registra pero **NO interrumpe** el flujo de creación de orden
5. El carrito se vacía como habitualmente

## Variables de Template Disponibles

Cuando se envía un email de confirmación de compra, están disponibles las siguientes variables:

```typescript
{
  orderNumber: string;      // Número único de la orden (ej: "ORD-2024-001")
  customerName: string;     // Nombre del cliente
  email: string;            // Email del cliente
  total: number;            // Total de la orden
  deliveryPrice: number;    // Costo de envío
  deliveryType: string;     // SHIPPING o PICKUP
  status: string;           // Estado de la orden
  createdAt: Date;          // Fecha de creación
  itemsCount: number;       // Cantidad de items en la orden
}
```

## Agregar Nuevos Tipos de Emails

Para agregar un nuevo tipo de email (ej: confirmación de usuario, recuperación de contraseña):

### 1. Agregar constante de template

En `src/email/constants/email.constants.ts`:

```typescript
export const EMAIL_TEMPLATES = {
  ORDER_CONFIRMATION: { /* ... */ },
  USER_CONFIRM_EMAIL: {
    uuid: 'uuid-del-template',
    name: 'USER_CONFIRM_EMAIL',
    maxRetries: 3,
  },
  // ... agregar más templates
};
```

### 2. Crear método en EmailService

En `src/email/email.service.ts`:

```typescript
async sendUserConfirmationEmail(
  email: string,
  templateVariables: Record<string, any>,
): Promise<void> {
  await this.sendTemplateEmail({
    to: [{ email }],
    templateKey: 'USER_CONFIRM_EMAIL',
    templateVariables,
  });
}
```

### 3. Crear use case (opcional)

```typescript
@Injectable()
export class SendUserConfirmationEmailUseCase {
  constructor(private emailService: EmailService) {}

  async execute(user: User): Promise<void> {
    await this.emailService.sendUserConfirmationEmail(
      user.email,
      { /* variables */ },
    );
  }
}
```

### 4. Agregar a exports del módulo

En `src/email/email.module.ts`:

```typescript
@Module({
  // ...
  exports: [
    EmailService,
    SendOrderConfirmationEmailUseCase,
    SendUserConfirmationEmailUseCase, // ← Agregar
  ],
})
export class EmailModule {}
```

## Envío en Lotes

Para enviar múltiples emails a la vez (ej: notificación a todos los usuarios):

```typescript
const result = await this.emailService.sendBatchEmails(
  [
    {
      email: 'usuario1@example.com',
      name: 'Usuario 1',
      templateVariables: { /* ... */ },
    },
    {
      email: 'usuario2@example.com',
      name: 'Usuario 2',
      templateVariables: { /* ... */ },
    },
    // ... más usuarios
  ],
  'ORDER_CONFIRMATION', // templateKey
);

console.log(`Enviados: ${result.sent}, Fallidos: ${result.failed}`);
```

**Nota:** Mailtrap recomienda máximo 20 emails por lote. El sistema maneja automáticamente lotes más grandes dividiéndolos.

## Logging

El sistema registra:

- ✅ Emails enviados exitosamente
- ❌ Errores en envío de emails
- ℹ️ Información de procesos batch

Ver logs en la consola o en los archivos de log configurados en NestJS.

## Testing

Para probar la implementación sin enviar emails reales:

### 1. Mock del servicio en tests

```typescript
const module: TestingModule = await Test.createTestingModule({
  providers: [
    EmailService,
    {
      provide: MailtrapService,
      useValue: {
        sendTemplateEmail: jest.fn().mockResolvedValue({ id: '123' }),
      },
    },
  ],
}).compile();
```

### 2. Usar Mailtrap Sandbox

Mailtrap proporciona un inbox de prueba donde puedes ver todos los emails enviados sin realmente entregarlos a usuarios reales.

## Limitaciones y Consideraciones

1. **UUID de template requerido**: No se puede enviar un email sin configurar el UUID del template en Mailtrap
2. **Sin interrupciones**: Si falla el envío de email, la orden se crea igualmente (falla silenciosa con logging)
3. **Rate limiting**: Entre lotes hay una pausa de 1 segundo para evitar throttling de Mailtrap
4. **Batch size**: Máximo 20 emails por lote (límite de Mailtrap)

## Cambios Realizados

### Nuevos archivos:
- `src/email/email.controller.ts`
- `src/email/email.service.ts`
- `src/email/mailtrap.service.ts`
- `src/email/email.module.ts`
- `src/email/constants/email.constants.ts`
- `src/email/dto/send-test-email.dto.ts`
- `src/email/dto/index.ts`
- `src/email/use-cases/send-order-confirmation-email.use-case.ts`

### Archivos modificados:
- `src/app.module.ts`: Importado EmailModule
- `src/orders/orders.module.ts`: Importado EmailModule
- `src/orders/orders.controller.ts`: Integración de envío de email
- `.env.example`: Agregadas variables de Mailtrap

## Próximos Pasos

1. ✅ Instalar dependencias: `npm install mailtrap`
2. ✅ Configurar variables de entorno
3. ⏳ Crear template de confirmación de compra en Mailtrap
4. ⏳ Agregar UUID del template en `email.constants.ts`
5. ⏳ Probar con el endpoint `/api/email/test/send-order-confirmation`
6. ⏳ Validar que el email se envíe correctamente

## Referencias

- [Documentación de Mailtrap](https://mailtrap.io/docs)
- [Cliente NPM de Mailtrap](https://www.npmjs.com/package/mailtrap)
- [NestJS Modules](https://docs.nestjs.com/modules)
- [NestJS Services](https://docs.nestjs.com/providers)
