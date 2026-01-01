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
  user: Omit<User, 'password'>;
}

// Interfaz para agrupar items por vendedor
export interface ItemsByVendor {
  vendor: {
    id: string;
    name: string;
    email: string;
  };
  items: CartItemWithProduct[];
  subtotal: number;
}
