import {
  Cart,
  CartItem,
  Product,
  ProductImage,
  Address,
  User,
} from '@prisma/client';

export interface CartWithRelations extends Cart {
  items: CartItemWithProduct[];
  address?: Address | null;
  itemsByVendor?: ItemsByVendor[];
}

export interface CartItemWithProduct extends CartItem {
  product: ProductWithImages;
}

export interface ProductWithImages extends Product {
  images: ProductImage[];
  user: Omit<User, 'password'> & {
    sellerSettings?: {
      acceptsHomeDelivery: boolean;
      acceptsPickup: boolean;
    } | null;
  };
}

// Interfaz para agrupar items por vendedor
export interface ItemsByVendor {
  vendor: {
    id: string;
    name: string;
    email: string;
    sellerSettings: {
      acceptsHomeDelivery: boolean;
      acceptsPickup: boolean;
    } | null;
  };
  items: CartItemWithProduct[];
  subtotal: number;
}
