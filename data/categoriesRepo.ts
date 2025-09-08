import { query } from '@/lib/db';
import { Category } from '@/types/domain';

export function listCategories(): Category[] {
  return query<Category>(`SELECT id, name, parentId FROM categories ORDER BY name ASC`);
}


