import { http, HttpResponse } from 'msw'
import { API_BASE_URL } from '@/lib/api'
import { withScenario } from '../scenarios'

export const systemHandlers = [
  http.get(
    `${API_BASE_URL}/health`,
    withScenario('system.health', () => HttpResponse.json({ status: 'ok' })),
  ),
]
