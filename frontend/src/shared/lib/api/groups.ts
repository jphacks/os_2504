import axios from 'axios'

import type {
  GroupCreateParams,
  GroupCreateResponse,
  GroupInfo,
  GroupResultsResponse,
  GroupVoteRequest,
  Restaurant,
} from '../../types'

const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8001'

const defaultConfig = {
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
} as const

const buildQuery = (params: Record<string, string | number | undefined>): string => {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')

  return query.length > 0 ? `?${query}` : ''
}

export const createGroup = async (
  payload: GroupCreateParams,
  memberId: string,
): Promise<GroupCreateResponse> => {
  const query = buildQuery({ member_id: memberId })
  const response = await axios.post<GroupCreateResponse>(`/api/groups${query}`, payload, defaultConfig)
  return response.data
}

export const fetchGroupInfo = async (groupId: string, memberId?: string): Promise<GroupInfo> => {
  const query = buildQuery({ member_id: memberId })
  const response = await axios.get<GroupInfo>(`/api/groups/${groupId}${query}`, defaultConfig)
  return response.data
}

export const fetchGroupCandidates = async (
  groupId: string,
  memberId: string,
  start = 0,
  limit = 20,
): Promise<Restaurant[]> => {
  const query = buildQuery({ member_id: memberId, start, limit })
  const response = await axios.get<Restaurant[]>(`/api/groups/${groupId}/candidates${query}`, defaultConfig)
  return response.data
}

export const submitGroupVote = async (
  groupId: string,
  memberId: string,
  vote: GroupVoteRequest,
): Promise<void> => {
  const query = buildQuery({ member_id: memberId })
  await axios.post(`/api/groups/${groupId}/vote${query}`, vote, defaultConfig)
}

export const finishGroupVoting = async (
  groupId: string,
  memberId: string,
): Promise<GroupResultsResponse> => {
  const query = buildQuery({ member_id: memberId })
  const response = await axios.post<GroupResultsResponse>(
    `/api/groups/${groupId}/finish${query}`,
    {},
    defaultConfig,
  )
  return response.data
}

export const fetchGroupResults = async (groupId: string): Promise<GroupResultsResponse> => {
  const response = await axios.get<GroupResultsResponse>(`/api/groups/${groupId}/results`, defaultConfig)
  return response.data
}
