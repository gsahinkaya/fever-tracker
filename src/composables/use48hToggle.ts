import { computed, ref } from 'vue'

// Shared by every single-store "log" screen (Semptomlar, Bez Değişimi,
// Uyku) that offers the same default-to-last-48-hours-with-a-"tümünü
// gör"-escape-hatch view as Ana Sayfa/Geçmiş. Takes the Pinia store
// directly — `store.entries` reads as a plain T[] here (Pinia auto-unwraps
// refs on the store instance), not the ShallowRef it is inside the store's
// own setup function, but property access on the store still tracks
// reactively inside this computed.
export function use48hToggle<T extends { takenAt: number }>(source: {
  entries: T[]
  recentEntries: (hours: number) => T[]
}) {
  const showAll = ref(false)

  const sorted = computed(() => {
    const entries = showAll.value ? source.entries : source.recentEntries(48)
    return [...entries].sort((a, b) => b.takenAt - a.takenAt)
  })

  return { showAll, sorted }
}
