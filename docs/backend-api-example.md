# Backend API Example for Inventory Sync

This document provides an example of how to implement the backend API endpoints that the sync service expects.

## Base URL
```
https://your-api-server.com/api
```

## Authentication
All requests should include an API key in the Authorization header:
```
Authorization: Bearer YOUR_API_KEY
```

## Endpoints

### 1. Upload Changes (`POST /sync/upload`)

Upload local changes to the server.

**Request Body:**
```json
{
  "operations": [
    {
      "id": "product_1234567890_abc123",
      "entity": "product",
      "operation": "create",
      "data": {
        "id": "prod_123",
        "name": "New Product",
        "priceXaf": 1000,
        "quantity": 10,
        "categoryId": "cat_cosmetics"
      },
      "timestamp": "2024-01-15T10:30:00Z",
      "synced": false,
      "retryCount": 0
    }
  ],
  "lastSyncAt": "2024-01-15T09:00:00Z",
  "deviceId": "device_1234567890_xyz789"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "processed": 1,
    "conflicts": [],
    "errors": []
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 2. Download Changes (`POST /sync/download`)

Download remote changes from the server.

**Request Body:**
```json
{
  "lastSyncAt": "2024-01-15T09:00:00Z",
  "deviceId": "device_1234567890_xyz789"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "entities": [
      {
        "id": "prod_456",
        "entity": "product",
        "data": {
          "id": "prod_456",
          "name": "Updated Product",
          "priceXaf": 1500,
          "quantity": 5,
          "categoryId": "cat_cosmetics"
        },
        "updatedAt": "2024-01-15T10:15:00Z",
        "version": 2
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Database Schema (Example)

### Products Table
```sql
CREATE TABLE products (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price_xaf INTEGER,
  quantity INTEGER NOT NULL DEFAULT 0,
  size_label VARCHAR(100),
  variant_of_id VARCHAR(255),
  category_id VARCHAR(255),
  updated_at TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (variant_of_id) REFERENCES products(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

### Categories Table
```sql
CREATE TABLE categories (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id VARCHAR(255),
  updated_at TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES categories(id)
);
```

### Sync Log Table
```sql
CREATE TABLE sync_log (
  id VARCHAR(255) PRIMARY KEY,
  device_id VARCHAR(255) NOT NULL,
  operation_type ENUM('upload', 'download') NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  operation VARCHAR(20) NOT NULL,
  status ENUM('success', 'error', 'conflict') NOT NULL,
  error_message TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Implementation Notes

### 1. Conflict Resolution
- **Local Wins**: Server accepts client data if timestamps are close
- **Remote Wins**: Server data always takes precedence
- **Manual**: Flag conflicts for manual resolution

### 2. Incremental Sync
- Only return entities modified since `lastSyncAt`
- Use `updated_at` timestamps for comparison
- Include soft-deleted records with `deleted_at` field

### 3. Error Handling
- Return detailed error messages for debugging
- Implement retry logic for transient failures
- Log all sync operations for audit trail

### 4. Security
- Validate API keys on all requests
- Rate limit requests per device
- Sanitize all input data
- Use HTTPS for all communications

### 5. Performance
- Implement pagination for large datasets
- Use database indexes on frequently queried fields
- Cache frequently accessed data
- Optimize queries for sync operations

## Example Node.js/Express Implementation

```javascript
const express = require('express');
const app = express();

// Middleware
app.use(express.json());
app.use(authenticateApiKey);

// Upload endpoint
app.post('/sync/upload', async (req, res) => {
  try {
    const { operations, lastSyncAt, deviceId } = req.body;
    
    const results = {
      processed: 0,
      conflicts: [],
      errors: []
    };
    
    for (const operation of operations) {
      try {
        await processOperation(operation, deviceId);
        results.processed++;
      } catch (error) {
        results.errors.push({
          id: operation.id,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Download endpoint
app.post('/sync/download', async (req, res) => {
  try {
    const { lastSyncAt, deviceId } = req.body;
    
    const entities = await getModifiedEntities(lastSyncAt);
    
    res.json({
      success: true,
      data: { entities },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

function authenticateApiKey(req, res, next) {
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  
  if (!apiKey || !isValidApiKey(apiKey)) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
  }
  
  next();
}

async function processOperation(operation, deviceId) {
  const { entity, operation: op, data } = operation;
  
  switch (entity) {
    case 'product':
      await processProductOperation(op, data);
      break;
    case 'category':
      await processCategoryOperation(op, data);
      break;
    // Add other entities
  }
  
  // Log the operation
  await logSyncOperation(deviceId, 'upload', entity, data.id, op, 'success');
}

async function getModifiedEntities(lastSyncAt) {
  const query = `
    SELECT id, 'product' as entity, 
           JSON_OBJECT(
             'id', id,
             'name', name,
             'priceXaf', price_xaf,
             'quantity', quantity,
             'categoryId', category_id
           ) as data,
           updated_at as updatedAt,
           version
    FROM products 
    WHERE updated_at > ? AND deleted_at IS NULL
    
    UNION ALL
    
    SELECT id, 'category' as entity,
           JSON_OBJECT(
             'id', id,
             'name', name,
             'parentId', parent_id
           ) as data,
           updated_at as updatedAt,
           version
    FROM categories
    WHERE updated_at > ? AND deleted_at IS NULL
  `;
  
  return await db.query(query, [lastSyncAt, lastSyncAt]);
}
```

## Environment Variables

Create a `.env` file in your project root:

```env
# API Configuration
EXPO_PUBLIC_API_URL=https://your-api-server.com/api
EXPO_PUBLIC_API_KEY=your-secret-api-key

# Development
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_API_KEY=dev-api-key
```

This completes the backend API example. The sync service is now ready to work with any backend that implements these endpoints!
