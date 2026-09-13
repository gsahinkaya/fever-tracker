import { computed } from 'vue'
import { defineStore } from 'pinia'
import { addDoc, collection, doc, orderBy, query, Timestamp, updateDoc } from 'firebase/firestore'
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
    allRemote: allRemoteEntries,
    lastRemote: lastRemoteEntry,
    watchChild,
    acknowledgeIncoming,
    requireContext,
    creatorFields,
    recentEntries,
    removeEntry,
    clearAllEntries,
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
    collection: sleepCollection,
  })

  // The most recent entry with no endedAt yet — there should only ever be
  // one at a time (the UI only offers "start" when this is null), but
  // finding it by absence-of-endedAt rather than trusting a separate flag
  // keeps this self-healing if a write is ever interrupted.
  const activeSleep = computed(() => entries.value.find((e) => e.endedAt == null) ?? null)

  async function startSleep(takenAt?: Date) {
    const { familyId, childId } = requireContext()
    const ref = await addDoc(sleepCollection(familyId, childId), {
      takenAt: takenAt ? Timestamp.fromDate(takenAt) : Timestamp.now(),
      ...creatorFields(),
    })
    void notifyFamily(messageForSleepStart(currentWhoLabel()), `sleep-${ref.id}`, undefined, '/sleep')
  }

  async function endSleep(endedAt?: Date) {
    const { familyId, childId } = requireContext()
    const active = activeSleep.value
    if (!active) return
    const endedAtMs = endedAt ? endedAt.getTime() : Date.now()
    await updateDoc(doc(sleepCollection(familyId, childId), active.id), {
      endedAt: Timestamp.fromMillis(endedAtMs),
    })
    // A separate, explicit push (not just relying on the Firestore write)
    // since useWatermarkedFeed's incoming list only reacts to newly-added
    // documents — this update wouldn't otherwise notify anyone.
    void notifyFamily(
      messageForSleepEnd(currentWhoLabel(), Math.round((endedAtMs - active.takenAt) / 60_000)),
      `sleep-end-${active.id}`,
      undefined,
      '/sleep',
    )
  }

  return {
    entries,
    activeChildId,
    incomingEntries,
    allRemoteEntries,
    lastRemoteEntry,
    activeSleep,
    watchChild,
    acknowledgeIncoming,
    startSleep,
    endSleep,
    removeEntry,
    clearAllEntries,
    recentEntries,
  }
})
