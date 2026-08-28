import { computed, ref } from 'vue'

// Shared by every single-store "log" screen (Semptomlar, Bez Değişimi,
// Uyku) that offers the same default-to-last-48-hours-with-a-"tümünü
// gör"-escape-hatch view as Ana Sayfa/Geçmiş. Takes the store's own
// entries/recentEntries pair directly rather than the whole store object,
// so callers can still post-filter (e.g. Uyku excluding the still-ongoing
// session) before or after this returns.
export function use48hToggle<T extends { takenAt: number }>(source: {
  entries: { value: T[] }
  recentEntries: (hours: number) => T[]
}) {
  const showAll = ref(false)

  const sorted = computed(() => {
    const entries = showAll.value ? source.entries.value : source.recentEntries(48)
    return [...entries].sort((a, b) => b.takenAt - a.takenAt)
  })

  return { showAll, sorted }
}
