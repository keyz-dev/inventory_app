import { query } from '@/lib/db';
import { Category } from '@/types/domain';

export function listCategories(): Category[] {
  const categories = query<Category>(`
    SELECT id, name, parentId 
    FROM categories 
    WHERE deletedAt IS NULL 
    ORDER BY name ASC
  `);
  
  // Filter out categories with null IDs and remove duplicates
  const uniqueCategories = categories
    .filter(category => category.id !== null && category.id !== undefined)
    .reduce((acc, category) => {
      // Remove duplicates based on ID
      if (!acc.find(c => c.id === category.id)) {
        acc.push(category);
      }
      return acc;
    }, [] as Category[]);
  
  return uniqueCategories;
}

// Debug function to check for duplicate categories
export function debugCategories(): void {
  const allCategories = query<Category>(`
    SELECT id, name, parentId, deletedAt 
    FROM categories 
    ORDER BY name ASC
  `);
  
  console.log('🔍 All categories in database:');
  allCategories.forEach(cat => {
    console.log(`- ID: ${cat.id}, Name: "${cat.name}", Parent: ${cat.parentId}, Deleted: ${cat.deletedAt}`);
  });
  
  // Check for duplicates
  const duplicates = allCategories
    .filter(cat => cat.deletedAt === null)
    .reduce((acc, cat) => {
      if (!acc[cat.name]) acc[cat.name] = [];
      acc[cat.name].push(cat);
      return acc;
    }, {} as Record<string, Category[]>);
  
  const duplicateNames = Object.keys(duplicates).filter(name => duplicates[name].length > 1);
  
  if (duplicateNames.length > 0) {
    console.log('⚠️ Duplicate categories found:');
    duplicateNames.forEach(name => {
      console.log(`- "${name}" appears ${duplicates[name].length} times:`, duplicates[name].map(c => c.id));
    });
  } else {
    console.log('✅ No duplicate categories found');
  }
}


