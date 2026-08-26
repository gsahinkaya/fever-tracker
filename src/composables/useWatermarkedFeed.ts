import { computed, ref, shallowRef } from 'vue'
import { onSnapshot, type DocumentData, type Query } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth'
import { loadLastSeen, saveLastSeen } from '@/lib/lastSeen'

interface CreatedByFields {
  createdBy?: string
}

/**
 * A live Firestore collection scoped to the active child, with a
 * per-device "last seen" watermark so the bell/banner can tell what the
 * *other* parent added — including while this device was closed, not just
 * activity that arrives while a listener happens to already be live.
 * Shared by feverLog/feedingLog/medications, which otherwise duplicated
 * this exact listener + watermark + own-write-filtering logic.
 */
export function useWatermarkedFeed<T extends CreatedByFields>(options: {
  storageKeyPrefix: string
  buildQuery: (familyId: string, childId: string) => Query<DocumentData>
  mapDoc: (id: string, data: DocumentData) => T
  sortKey: (item: T) => number
}) {
  // shallowRef: items are always replaced wholesale from a fresh snapshot,
  // never mutated in place, and a generic T confuses Vue's deep-unwrap
  // typing (UnwrapRefSimple<T> vs T) — shallow sidesteps both issues.
  const items = shallowRef<T[]>([])
  const activeChildId = ref<string | null>(null)
  const lastSeenAt = ref(0)
  // Fires once per remotely-added item, for triggering a system notification.
  const lastRemote = shallowRef<T | null>(null)
  let unsubscribe: (() => void) | null = null

  const incoming = computed(() => {
    const myUid = useAuthStore().user?.uid
    return items.value
      .filter(
        (item: T) =>
          item.createdBy && item.createdBy !== myUid && options.sortKey(item) > lastSeenAt.value,
      )
      .slice()
      .sort((a: T, b: T) => options.sortKey(a) - options.sortKey(b))
  })

  function watchChild(childId: string | null) {
    activeChildId.value = childId
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    items.value = []
    lastRemote.value = null
    lastSeenAt.value = childId ? loadLastSeen(`${options.storageKeyPrefix}:${childId}`) : 0

    const authStore = useAuthStore()
    if (!childId || !authStore.familyId) return

    // The listener's first callback is the initial read of existing docs,
    // not new activity — only look for "added" items from later callbacks,
    // to avoid popping a system notification for old, already-synced data.
    let isInitialSnapshot = true
    unsubscribe = onSnapshot(options.buildQuery(authStore.familyId, childId), (snapshot) => {
      items.value = snapshot.docs.map((d) => options.mapDoc(d.id, d.data()))

      if (!isInitialSnapshot) {
        const myUid = authStore.user?.uid
        for (const change of snapshot.docChanges()) {
          // hasPendingWrites is true for our own optimistic writes and never
          // flips to false in a later callback (the doc content doesn't
          // change once synced), so this naturally excludes our own writes.
          if (change.type !== 'added' || change.doc.metadata.hasPendingWrites) continue
          const data = change.doc.data()
          if (data.createdBy && data.createdBy === myUid) continue
          lastRemote.value = options.mapDoc(change.doc.id, data)
        }
      }
      isInitialSnapshot = false
    })
  }

  function acknowledgeIncoming() {
    if (!activeChildId.value) return
    const now = Date.now()
    lastSeenAt.value = now
    saveLastSeen(`${options.storageKeyPrefix}:${activeChildId.value}`, now)
  }

  function requireContext() {
    const authStore = useAuthStore()
    if (!authStore.familyId || !activeChildId.value) {
      throw new Error('Aktif çocuk seçilmedi')
    }
    return { familyId: authStore.familyId, childId: activeChildId.value }
  }

  function creatorFields(): CreatedByFields & { createdByEmail?: string } {
    const authStore = useAuthStore()
    const uid = authStore.user?.uid
    const email = authStore.profile?.email ?? authStore.user?.email ?? undefined
    return {
      ...(uid ? { createdBy: uid } : {}),
      ...(email ? { createdByEmail: email } : {}),
    }
  }

  return {
    items,
    activeChildId,
    incoming,
    lastRemote,
    watchChild,
    acknowledgeIncoming,
    requireContext,
    creatorFields,
  }
}
