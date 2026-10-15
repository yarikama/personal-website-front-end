import { adminFetch } from './auth'
import { apiErrorMessage } from './client'
import type { ApiResponse, PaginatedResponse, Project } from '../../types'

export interface CreateProjectData {
  slug: string
  title: string
  description: string
  tags: string[]
  categoryId: string
  year: string
  coverImage?: string
  link?: string
  github?: string
  metrics?: string
  formula?: string
  featured: boolean
  order: number
  published: boolean
}

export type UpdateProjectData = Partial<CreateProjectData>

class AdminProjectsService {
  /**
   * Get all projects (including unpublished) for admin
   */
  async getAll(limit: number = 100): Promise<PaginatedResponse<Project>> {
    const response = await adminFetch(
      `${import.meta.env.VITE_API_BASE_URL || 'https://api.yarikama.com/api/v1'}/admin/projects?limit=${limit}`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch projects')
    }

    return response.json()
  }

  /**
   * Create a new project
   */
  async create(data: CreateProjectData): Promise<ApiResponse<Project>> {
    const response = await adminFetch(
      `${import.meta.env.VITE_API_BASE_URL || 'https://api.yarikama.com/api/v1'}/admin/projects`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    )

    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null)
      throw new Error(apiErrorMessage(body, response.status, 'Failed to create project'))
    }

    return response.json()
  }

  /**
   * Update an existing project
   */
  async update(id: string, data: UpdateProjectData): Promise<ApiResponse<Project>> {
    const response = await adminFetch(
      `${import.meta.env.VITE_API_BASE_URL || 'https://api.yarikama.com/api/v1'}/admin/projects/${id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    )

    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null)
      throw new Error(apiErrorMessage(body, response.status, 'Failed to update project'))
    }

    return response.json()
  }

  /**
   * Delete a project
   */
  async delete(id: string): Promise<void> {
    const response = await adminFetch(
      `${import.meta.env.VITE_API_BASE_URL || 'https://api.yarikama.com/api/v1'}/admin/projects/${id}`,
      {
        method: 'DELETE',
      }
    )

    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null)
      throw new Error(apiErrorMessage(body, response.status, 'Failed to delete project'))
    }
  }
}

export const adminProjectsService = new AdminProjectsService()
