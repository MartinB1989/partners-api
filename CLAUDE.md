# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **NestJS backend** for a marketplace platform (similar to Mercado Libre). Phase 1 focuses on core functionality where users can register, create profiles, upload products, and sell. Phase 2 will introduce an affiliate system. The application is Argentina-focused with ARS as the currency.

**Tech Stack:**
- Framework: NestJS (TypeScript)
- Database: Prisma ORM with PostgreSQL
- Authentication: JWT with Passport
- Cloud Storage: AWS S3
- Email Service: Mailtrap
- API Documentation: Swagger/OpenAPI

## Development Commands

### Install & Setup
```bash
npm install                    # Install dependencies
npm run db:seed               # Seed database with initial data
npm run fix:lineendings       # Fix line endings (LF) across project
```

### Development
```bash
npm run start                 # Run server (production mode)
npm run start:dev             # Run server with hot reload
npm run start:debug           # Run with Node debugger
```

### Building & Deployment
```bash
npm run build                 # Compile TypeScript to dist/
npm run start:prod            # Run compiled application (node dist/main)
```

### Testing
```bash
npm run test                  # Run all unit tests (*.spec.ts)
npm run test:watch            # Run tests in watch mode
npm run test:cov              # Generate coverage report
npm run test:debug            # Debug tests with Node inspector
npm run test:e2e              # Run end-to-end tests
```

### Code Quality
```bash
npm run lint                  # Run ESLint and fix issues
npm run format                # Format code with Prettier
```

## Architecture Overview

### Modular Structure
The application uses NestJS modular architecture with these core modules:
- **Auth**: JWT authentication, login/register, role-based access
- **Users**: User profiles and management
- **Products**: Product CRUD with S3 images, dimensions (SKU, weight, height, width, length), categories
- **Categories**: Hierarchical category system (3-level max) with parent-child relationships
- **Carts**: Shopping cart management with session-based (anonymous) and user-based tracking
- **Orders**: Order creation with stock validation, unique order number generation, pagination, email notifications
- **PickupAddresses**: Seller pickup locations with geolocation (latitude/longitude) support
- **Email**: Mailtrap integration for order confirmation emails, template-based batch sending
- **AWS**: S3 integration with presigned URLs for client-side uploads
- **Prisma**: Database ORM service (shared across modules)

### Data Flow
1. **Controllers** (`*.controller.ts`): HTTP route handlers, request parsing, validation
2. **Services** (`*.service.ts`): Business logic, database operations via Prisma, transactions
3. **DTOs** (`dto/`): Request/response validation using class-validator decorators
4. **Prisma Models** (`prisma/schema.prisma`): Database schema and relationships

### Key Design Patterns
- **Repository Pattern**: Data access through Prisma service
- **Dependency Injection**: NestJS-managed service injection
- **Guards**: Authentication (`JwtAuthGuard`), role-based access (`RolesGuard`), optional auth (`OptionalJwtAuthGuard`)
- **Decorators**: `@Public()`, `@CurrentUser()`, `@GetUser()`, `@Roles()` for route control
- **Interceptors**: `TransformInterceptor` standardizes all API responses
- **Exception Filter**: `AllExceptionsFilter` catches and formats all errors consistently
- **Use Cases**: Business operations encapsulated (e.g., `SendOrderConfirmationEmailUseCase`)
- **Transactions**: Atomic operations for complex multi-table updates (products, orders)

### Response & Error Format
**Success Response:**
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operación realizada con éxito"
}
```

**Error Response:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error description",
  "error": { /* details */ },
  "timestamp": "2025-12-02T...",
  "path": "/api/endpoint"
}
```

**Paginated Response:**
```json
{
  "success": true,
  "data": [ /* array of items */ ],
  "meta": {
    "total": 100,
    "page": 1,
    "lastPage": 10
  }
}
```

### Authentication Flow
- **Registration/Login** → Hash password with bcrypt (10 salt rounds) → JWT token issued (24h expiration)
- **Protected Routes** → `JwtAuthGuard` validates token from Authorization header (Bearer token)
- **Role-Based Access** → `RolesGuard` checks user roles (ADMIN, PRODUCTOR, CUSTOM)
- **Optional Auth** → `OptionalJwtAuthGuard` allows both authenticated and anonymous requests
- **Public Routes** → Marked with `@Public()` decorator to bypass `JwtAuthGuard`
- **Password Security** → bcrypt hashing, passwords removed before returning user objects

## Database Schema

**Core Models:**

