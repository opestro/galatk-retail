import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'galatk_store_recent_searches_v1'
const LIMIT = 5

function readStorage(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((q): q is string => typeof q === 'string').slice(0, LIMIT) : []
  } catch {
    return []
  }
}

export const useRecentSearchesStore = defineStore('recentSearches', () => {
  const queries = ref<string[]>(readStorage())

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queries.value))
    } catch {
      // Non-critical convenience.
    }
  }

  function add(query: string) {
    const q = query.trim()
    if (!q) return
    queries.value = [q, ...queries.value.filter((item) => item.toLowerCase() !== q.toLowerCase())].slice(0, LIMIT)
    persist()
  }

  function clear() {
    queries.value = []
    persist()
  }

  return { queries, add, clear }
})
