# Inventory Data Formatting Instructions

## Task
Format the provided product data from two Excel sheets (Cosmetics and Pharmaceuticals) into a single CSV file with the correct structure for an inventory management system.

## Data Source Structure
The Excel file contains two sheets:
- **Sheet 1: "Cosmetics"** - All beauty, personal care, and hygiene products
- **Sheet 2: "Pharma"** - All medicines, medical supplies, and health products

## Required CSV Structure
```csv
name,parent_category,subcategory,size,price,quantity
```

## Column Requirements

### 1. **name** (Required)
- Product name as it should appear in inventory
- Clean, consistent naming
- Remove extra spaces, special characters, or inconsistent formatting

### 2. **parent_category** (Required - Automatically assigned based on sheet)
- **"Cosmetics"** - for all products from the "Cosmetics" sheet
- **"Pharmaceuticals"** - for all products from the "Pharma" sheet

### 3. **subcategory** (Required)
Choose the most appropriate subcategory based on the product type:

**For Cosmetics:**
- "Soaps & Body Wash" - soaps, body washes, shower gels
- "Lotions & Creams" - moisturizers, body lotions, face creams
- "Oils & Butters" - body oils, shea butter, coconut oil
- "Perfumes & Deodorants" - fragrances, deodorants, body sprays
- "Hygiene & Antiseptics" - hand sanitizers, antiseptics, hygiene products
- "Hair Care" - shampoos, conditioners, hair treatments
- "Skin Care" - face washes, toners, serums, masks
- "Makeup" - cosmetics, lipsticks, foundations, eye makeup

**For Pharmaceuticals:**
- "Medications" - prescription and over-the-counter medicines
- "Supplements" - vitamins, dietary supplements
- "First Aid" - bandages, antiseptics, first aid supplies
- "Medical Devices" - thermometers, blood pressure monitors
- "Baby Care" - baby medicines, teething products
- "Elderly Care" - mobility aids, health monitoring devices

### 4. **size** (Optional)
- Product size or variant (e.g., "Large", "Medium", "Small", "500ml", "100g")
- Leave empty if no size variants
- Use consistent size labels

### 5. **price** (Required)
- Price in XAF (Central African Franc)
- Must be a positive number
- No currency symbols, just the number
- Example: 1500 (not "1500 XAF" or "1,500")

### 6. **quantity** (Required)
- Initial stock quantity
- Must be 0 or positive number
- No negative values

## Processing Instructions

### Step 1: Process Each Sheet Separately
1. **Cosmetics Sheet**: All products automatically get parent_category = "Cosmetics"
2. **Pharma Sheet**: All products automatically get parent_category = "Pharmaceuticals"

### Step 2: Subcategory Assignment
Since parent categories are already determined by the sheet, focus on assigning appropriate subcategories:

**For Cosmetics Sheet Products:**
- Analyze product names to determine subcategory
- Look for keywords that indicate product type

**For Pharmaceuticals Sheet Products:**
- Analyze product names to determine subcategory
- Look for medical/health keywords

### Smart Name Analysis & Extraction

The product names are messy and contain size/subcategory information in various formats. Use these patterns to extract information:

#### **Size Extraction Patterns:**
Look for these patterns in product names and extract to size column:

**Brackets/Parentheses:**
- "Product Name (500ml)" → name: "Product Name", size: "500ml"
- "Soap [Large]" → name: "Soap", size: "Large"
- "Cream (250g)" → name: "Cream", size: "250g"

**Dashes/Hyphens:**
- "Product Name - 500ml" → name: "Product Name", size: "500ml"
- "Soap - Large Size" → name: "Soap", size: "Large"
- "Cream - 250g" → name: "Cream", size: "250g"

**Direct Attachment:**
- "Product Name500ml" → name: "Product Name", size: "500ml"
- "SoapLarge" → name: "Soap", size: "Large"
- "Cream250g" → name: "Cream", size: "250g"

**Common Size Indicators:**
- **Volume**: ml, L, liter, litre
- **Weight**: g, kg, gram, kilogram
- **Dosage**: mg, mcg, tablet, capsule
- **Size**: Large, Medium, Small, Big, Regular, Mini, Jumbo
- **Count**: pieces, pcs, tablets, capsules

#### **Subcategory Extraction Patterns:**
Sometimes subcategory info is embedded in the name:

**Brackets/Parentheses:**
- "Product Name (Body Wash)" → name: "Product Name", subcategory: "Soaps & Body Wash"
- "Medicine [Tablets]" → name: "Medicine", subcategory: "Medications"

**Dashes/Hyphens:**
- "Product Name - Body Wash" → name: "Product Name", subcategory: "Soaps & Body Wash"
- "Medicine - Tablets" → name: "Medicine", subcategory: "Medications"

**Direct Attachment:**
- "Product NameBody Wash" → name: "Product Name", subcategory: "Soaps & Body Wash"
- "MedicineTablets" → name: "Medicine", subcategory: "Medications"

#### **Complex Examples:**
- "Santex Soap (Large) - Body Wash" → name: "Santex Soap", size: "Large", subcategory: "Soaps & Body Wash"
- "Dettol[500ml]Antiseptic" → name: "Dettol", size: "500ml", subcategory: "Hygiene & Antiseptics"
- "Paracetamol-500mg-Tablets" → name: "Paracetamol", size: "500mg", subcategory: "Medications"

