export type UUID = string;

export type Category = {
  id: UUID;
  name: string;
  parentId: UUID | null;
};

export type ProductRow = {
  id: UUID;
  name: string;
  priceXaf: number | null;
  quantity: number;
  sizeLabel: string | null;
  variantOfId: UUID | null;
  categoryId: UUID | null;
  updatedAt: string;
  deletedAt: string | null;
};

export type ProductVariant = {
  id: UUID;
  sizeLabel: string | null; // null for single products
  priceXaf: number;
  quantity: number;
  updatedAt: string;
};

export type Product = {
  id: UUID; // parent id or standalone id
  name: string;
  categoryId: UUID | null;
  updatedAt: string;
  // If no variants: variants has a single entry derived from the row
  variants: ProductVariant[];
};


