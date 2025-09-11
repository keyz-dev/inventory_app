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

export type PaginationOptions = {
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'updatedAt' | 'priceXaf' | 'quantity';
  sortOrder?: 'ASC' | 'DESC';
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
};

export function listProducts(
  group: 'all' | 'pharma' | 'cosmetics' = 'all', 
  search: string = '',
  options: PaginationOptions = {}
): PaginatedResult<Product> {
  const { 
    limit = 50, 
    offset = 0, 
    sortBy = 'updatedAt', 
    sortOrder = 'DESC' 
  } = options;

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
  
  // Get total count for pagination
  const countResult = query<{ count: number }>(
    `SELECT COUNT(DISTINCT CASE WHEN variantOfId IS NULL THEN id END) as count FROM products ${where}`,
    params
  )[0];
  const total = countResult?.count || 0;

  // Get paginated data
  const rows = query<ProductRow>(
    `SELECT * FROM products ${where} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  
  const data = mapRowsToProducts(rows);
  const nextOffset = offset + limit;
  const hasMore = nextOffset < total;

  return {
    data,
    total,
    hasMore,
    nextOffset
  };
}

// Backward compatibility function
export function listProductsLegacy(group: 'all' | 'pharma' | 'cosmetics' = 'all', search: string = ''): Product[] {
  const result = listProducts(group, search, { limit: 1000 }); // Large limit for backward compatibility
  return result.data;
}

export function getProductById(id: UUID): Product | null {
  const parent = getFirst<ProductRow>(`SELECT * FROM products WHERE id = ?`, [id]);
  if (!parent) return null;
  const rows = query<ProductRow>(`SELECT * FROM products WHERE id = ? OR variantOfId = ?`, [id, id]);
  return mapRowsToProducts(rows).at(0) ?? null;
}

// Enhanced fuzzy search with typo tolerance and smart suggestions
function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .replace(/[^\w\s]/g, ''); // Remove special characters
}

// Calculate Levenshtein distance for typo tolerance
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Check if two strings are similar (for typo tolerance)
function isSimilar(str1: string, str2: string, threshold: number = 0.7): boolean {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  const similarity = 1 - (distance / maxLength);
  return similarity >= threshold;
}

// Extract words from search query
function extractWords(text: string): string[] {
  return text.split(/\s+/).filter(word => word.length > 0);
}

// Common misspellings and corrections for better user experience
const COMMON_MISSPELLINGS: Record<string, string[]> = {
  'dettol': ['detol', 'dettal', 'detal', 'detoll'],
  'santex': ['santax', 'santexx', 'santx', 'santex'],
  'soap': ['sop', 'soap', 'soapy'],
  'lotion': ['lotion', 'lotin', 'lotio'],
  'cream': ['crem', 'creme', 'creams'],
  'oil': ['oils', 'oill'],
  'perfume': ['perfum', 'perfumes', 'perfum'],
  'deodorant': ['deodrant', 'deodorants', 'deodrant'],
};

// Get corrected words for common misspellings
function getCorrectedWords(words: string[]): string[] {
  const corrected: string[] = [];
  
  for (const word of words) {
    corrected.push(word);
    
    // Check for common misspellings
    for (const [correct, misspellings] of Object.entries(COMMON_MISSPELLINGS)) {
      if (misspellings.includes(word.toLowerCase())) {
        corrected.push(correct);
      }
    }
  }
  
  return [...new Set(corrected)]; // Remove duplicates
}

export type SearchResult = {
  key: string;
  name: string;
  variant?: { sizeLabel: string | null; priceXaf: number; quantity: number };
  score: number;
  matchType: 'exact' | 'contains' | 'similar' | 'word' | 'fallback';
};

export function fuzzySearchProducts(q: string, limit: number = 20): SearchResult[] {
  const allRows = query<ProductRow>(`SELECT * FROM products WHERE deletedAt IS NULL`);
  const needle = normalize(q);
  const needleWords = extractWords(needle);
  const correctedWords = getCorrectedWords(needleWords);
  const exactMatches: SearchResult[] = [];
  const containsMatches: SearchResult[] = [];
  const similarMatches: SearchResult[] = [];
  const wordMatches: SearchResult[] = [];
  const fallbackMatches: SearchResult[] = [];

  const parents = mapRowsToProducts(allRows);
  
  for (const p of parents) {
    for (const v of p.variants) {
      const productText = normalize(p.name + ' ' + (v.sizeLabel ?? ''));
      const productWords = extractWords(productText);
      
      const result: SearchResult = {
        key: `${p.id}:${v.id}`,
        name: p.name,
        variant: { sizeLabel: v.sizeLabel, priceXaf: v.priceXaf, quantity: v.quantity },
        score: 0,
        matchType: 'fallback'
      };

      // 1. Exact match (highest priority)
      if (productText === needle) {
        result.score = 100;
        result.matchType = 'exact';
        exactMatches.push(result);
        continue;
      }

      // 2. Contains match
      if (productText.includes(needle)) {
        result.score = 80;
        result.matchType = 'contains';
        containsMatches.push(result);
        continue;
      }

      // 3. Similar match (typo tolerance) - but only for reasonable length matches
      if (needle.length >= 3 && productText.length >= 3 && isSimilar(productText, needle, 0.7)) {
        result.score = 60;
        result.matchType = 'similar';
        similarMatches.push(result);
        continue;
      }

      // 4. Word-based match (any word matches, including corrected words)
      const hasWordMatch = correctedWords.some(word => {
        if (word.length < 2) return false; // Skip single characters
        
        return productWords.some(productWord => {
          // Direct contains match
          if (productWord.includes(word)) return true;
          
          // Similar match only for words of reasonable length
          if (word.length >= 3 && productWord.length >= 3) {
            return isSimilar(productWord, word, 0.75);
          }
          
          return false;
        });
      });
      
      if (hasWordMatch) {
        result.score = 40;
        result.matchType = 'word';
        wordMatches.push(result);
        continue;
      }

      // 5. Fallback (all products for when no matches found)
      result.score = 10;
      result.matchType = 'fallback';
      fallbackMatches.push(result);
    }
  }

  // Combine results in priority order
  const allMatches = [
    ...exactMatches,
    ...containsMatches,
    ...similarMatches,
    ...wordMatches
  ];

  // If we have good matches, return them
  if (allMatches.length > 0) {
    return allMatches.slice(0, limit);
  }

  // If no good matches, try character-based matching for more relevant suggestions
  const characterMatches: SearchResult[] = [];
  
  for (const p of parents) {
    for (const v of p.variants) {
      const productText = normalize(p.name + ' ' + (v.sizeLabel ?? ''));
      const productWords = productText.split(' ');
      
      // Check if any part of the search term appears in the product
      const hasCharacterMatch = needleWords.some(word => {
        if (word.length < 2) return false; // Skip single characters
        
        return productWords.some(productWord => {
          if (productWord.length < word.length) return false;
          
          // Check if product word starts with search word (at least 2 characters)
          const minLength = Math.min(word.length, 3);
          const productStart = productWord.substring(0, minLength);
          const searchStart = word.substring(0, minLength);
          
          return productStart === searchStart;
        });
      });
      
      if (hasCharacterMatch) {
        characterMatches.push({
          key: `${p.id}:${v.id}`,
          name: p.name,
          variant: { sizeLabel: v.sizeLabel, priceXaf: v.priceXaf, quantity: v.quantity },
          score: 20,
          matchType: 'fallback'
        });
      }
    }
  }
  
  // If we have character matches, return them
  if (characterMatches.length > 0) {
    return characterMatches.slice(0, limit);
  }
  
  // Only if absolutely no relevant matches, show a limited set of popular products
  // But be very strict about what constitutes "relevant"
  const relevantFallbacks = fallbackMatches.filter(result => {
    const productText = normalize(result.name);
    const searchChars = needle.replace(/\s/g, '').split('');
    
    // Check if at least 50% of search characters appear in product name
    const matchingChars = searchChars.filter(char => productText.includes(char));
    const relevanceScore = matchingChars.length / searchChars.length;
    
    // Also check if any search word is a substring of any product word
    const hasSubstringMatch = needleWords.some(word => {
      if (word.length < 2) return false;
      return productText.split(' ').some(productWord => 
        productWord.includes(word) || word.includes(productWord)
      );
    });
    
    return relevanceScore >= 0.5 || hasSubstringMatch;
  });
  
  // If still no relevant matches, return empty array instead of random products
  if (relevantFallbacks.length === 0) {
    return [];
  }
  
  return relevantFallbacks
    .sort((a, b) => (b.variant?.quantity || 0) - (a.variant?.quantity || 0))
    .slice(0, Math.min(limit, 5)); // Limit to max 5 fallback suggestions
}

// Check if search has exact matches
export function hasExactMatch(q: string): boolean {
  const results = fuzzySearchProducts(q, 1);
  return results.length > 0 && results[0].matchType === 'exact';
}


