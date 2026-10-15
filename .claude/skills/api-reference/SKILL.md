---
name: api-reference
description: Reference documentation for the personal website API. Use when working with projects, categories, lab notes, or other API endpoints.
user-invocable: true
disable-model-invocation: false
---

# Personal Website API Reference

This skill provides reference documentation for the personal website backend API.

## Quick Reference

### Base URL
- Production: `https://api.yarikama.com/api/v1`
- Local development: Uses `VITE_API_BASE_URL` environment variable

### Authentication
Admin endpoints require JWT Bearer token in the `Authorization` header.

### Key Types

**Category** (full object returned in project responses):
```typescript
interface Category {
  id: string           // UUID
  name: string         // e.g., "engineering", "ml"
  label: string        // e.g., "Engineering", "ML/AI"
  description: string | null
  order: number
  created_at: string   // ISO 8601
  updated_at: string   // ISO 8601
}
```

**Project** (category is now a full object, not a string):
```typescript
interface Project {
  id: string
  slug: string
  title: string
  description: string
  tags: string[]
  category: Category   // Full Category object
  year: string
  link: string | null
  github: string | null
  metrics: string | null
  formula: string | null
  featured: boolean
  order: number
  published: boolean
  created_at: string
  updated_at: string
}
```

## Detailed Documentation

For complete API documentation, see:
- [Categories API](categories.md) - Category CRUD operations
- [Projects API](projects.md) - Project CRUD operations
- [Migration Guide](migration.md) - Breaking changes and migration notes

## Common Tasks

### Filtering projects by category
```typescript
// Use category_id (UUID), not category name
GET /api/v1/projects?category_id=11111111-1111-1111-1111-111111111111
```

### Creating/updating projects
```typescript
// Use category_id, not category
POST /api/v1/admin/projects
{
  "title": "My Project",
  "category_id": "11111111-1111-1111-1111-111111111111",
  // ... other fields
}
```

### Getting categories with counts
```typescript
GET /api/v1/categories?include_counts=true
```
