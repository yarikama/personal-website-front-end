import { apiClient } from './client'
import type { ApiResponse, LearningGraph } from '../../types'

export const learningsService = {
  /**
   * The published nodes of the Learnings graph and the edges between them
   */
  async getGraph(): Promise<ApiResponse<LearningGraph>> {
    return apiClient.get<ApiResponse<LearningGraph>>('/learnings/graph')
  },
}
