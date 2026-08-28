import { computed } from 'vue'
import { defineStore } from 'pinia'
import { addDoc, collection, deleteDoc, doc, orderBy, query, Timestamp, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { useWatermarkedFeed } from '@/composables/useWatermarkedFeed'
import { currentWhoLabel, messageForSleepEnd, messageForSleepStart } from '@/lib/describeActivity'
import { notifyFamily } from '@/lib/notifyFamily'
import type { SleepEntry } from '@/types/health'

function sleepCollection(familyId: string, childId: string) {
  return collection(db, 'families', familyId, 'children', childId, 'sleep')
}

export const useSleepLogStore = defineStore('sleepLog', () => {
  const {
    items: entries,
    activeChildId,
    incoming: incomingEntries,
    lastRemote: lastRemoteEntry,
    watchChild,
    acknowledgeIncoming,
    requireContext,
    creatorFields,
  } = useWatermarkedFeed<SleepEntry>({
    storageKeyPrefix: 'ates-olcer:last-seen-sleep',
    buildQuery: (familyId, childId) =>
      query(sleepCollection(familyId, childId), orderBy('takenAt', 'desc')),
    mapDoc: (id, data) =>
      ({
        ...data,
        id,
        takenAt: (data.takenAt as Timestamp).toMillis(),
        ...(data.endedAt ? { endedAt: (data.endedAt as Timestamp).toMillis() } : {}),
      }) as SleepEntry,
    sortKey: (entry) => entry.takenAt,
  })

  // The most recent entry with no endedAt yet — there should only ever be
  // one at a time (the UI only offers "start" when this is null), but
  // finding it by absence-of-endedAt rather than trusting a separate flag
  // keeps this self-healing if a write is ever interrupted.
  const activeSleep = computed(() => entries.value.find((e) => e.endedAt == null) ?? null)

  async function startSleep() {
    const { familyId, childId } = requireContext()
    await addDoc(sleepCollection(familyId, childId), {
      takenAt: Timestamp.now(),
      ...creatorFields(),
    })
    void notifyFamily(messageForSleepStart(currentWhoLabel()), 'entry-push')
  }

  async function endSleep() {
    const { familyId, childId } = requireContext()
    const active = activeSleep.value
    if (!active) return
    const endedAt = Date.now()
    await updateDoc(doc(sleepCollection(familyId, childId), active.id), {
      endedAt: Timestamp.fromMillis(endedAt),
    })
    // A separate, explicit push (not just relying on the Firestore write)
    // since useWatermarkedFeed's incoming list only reacts to newly-added
    // documents — this update wouldn't otherwise notify anyone.
    void notifyFamily(
      messageForSleepEnd(currentWhoLabel(), Math.round((endedAt - active.takenAt) / 60_000)),
      'entry-push',
    )
  }

  async function removeEntry(id: string) {
    const { familyId, childId } = requireContext()
    await deleteDoc(doc(sleepCollection(familyId, childId), id))
  }

  function recentEntries(hours: number): SleepEntry[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000
    return entries.value.filter((e) => e.takenAt >= cutoff)
  }

  return {
    entries,
    activeChildId,
    incomingEntries,
    lastRemoteEntry,
    activeSleep,
    watchChild,
    acknowledgeIncoming,
    startSleep,
    endSleep,
    removeEntry,
    recentEntries,
  }
})
