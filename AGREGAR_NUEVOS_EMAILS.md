# Guía: Agregar Nuevos Tipos de Emails

Este documento explica paso a paso cómo agregar nuevos tipos de emails al sistema (confirmación de usuario, recuperación de contraseña, etc.).

## Estructura General

El sistema de emails está dividido en capas:

```
1. Constants (email.constants.ts)
   ↓
2. EmailService (email.service.ts)
   ↓
3. Use Cases (send-*.use-case.ts)
   ↓
4. Controllers o Services (donde se llama el use case)
```

## Paso a Paso: Agregar un Nuevo Email

Usaremos como ejemplo **"Email de Bienvenida"** (cuando un usuario se registra).

### Paso 1: Crear el Template en Mailtrap

1. Ve a [Mailtrap Dashboard](https://mailtrap.io)
2. Haz clic en **"Email Templates"** o **"Templates"**
3. Crea un nuevo template llamado **"Bienvenida"** o **"Welcome Email"**
4. Agrega el HTML del template con las variables que necesites
5. Copia el **UUID** del template (te lo proporciona Mailtrap)

**Ejemplo de variables útiles en el template:**
```
- {{userName}}: Nombre del usuario
- {{userEmail}}: Email del usuario
- {{confirmLink}}: Link para confirmar email
- {{createdAt}}: Fecha de registro
```

---

### Paso 2: Agregar la Constante del Template

Abre `src/email/constants/email.constants.ts`:

```typescript
export const EMAIL_TEMPLATES = {
  ORDER_CONFIRMATION: {
    uuid: 'uuid-existente-aqui',
    name: 'ORDER_CONFIRMATION',
    maxRetries: 3,
  },
  // ← AGREGAR AQUÍ
  WELCOME_EMAIL: {
    uuid: 'tu-uuid-de-mailtrap-aqui', // Copia el UUID de Mailtrap
    name: 'WELCOME_EMAIL',
    maxRetries: 3,
  },
};
```

---

### Paso 3: Agregar Método en EmailService

Abre `src/email/email.service.ts` y agrega un método específico para este tipo de email:

```typescript
/**
 * Envía email de bienvenida al usuario
 */
async sendWelcomeEmail(
  email: string,
  userName: string,
  confirmLink: string,
): Promise<void> {
  await this.sendTemplateEmail({
    to: [{ email, name: userName }],
    templateKey: 'WELCOME_EMAIL',
    templateVariables: {
      userName,
      userEmail: email,
      confirmLink,
      createdAt: new Date().toLocaleDateString('es-ES'),
    },
  });
}
```

**Notas:**
- El método recibe los parámetros específicos que necesita
- Construye un objeto `templateVariables` con todas las variables del template
- Llama a `sendTemplateEmail()` internamente

---

### Paso 4: Crear un Use Case (Opcional pero Recomendado)

Crea `src/email/use-cases/send-welcome-email.use-case.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../email.service';
import { User } from '@prisma/client';

@Injectable()
export class SendWelcomeEmailUseCase {
  private readonly logger = new Logger(SendWelcomeEmailUseCase.name);

  constructor(private emailService: EmailService) {}

  /**
   * Envía email de bienvenida cuando un usuario se registra
   */
  async execute(
    user: User,
    confirmLink: string,
  ): Promise<void> {
    try {
      await this.emailService.sendWelcomeEmail(
        user.email,
        user.name,
        confirmLink,
      );

      this.logger.log(
        `Welcome email sent to ${user.email} for user ${user.name}`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending welcome email to ${user.email}: ${error instanceof Error ? error.message : String(error)}`,
      );
      // No lanzar excepción para no interrumpir el flujo de registro
    }
  }
}
```

**¿Por qué un Use Case?**
- Centraliza la lógica de negocio
- Es fácil de testear
- Es reutilizable desde múltiples controladores o servicios
- Sigue el patrón de la arquitectura existente

---

### Paso 5: Actualizar el Módulo de Email

Abre `src/email/email.module.ts` y agrega el nuevo use case:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { MailtrapService } from './mailtrap.service';
import { EmailController } from './email.controller';
import { SendOrderConfirmationEmailUseCase } from './use-cases/send-order-confirmation-email.use-case';
import { SendWelcomeEmailUseCase } from './use-cases/send-welcome-email.use-case'; // ← AGREGAR

@Module({
  imports: [ConfigModule],
  providers: [
    MailtrapService,
    EmailService,
    SendOrderConfirmationEmailUseCase,
    SendWelcomeEmailUseCase, // ← AGREGAR
  ],
  controllers: [EmailController],
  exports: [
    EmailService,
    SendOrderConfirmationEmailUseCase,
    SendWelcomeEmailUseCase, // ← AGREGAR
  ],
})
export class EmailModule {}
```

