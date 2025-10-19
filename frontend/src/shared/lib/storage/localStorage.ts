import type { Restaurant, StoredPreferences } from '../../types'

const STORAGE_KEYS = {
  PREFERENCES: 'food_finder_preferences',
  BOOKMARKS: 'food_finder_bookmarks',
  REJECTED: 'food_finder_rejected',
  GROUP_MEMBERS: 'food_finder_group_members',
} as const

const safeParse = <T>(value: string | null): T | null => {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as T
  } catch (error) {
    console.warn('Failed to parse stored value', error)
    return null
  }
}

export const savePreferences = (preferences: StoredPreferences): void => {
  localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences))
}

export const getPreferences = (): StoredPreferences | null => {
  return safeParse<StoredPreferences>(localStorage.getItem(STORAGE_KEYS.PREFERENCES))
}

export const saveBookmark = (restaurant: Restaurant): void => {
  const bookmarks = getBookmarks()
  const exists = bookmarks.some((bookmark) => bookmark.place_id === restaurant.place_id)

  if (!exists) {
    const updatedBookmarks = [...bookmarks, restaurant]
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(updatedBookmarks))
  }
}

export const getBookmarks = (): Restaurant[] => {
  return safeParse<Restaurant[]>(localStorage.getItem(STORAGE_KEYS.BOOKMARKS)) ?? []
}

export const removeBookmark = (placeId: string): void => {
  const bookmarks = getBookmarks()
  const filtered = bookmarks.filter((bookmark) => bookmark.place_id !== placeId)
  localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(filtered))
}

export const saveRejected = (placeId: string): void => {
  const rejected = getRejected()
  if (!rejected.includes(placeId)) {
    const updatedRejected = [...rejected, placeId]
    localStorage.setItem(STORAGE_KEYS.REJECTED, JSON.stringify(updatedRejected))
  }
}

export const getRejected = (): string[] => {
  return safeParse<string[]>(localStorage.getItem(STORAGE_KEYS.REJECTED)) ?? []
}

export const clearRejected = (): void => {
  localStorage.removeItem(STORAGE_KEYS.REJECTED)
}

const getGroupMemberMap = (): Record<string, string> => {
  return safeParse<Record<string, string>>(localStorage.getItem(STORAGE_KEYS.GROUP_MEMBERS)) ?? {}
}

const saveGroupMemberMap = (map: Record<string, string>): void => {
  localStorage.setItem(STORAGE_KEYS.GROUP_MEMBERS, JSON.stringify(map))
}

export const saveGroupMemberId = (groupId: string, memberId: string): void => {
  const map = getGroupMemberMap()
  map[groupId] = memberId
  saveGroupMemberMap(map)
}

export const getGroupMemberId = (groupId: string): string | null => {
  const map = getGroupMemberMap()
  return map[groupId] ?? null
}

const getGroupProgressMap = (): Record<string, number> => {
  return safeParse<Record<string, number>>(localStorage.getItem('food_finder_group_progress')) ?? {}
}

const saveGroupProgressMap = (map: Record<string, number>): void => {
  localStorage.setItem('food_finder_group_progress', JSON.stringify(map))
}

export const saveGroupProgress = (groupId: string, memberId: string, index: number): void => {
  const key = `${groupId}:${memberId}`
  const map = getGroupProgressMap()
  map[key] = index
  saveGroupProgressMap(map)
}

export const getGroupProgress = (groupId: string, memberId: string): number | null => {
  const key = `${groupId}:${memberId}`
  const map = getGroupProgressMap()
  return map[key] ?? null
}