**User** (UUID primary key)
- id, email (unique), password (bcrypt), name, roles (array)
- Relationships: products (as seller), orders, carts, pickupAddresses, addresses

**Product** (Integer primary key, auto-increment)
- id, sku, title, description, price, stock, active status
- productSize (dimensions: weight, length, height, width, one-to-one)
- Relationships: images (cascade delete), categories, user (seller), cartItems, orderItems

**ProductImage** (UUID)
- id, url, key (S3), main flag, order, CASCADE delete with product

**Category** (Hierarchical, 3-level max)
- id, name, idName (slug), level, parentId (self-reference)
- Relationships: parent, children, products

**ProductCategory** (Junction table)
- productId, categoryId with UNIQUE constraint (productId, categoryId)

**Cart** (UUID)
- id, sessionId (for anonymous), userId, deliveryType (SHIPPING/PICKUP), total, addressId
- Relationships: items, address, user

**CartItem** (UUID)
- id, cartId, productId, quantity, subTotal
- UNIQUE constraint: (cartId, productId)

**Order** (Integer primary key, auto-increment)
- id, orderNumber (unique, 8-char hex), userId, addressId
- email, name, phone, deliveryType, total, deliveryPrice, itemsPriceSum
- status (PENDING_PAYMENT, PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED)
- Relationships: items, address, user

**OrderItem** (Integer)
- id, orderId, productId, title, unitPrice, quantity, subTotal, imageUrl (snapshots at purchase time)

**PickupAddress** (UUID)
- id, name, street, number, city, state, zipCode, latitude, longitude, isActive, userId (seller)

**Address** (UUID)
- id, street, number, city, state, zipCode, country (default: Argentina)
- Relationships: user, carts, orders

**Enums:**
- `Role`: ADMIN, CUSTOM, PRODUCTOR
- `DeliveryType`: SHIPPING, PICKUP
- `OrderStatus`: PENDING_PAYMENT, PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED

## Configuration