---

### Paso 6: Importar el Use Case Donde lo Necesites

Por ejemplo, en `src/auth/auth.service.ts` (si es donde se registran los usuarios):

```typescript
import { SendWelcomeEmailUseCase } from '../email/use-cases/send-welcome-email.use-case';

@Injectable()
export class AuthService {
  constructor(
    // ... otros servicios
    private sendWelcomeEmailUseCase: SendWelcomeEmailUseCase,
  ) {}

  async register(registerDto: RegisterDto): Promise<User> {
    // Crear el usuario
    const user = await this.usersService.create(registerDto);

    // Generar link de confirmación (ejemplo)
    const confirmLink = `${process.env.FRONTEND_URL}/confirm-email?token=${user.id}`;

    // Enviar email de bienvenida
    try {
      await this.sendWelcomeEmailUseCase.execute(user, confirmLink);
    } catch (error) {
      console.error('Error enviando email de bienvenida:', error);
      // No interrumpir el flujo
    }

    return user;
  }
}
```

---

## Ejemplos de Otros Emails Comunes

### Email de Recuperación de Contraseña

#### 1. Constante
```typescript
PASSWORD_RECOVERY: {
  uuid: 'uuid-de-mailtrap',
  name: 'PASSWORD_RECOVERY',
  maxRetries: 3,
},
```

#### 2. Método en EmailService
```typescript
async sendPasswordRecoveryEmail(
  email: string,
  resetLink: string,
  expiresIn: string = '1 hora',
): Promise<void> {
  await this.sendTemplateEmail({
    to: [{ email }],
    templateKey: 'PASSWORD_RECOVERY',
    templateVariables: {
      email,
      resetLink,
      expiresIn,
    },
  });
}
```

#### 3. Use Case
```typescript
@Injectable()
export class SendPasswordRecoveryEmailUseCase {
  constructor(private emailService: EmailService) {}

  async execute(user: User, resetLink: string): Promise<void> {
    await this.emailService.sendPasswordRecoveryEmail(user.email, resetLink);
  }
}
```

---

### Email de Confirmación de Email

#### 1. Constante
```typescript
CONFIRM_EMAIL: {
  uuid: 'uuid-de-mailtrap',
  name: 'CONFIRM_EMAIL',
  maxRetries: 3,
},
```

#### 2. Método en EmailService
```typescript
async sendConfirmEmailVerification(
  email: string,
  confirmLink: string,
): Promise<void> {
  await this.sendTemplateEmail({
    to: [{ email }],
    templateKey: 'CONFIRM_EMAIL',
    templateVariables: {
      email,
      confirmLink,
      expiresIn: '24 horas',
    },
  });
}
```

---

### Email de Notificación de Pedido Enviado

#### 1. Constante
```typescript
ORDER_SHIPPED: {
  uuid: 'uuid-de-mailtrap',
  name: 'ORDER_SHIPPED',
  maxRetries: 3,
},
```

#### 2. Método en EmailService
```typescript
async sendOrderShippedEmail(
  email: string,
  orderNumber: string,
  trackingNumber: string,
  trackingUrl: string,
): Promise<void> {
  await this.sendTemplateEmail({
    to: [{ email }],
    templateKey: 'ORDER_SHIPPED',
    templateVariables: {
      orderNumber,
      trackingNumber,
      trackingUrl,
      estimatedDelivery: 'Dentro de 5-7 días hábiles',
    },
  });
}
```

---

## Resumen Rápido

### Para agregar un nuevo email necesitas:

1. ✅ **Template en Mailtrap** con UUID
2. ✅ **Constante en `email.constants.ts`** con el UUID
3. ✅ **Método en `email.service.ts`** para enviar el email
4. ✅ **Use Case en `src/email/use-cases/`** (recomendado)
5. ✅ **Registrar el Use Case en `email.module.ts`**
6. ✅ **Importar y usar en el servicio/controlador correspondiente**

---

## Pruebas

### Probar un Email sin Crear un Registro

