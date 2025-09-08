import { getFirst, query } from '@/lib/db';
import { Product, ProductRow, ProductVariant, UUID } from '@/types/domain';

function mapRowsToProducts(rows: ProductRow[]): Product[] {
  const parents: Record<string, Product> = {};
  const childrenByParent: Record<string, ProductVariant[]> = {};

  for (const r of rows) {
    if (r.variantOfId) {
      const variant: ProductVariant = {
        id: r.id,
        sizeLabel: r.sizeLabel,
        priceXaf: Number(r.priceXaf ?? 0),
        quantity: Number(r.quantity ?? 0),
        updatedAt: r.updatedAt,
      };
      const pid = r.variantOfId;
      if (!childrenByParent[pid]) childrenByParent[pid] = [];
      childrenByParent[pid].push(variant);
    } else {
      parents[r.id] = {
        id: r.id,
        name: r.name,
        categoryId: r.categoryId,
        updatedAt: r.updatedAt,
        variants: [],
      };
      // For standalone (no size) rows, create a synthetic single variant
      if (r.sizeLabel == null) {
        parents[r.id].variants = [
          {
            id: r.id,
            sizeLabel: null,
            priceXaf: Number(r.priceXaf ?? 0),
            quantity: Number(r.quantity ?? 0),
            updatedAt: r.updatedAt,
          },
        ];
      }
    }
  }

  // Attach children to parents
  for (const pid of Object.keys(childrenByParent)) {
    if (parents[pid]) {
      parents[pid].variants = childrenByParent[pid].sort((a, b) => {
        const aL = a.sizeLabel ?? '';
        const bL = b.sizeLabel ?? '';
        return aL.localeCompare(bL);
      });
    }
  }

  return Object.values(parents).sort((a, b) => a.name.localeCompare(b.name));
}

export function listProducts(group: 'all' | 'pharma' | 'cosmetics' = 'all', search: string = ''): Product[] {
  const filters: string[] = [`deletedAt IS NULL`];
  const params: any[] = [];

  if (group === 'pharma') {
    filters.push(`categoryId IN (SELECT id FROM categories WHERE id = 'cat_pharma' OR parentId = 'cat_pharma')`);
  } else if (group === 'cosmetics') {
    filters.push(`categoryId IN (SELECT id FROM categories WHERE id = 'cat_cosmetics' OR parentId = 'cat_cosmetics')`);
  }

  if (search && search.trim().length > 0) {
    const like = `%${search.trim()}%`;
    filters.push(`(name LIKE ? OR COALESCE(sizeLabel,'') LIKE ?)`);
    params.push(like, like);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const rows = query<ProductRow>(
    `SELECT * FROM products ${where} ORDER BY updatedAt DESC`,
    params
  );
  return mapRowsToProducts(rows);
}

export function getProductById(id: UUID): Product | null {
  const parent = getFirst<ProductRow>(`SELECT * FROM products WHERE id = ?`, [id]);
  if (!parent) return null;
  const rows = query<ProductRow>(`SELECT * FROM products WHERE id = ? OR variantOfId = ?`, [id, id]);
  return mapRowsToProducts(rows).at(0) ?? null;
}

// Basic fuzzy search without extra packages
function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '');
}

export function fuzzySearchProducts(q: string, limit: number = 20) {
  const allRows = query<ProductRow>(`SELECT * FROM products WHERE deletedAt IS NULL`);
  const needle = normalize(q);
  const scored: { key: string; name: string; variant?: { sizeLabel: string | null; priceXaf: number; quantity: number } }[] = [];

  const parents = mapRowsToProducts(allRows);
  for (const p of parents) {
    for (const v of p.variants) {
      const hay = normalize(p.name + ' ' + (v.sizeLabel ?? ''));
      if (hay.includes(needle)) {
        scored.push({
          key: `${p.id}:${v.id}`,
          name: p.name,
          variant: { sizeLabel: v.sizeLabel, priceXaf: v.priceXaf, quantity: v.quantity },
        });
      }
    }
  }

  return scored.slice(0, limit);
}


