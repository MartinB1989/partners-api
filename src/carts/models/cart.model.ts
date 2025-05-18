import { Cart, CartItem, Product, ProductImage, Address } from '@prisma/client';

export interface CartWithRelations extends Cart {
  items: CartItemWithProduct[];
  address?: Address | null;
}

export interface CartItemWithProduct extends CartItem {
  product: ProductWithImages;
}

export interface ProductWithImages extends Product {
  images: ProductImage[];
}
