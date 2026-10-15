import { adminFetch } from './auth'
import { apiErrorMessage } from './client'
import type { ApiResponse, Category, CategoryCreate, CategoryUpdate } from '../../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.yarikama.com/api/v1'

class AdminCategoriesService {
  /**
   * Get all categories (admin view)
   */
  async getAll(): Promise<ApiResponse<Category[]>> {
    const response = await adminFetch(`${API_BASE_URL}/admin/categories`)

    if (!response.ok) {
      throw new Error('Failed to fetch categories')
    }

    return response.json()
  }

  /**
   * Create a new category
   */
  async create(data: CategoryCreate): Promise<ApiResponse<Category>> {
    const response = await adminFetch(`${API_BASE_URL}/admin/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null)
      throw new Error(apiErrorMessage(body, response.status, 'Failed to create category'))
    }

    return response.json()
  }

  /**
   * Update a category
   */
  async update(id: string, data: CategoryUpdate): Promise<ApiResponse<Category>> {
    const response = await adminFetch(`${API_BASE_URL}/admin/categories/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null)
      throw new Error(apiErrorMessage(body, response.status, 'Failed to update category'))
    }

    return response.json()
  }

  /**
   * Delete a category
   */
  async delete(id: string): Promise<void> {
    const response = await adminFetch(`${API_BASE_URL}/admin/categories/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null)
      throw new Error(apiErrorMessage(body, response.status, 'Failed to delete category'))
    }
  }
}

export const adminCategoriesService = new AdminCategoriesService()