## Advanced Extraction Rules

### **Step-by-Step Processing:**

1. **Identify Patterns**: Look for brackets, dashes, or direct attachment
2. **Extract Size**: Remove size info and put in size column
3. **Extract Subcategory**: Remove subcategory info if embedded
4. **Clean Name**: Remove all extracted information from product name
5. **Assign Subcategory**: Use extracted info or infer from remaining name

### **Regex Patterns to Use:**
- **Brackets**: `\(([^)]+)\)` or `\[([^\]]+)\]`
- **Dashes**: `\s*-\s*([^-]+)`
- **Size Units**: `(\d+(?:\.\d+)?)\s*(ml|L|g|kg|mg|mcg|tablet|capsule|piece|pc)`
- **Size Words**: `(Large|Medium|Small|Big|Regular|Mini|Jumbo)`

### **Priority Order:**
1. **First**: Extract size information (brackets, dashes, direct)
2. **Second**: Extract subcategory information (if embedded)
3. **Third**: Clean the remaining product name
4. **Fourth**: Assign appropriate subcategory based on cleaned name

## Data Cleaning Rules

1. **Remove duplicates** - keep only one entry per unique product
2. **Extract embedded info** - size and subcategory from messy names
3. **Standardize names** - consistent capitalization and formatting
4. **Validate prices** - ensure all prices are positive numbers
5. **Check quantities** - ensure all quantities are non-negative
6. **Handle missing data** - use reasonable defaults or mark for review

## Example Transformations

### From Cosmetics Sheet:
**Input:** "Santex Soap (Large) - Body Wash 2100 XAF 10"
**Output:** 
```csv
Santex Soap,Cosmetics,Soaps & Body Wash,Large,2100,10
```

**Input:** "Dettol[500ml]Antiseptic 1500"
**Output:**
```csv
Dettol,Cosmetics,Hygiene & Antiseptics,500ml,1500,0
```

**Input:** "Body Lotion - 250g Moisturizer 3000"
**Output:**
```csv
Body Lotion,Cosmetics,Lotions & Creams,250g,3000,0
```

**Input:** "PerfumeLarge 5000"
**Output:**
```csv
Perfume,Cosmetics,Perfumes & Deodorants,Large,5000,0
```

### From Pharma Sheet:
**Input:** "Paracetamol-500mg-Tablets 500 XAF 50"
**Output:**
```csv
Paracetamol,Pharmaceuticals,Medications,500mg,500,50
```

**Input:** "Vitamin C (1000mg) 2000 XAF 25"
**Output:**
```csv
Vitamin C,Pharmaceuticals,Supplements,1000mg,2000,25
```

**Input:** "Bandage[10pcs]First Aid 1500"
**Output:**
```csv
Bandage,Pharmaceuticals,First Aid,10pcs,1500,0
```

**Input:** "Thermometer-Digital 8000"
**Output:**
```csv
Thermometer,Pharmaceuticals,Medical Devices,Digital,8000,0
```

## Output Requirements

1. **Single CSV file** combining data from both sheets
2. **CSV format** with header row
3. **UTF-8 encoding** to handle special characters
4. **No empty rows** between data
5. **Consistent formatting** throughout
6. **All required fields** populated
7. **Valid data types** (numbers for price/quantity)
8. **Process both sheets** and combine into one output file

## Quality Checklist

Before finalizing, ensure:
- [ ] All products have a parent_category (Cosmetics/Pharmaceuticals)
- [ ] All products have an appropriate subcategory
- [ ] All prices are positive numbers
- [ ] All quantities are non-negative
- [ ] Product names are clean and consistent
- [ ] Size information is properly extracted
- [ ] No duplicate entries
- [ ] CSV format is correct

## Processing Steps Summary

1. **Read both sheets** from the Excel file
2. **Process Cosmetics sheet** - assign parent_category = "Cosmetics" to all products
3. **Process Pharma sheet** - assign parent_category = "Pharmaceuticals" to all products
4. **Assign subcategories** based on product names and types
5. **Extract size information** from product names
6. **Clean and standardize** all data
7. **Combine both sheets** into a single CSV file
8. **Validate** all requirements are met

## Critical Extraction Notes
- **Parent categories** are automatically assigned based on the sheet name
- **Size extraction** is crucial - look for brackets, dashes, and direct attachment
- **Subcategory extraction** - sometimes embedded in the name, extract if present
- **Name cleaning** - remove all extracted information to get clean product names
- **Pattern recognition** - use regex patterns to identify and extract information
- **Priority order** - extract size first, then subcategory, then clean name
- **Size is optional** - only include if the product has size variants
- **Maintain consistency** - ensure all data is realistic and properly formatted
- **Combine both sheets** into one final CSV output

## Troubleshooting Common Issues
- **Multiple brackets**: Extract the first/most relevant one
- **Mixed formats**: Handle combinations like "Product (Size) - Category"
- **No clear size**: Leave size column empty if no size information found
- **Ambiguous subcategory**: Use the most logical subcategory based on product type
- **Special characters**: Clean up extra spaces, dashes, and formatting issues
