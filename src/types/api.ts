// API Response Types

export interface ApiResponse<T> {
  data: T
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: Pagination
}

export interface Pagination {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: Array<{ field: string; message: string }>
    retryAfter?: number
  }
}

// LabNotes Types
export interface LabNote {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  tags: string[]
  readTime: string
  date: string
  published: boolean
  createdAt: string
  updatedAt: string
}

export interface LabNoteListItem {
  id: string
  title: string
  slug: string
  excerpt: string
  tags: string[]
  readTime: string
  date: string
  createdAt: string
  updatedAt: string
}

// Category Types
export interface Category {
  id: string
  name: string
  label: string
  description: string | null
  order: number
  createdAt: string
  updatedAt: string
}

export interface CategoryWithCount extends Category {
  count: number
}

export interface CategoryCreate {
  name: string
  label: string
  description?: string
  order?: number
}

export interface CategoryUpdate {
  name?: string
  label?: string
  description?: string
  order?: number
}

// Projects Types (API response)
export interface Project {
  id: string
  slug: string
  title: string
  description: string
  tags: string[]
  category: Category
  year: string
  coverImage?: string | null
  link?: string | null
  github?: string | null
  metrics?: string | null
  formula?: string | null
  featured: boolean
  order: number
  published?: boolean
  createdAt: string
  updatedAt: string
}

export interface ProjectCategory {
  id: string
  name: string
  label: string
  count: number
}

export interface LabNoteTag {
  tag: string
  count: number
}

// Contact Types
export interface ContactMessage {
  id: string
  name: string
  email: string
  subject: string
  message: string
  read: boolean
  replied: boolean
  createdAt: string
}

export interface ContactFormData {
  name: string
  email: string
  subject: string
  message: string
}

export interface ContactSubmitResponse {
  id: string
  message: string
}

// Query Parameters
export interface LabNotesQueryParams {
  tag?: string
  limit?: number
  offset?: number
  [key: string]: string | number | boolean | undefined
}

export interface ProjectsQueryParams {
  category_id?: string
  featured?: boolean
  tag?: string
  limit?: number
  offset?: number
  [key: string]: string | number | boolean | undefined
}

// Upload Types
export interface UploadResponse {
  url: string
  filename: string
}

export interface UploadDeleteResponse {
  message: string
}

// Learnings Types: the knowledge graph on /learnings. A learning node's page
// is code in src/learnings; the backend keeps only its card and its links.
export type LearningNodeKind = 'learning' | 'concept' | 'external'

// prerequisite: source is learned before target; part_of: source is part
// of target; related: either way round
export type LearningEdgeType = 'prerequisite' | 'part_of' | 'related'

export interface LearningNode {
  slug: string
  kind: LearningNodeKind
  title: string
  summary: string
  // A learning's path on the site, an external node's URL, a concept's null
  ref: string | null
  tags: string[]
  previewImage: string | null
  published: boolean
}

export interface LearningEdge {
  source: string
  target: string
  type: LearningEdgeType
  // A part_of edge that is the source's home, where it sits on the map. A
  // node can be part of several others; the rest are "also part of".
  home?: boolean
}

export interface LearningGraph {
  nodes: LearningNode[]
  edges: LearningEdge[]
}