Si quieres probar tu nuevo email sin tener que hacer todo el flujo (ej: sin registrar un usuario):

**Opción 1: Agregar un endpoint de prueba**

En `src/email/email.controller.ts`:

```typescript
@Post('test/send-welcome')
async sendTestWelcome(
  @Body() sendTestEmailDto: SendTestEmailDto,
): Promise<{ message: string; email: string }> {
  await this.emailService.sendWelcomeEmail(
    sendTestEmailDto.to,
    'Test User',
    'https://example.com/confirm',
  );

  return {
    message: 'Email de bienvenida enviado exitosamente',
    email: sendTestEmailDto.to,
  };
}
```

Luego:
```bash
POST /api/email/test/send-welcome
{
  "to": "tu-email@example.com"
}
```

**Opción 2: Usar Postman o similar**

Llamar directamente al servicio inyectado en un endpoint temporal.

---

## Mejores Prácticas

### 1. **Manejo de Errores**
```typescript
try {
  await this.sendWelcomeEmailUseCase.execute(user, confirmLink);
} catch (error) {
  // Loguear pero no interrumpir el flujo
  console.error('Email error:', error);
}
```

### 2. **Variables Seguras**
```typescript
// ✅ Bueno: Variables necesarias solamente
templateVariables: {
  userName: user.name,
  confirmLink: generateSecureToken(),
}

// ❌ Malo: Exponer datos sensibles
templateVariables: {
  ...user, // No incluir contraseña, etc.
}
```

### 3. **Logging**
```typescript
this.logger.log(`Email sent to ${email}`);
this.logger.error(`Error sending email: ${error.message}`);
```

### 4. **Reutilización**
Si varios emails necesitan el mismo servicio, crea un método en `EmailService`:

```typescript
// En EmailService
async sendEmailToUser(
  userId: string,
  templateKey: keyof typeof EMAIL_TEMPLATES,
  customVariables: Record<string, any>,
): Promise<void> {
  const user = await this.prisma.user.findUnique({ where: { id: userId } });
  // ... enviar con variables personalizadas
}
```

---

## Checklist para Agregar un Nuevo Email

- [ ] Crear template en Mailtrap
- [ ] Copiar UUID del template
- [ ] Agregar constante en `email.constants.ts`
- [ ] Crear método en `email.service.ts`
- [ ] Crear use case en `src/email/use-cases/`
- [ ] Registrar use case en `email.module.ts`
- [ ] Importar use case donde se necesita
- [ ] Llamar al use case en el flujo correcto
- [ ] Probar con endpoint de prueba o flujo real
- [ ] Verificar en Mailtrap inbox que se recibió

---

## Estructura Final de Carpetas

```
src/email/
├── email.controller.ts
├── email.module.ts
├── email.service.ts
├── mailtrap.service.ts
├── constants/
│   └── email.constants.ts
├── dto/
│   ├── index.ts
│   └── send-test-email.dto.ts
└── use-cases/
    ├── send-order-confirmation-email.use-case.ts
    ├── send-welcome-email.use-case.ts
    ├── send-password-recovery-email.use-case.ts
    ├── send-confirm-email-verification.use-case.ts
    └── send-order-shipped-email.use-case.ts
```

---

## Debugging

Si un email no se envía:

1. **Verificar UUID**: ¿El UUID en `email.constants.ts` es correcto?
   ```typescript
   ORDER_CONFIRMATION: {
     uuid: '', // ← ¿Está vacío?
   }
   ```

2. **Verificar variables**: ¿Las variables del template existen en `templateVariables`?
   ```typescript
   // Template espera {{orderNumber}}
   // Pero enviaste {{orderNum}} ← Error
   ```

3. **Revisar logs**: Busca en la consola:
   ```
   Error sending email: Template UUID not configured
   Error sending email: Cannot find module 'mailtrap'
   ```

4. **Variables de entorno**: ¿Están configuradas?
   ```bash
   echo $MAILTRAP_TOKEN
   echo $MAILTRAP_SENDER_EMAIL
   ```

5. **Mailtrap Dashboard**: ¿El email aparece en el inbox de prueba?

---

## Referencias

- [Documentación EmailService](./src/email/email.service.ts)
- [Estructura de Constants](./src/email/constants/email.constants.ts)
- [Ejemplo de Use Case](./src/email/use-cases/send-order-confirmation-email.use-case.ts)
- [Documentación Mailtrap](https://mailtrap.io/docs)