### Environment Variables
Required in `.env` (see `.env.example`):
- `PORT`: Server port (default: 3001)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT signing (used for 24h token expiration)
- `AWS_S3_ACCESS_KEY_ID`, `AWS_S3_SECRET_ACCESS_KEY`: S3 credentials
- `AWS_REGION`: AWS region for S3 bucket
- `AWS_S3_BUCKET`: S3 bucket name for product images
- `CORS_ORIGIN`: Frontend URL for CORS (default: http://localhost:3000)
- `MAILTRAP_TOKEN`: Mailtrap API token for email service
- `MAILTRAP_SENDER_EMAIL`: Sender email address for order confirmations

### Global Setup
- **CORS**: Enabled for configured CORS_ORIGIN (main.ts)
- **API Prefix**: All routes prefixed with `/api`
- **Validation Pipe**: Global DTO validation with `whitelist: true` (strips unknown properties) and `forbidNonWhitelisted: true`
- **Transform Pipe**: Auto-transforms request payloads to DTO classes
- **Error Handling**: `AllExceptionsFilter` standardizes error responses with timestamp, status, message, and path
- **Response Transform**: `TransformInterceptor` wraps successful responses in `{ success, data, message }` format
- **Cookie Parser**: Middleware for session-based cart identification

## Important Implementation Details

### AWS S3 Image Upload Flow
1. Client requests presigned URL: `POST /api/products/images/presigned-url` with file extension and MIME type
2. Backend generates presigned upload URL (10-min expiration) and public URL
3. Client uploads directly to S3 using presigned URL (no backend involved)
4. Client sends image metadata with S3 key: `POST /api/products/:id/images`
5. Backend stores `ProductImage` record with URL, key, main flag, and order
6. Images cascade-delete with product deletion
7. S3 keys used for delete presigned URLs when removing images

### Cart Management
- **Session-based carts**: For anonymous users, identified via `cart_session_id` cookie
- **User carts**: For authenticated users, identified via userId
- **Cart creation**: Auto-creates session ID or uses userId (mutually exclusive)
- **Cart Items**: Tracks quantity and calculates subTotal (quantity × product price)
- **Cart Total**: Aggregates all item subtotals
- **Delivery Type**: Determined per cart (SHIPPING or PICKUP), null until set
- **Address Association**: Optional address ID for SHIPPING deliveries
- **Stock Validation**: Not performed in cart (only when creating orders)

### Order Processing
1. **Order Creation**: POST to `/api/orders` with cartId, optional userId, delivery info
2. **Stock Validation**: Verifies each product has sufficient stock (transaction-scoped)
3. **Stock Reduction**: Decrements product stock for each ordered item
4. **Data Snapshot**: Copies product title, price, and main image URL to OrderItem
5. **Order Number**: Generates unique 8-character hex string via `crypto.randomBytes(4).toString('hex')`
6. **Pricing**: Stores `itemsPriceSum` (sum of items), `deliveryPrice`, and `total`
7. **Address Handling**: Creates delivery address if not provided, links to order
8. **Email Notification**: Asynchronously sends confirmation email (non-blocking, errors logged)
9. **Cart Cleanup**: Clears cart items after successful order
10. **Status Tracking**: Starts at PENDING_PAYMENT, can transition through PENDING → PROCESSING → SHIPPED → DELIVERED or CANCELLED

### Email Service (Mailtrap Integration)
- **MailtrapService**: Wraps Mailtrap API for template-based emails
- **EmailService**: High-level interface with batch sending support
- **Batch Configuration**: Default 20 emails per batch with 1000ms delay between batches
- **Order Confirmation**: Template-based email with orderNumber, customerName, email, total, deliveryPrice, itemsPriceSum, deliveryType, status, itemsCount
- **Error Handling**: Non-blocking (doesn't interrupt order creation if email fails)
- **Template Management**: Template UUIDs defined in email.constants

### Role-Based Access Control
- **ADMIN**: Full platform access (view all orders, manage platform)
- **PRODUCTOR**: Create/manage products, manage pickup addresses, view own products
- **CUSTOM**: Standard users, can register, view products, create carts, place orders
- **Enforcement**: `RolesGuard` checks user roles against `@Roles()` decorator values
- **Authentication**: `JwtAuthGuard` validates JWT token, `@Public()` bypasses it

## Common Development Tasks

### Adding a New Module
1. Create folder: `src/[module-name]/`
2. Create module file: `[module-name].module.ts`
3. Create service: `[module-name].service.ts` (with PrismaService injection)
4. Create controller: `[module-name].controller.ts` (with service injection)
5. Create DTOs in `dto/` folder with validation decorators
6. Update Prisma schema if needed: `prisma/schema.prisma`
7. Create migration: `npx prisma migrate dev --name [description]`
8. Import and add module to `app.module.ts`
9. Implement guards/decorators if auth required (inherit from auth module)

### Creating API Endpoints
1. Define DTOs with `class-validator` decorators (IsNotEmpty, IsEmail, IsNumber, etc.)
2. Add controller method with decorators: `@Post()`, `@Get()`, `@Patch()`, `@Delete()`
3. Use `@UseGuards()` for authentication/authorization (JwtAuthGuard, RolesGuard)
4. Use `@Roles()` decorator if role-based access needed
5. Use `@CurrentUser()` to inject authenticated user from token
6. Use `@Public()` decorator to bypass JwtAuthGuard for public routes
7. Implement service logic using injected PrismaService
8. Service methods should use Prisma transactions for multi-table operations
9. Return plain objects (interceptor handles wrapping in success response)
10. Throw HttpException for errors (handled by global exception filter)

### Database Migrations
```bash
npx prisma migrate dev --name [description]    # Create and apply migration
npx prisma generate                            # Regenerate Prisma client
npx prisma studio                              # Open GUI for database
npx prisma db seed                             # Run seed (if seed.ts exists)
```

### Testing Pattern
- Unit tests: `*.spec.ts` in same folder as tested file
- Use `@nestjs/testing` Test.createTestingModule() for DI setup
- Mock dependencies with jest.mock()
- Test both success and error paths
- Jest config targets `src/**/*.spec.ts`
- E2E tests in `test/` folder with `*.e2e-spec.ts` pattern

## Key Utilities & Helpers

**Order Number Generation:**
```typescript
// src/orders/utils/generate-order-number.ts
export function generateOrderNumber(): string {
  return crypto.randomBytes(4).toString('hex');
}
```
- Generates 8-character hex string (format: "abc12def")
- Database constraint ensures UNIQUE orderNumber

**PrismaService:**
- Extends PrismaClient with lifecycle hooks
- Available application-wide as global import
- Handles database connection on module init
- Graceful disconnect on module destroy

**Email Use Cases:**
```typescript
// src/email/use-cases/send-order-confirmation-email.use-case.ts
// Encapsulates business logic for order confirmation emails
// Non-blocking execution (doesn't interrupt order flow)
```

## Patterns to Follow

**Multi-Table Operations:**
- Use Prisma `$transaction()` for atomic updates (products + stock, orders + items + addresses)
- Rollback entire operation if any query fails
- Example: Order creation updates product stock, creates order, creates items, sends email

**Error Handling:**
- Throw `HttpException` with appropriate status code (400 for validation, 404 for not found, 409 for conflicts)
- Global `AllExceptionsFilter` handles formatting and logging
- Error responses include statusCode, message, error details, timestamp, path

**Response Formatting:**
- Controllers return plain objects (data only)
- `TransformInterceptor` wraps response with `{ success: true, data, message }`
- Pagination returns `{ data: [], meta: { total, page, lastPage } }`

**DTO Validation:**
- Use `class-validator` decorators on all input DTOs
- Global validation pipe enforces whitelist mode (strips unknown properties)
- Transform decorators convert nested objects to proper DTO instances
- Example: `@IsNotEmpty()`, `@IsEmail()`, `@IsNumber()`, `@Min()`, `@Max()`, `@IsEnum()`

**Service Layer:**
- All database operations through PrismaService
- Services should be stateless and testable
- Dependency inject other services, guards, decorators
- Return DTOs or domain models (not raw Prisma client responses)

**Authentication Flow:**
1. Public routes: Use `@Public()` decorator
2. Protected routes: Use `JwtAuthGuard` (automatic via global setup)
3. Role-restricted: Add `@UseGuards(RolesGuard)` and `@Roles(Role.ADMIN)`
4. Get current user: Use `@CurrentUser()` decorator on controller param
5. Optional auth: Use `OptionalJwtAuthGuard` for routes that work with or without token

## File Structure Reference

```
src/
├── auth/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── strategies/
│   │   └── jwt.strategy.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── roles.guard.ts
│   │   └── optional-jwt-auth.guard.ts
│   ├── decorators/
│   │   ├── public.decorator.ts
│   │   ├── current-user.decorator.ts
│   │   ├── roles.decorator.ts
│   │   └── get-user.decorator.ts
│   └── dto/
│       ├── login.dto.ts
│       ├── register.dto.ts
│       └── admin-login.dto.ts
├── products/
│   ├── products.controller.ts
│   ├── products.service.ts
│   ├── products.module.ts
│   └── dto/
│       ├── create-product.dto.ts
│       └── update-product.dto.ts
├── orders/
│   ├── orders.controller.ts
│   ├── orders.service.ts
│   ├── orders.module.ts
│   ├── utils/
│   │   └── generate-order-number.ts
│   └── dto/
│       └── create-order.dto.ts
├── email/
│   ├── email.service.ts
│   ├── mailtrap.service.ts
│   ├── email.module.ts
│   ├── email.constants.ts
│   ├── use-cases/
│   │   └── send-order-confirmation-email.use-case.ts
│   └── dto/
│       └── send-email.dto.ts
├── prisma/
│   └── prisma.service.ts
├── common/
│   ├── filters/
│   │   └── all-exceptions.filter.ts
│   └── interceptors/
│       └── transform.interceptor.ts
└── app.module.ts
```

## Testing Examples

**Unit Test (Service):**
```typescript
describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ProductsService, { provide: PrismaService, useValue: { product: { create: jest.fn() } } }],
    }).compile();
    service = module.get<ProductsService>(ProductsService);
  });

  it('should create a product', async () => {
    const dto = { title: 'Test', price: 100, stock: 10 };
    await service.create(dto);
    expect(prisma.product.create).toHaveBeenCalledWith(expect.objectContaining({ data: dto }));
  });
});
```

**Integration Test (Endpoint):**
```typescript
describe('POST /api/products', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should create product', () => {
    return request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test', price: 100, stock: 10 })
      .expect(201)
      .expect(res => expect(res.body.success).toBe(true));
  });
});
```

## Future Considerations

**Phase 2 (Affiliate System):**
- Will require new `Affiliate` and `Commission` models
- Tracking system for sales attributed to affiliates
- Commission calculation and payout logic
- Should extend Orders with affiliate reference fields (affiliateId, commissionPercentage)
- Keep current architecture modular to accommodate new affiliate module
- May need notifications/webhook system for affiliate payouts

**Current Preparation:**
- Modular structure allows independent affiliate module
- Clear service boundaries prevent tight coupling
- Repository pattern (Prisma service) enables easy data access for commissions
- Order model already captures itemsPriceSum and deliveryPrice for accurate commission calculation
