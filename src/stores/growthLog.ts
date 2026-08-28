import { defineStore } from 'pinia'
import { addDoc, collection, getDocs, limit, orderBy, query, Timestamp } from 'firebase/firestore'
import { db } from '@/firebase'
import { useWatermarkedFeed } from '@/composables/useWatermarkedFeed'
import { currentWhoLabel, messageForGrowth } from '@/lib/describeActivity'
import { notifyFamily } from '@/lib/notifyFamily'
import type { GrowthEntry } from '@/types/health'

function growthCollection(familyId: string, childId: string) {
  return collection(db, 'families', familyId, 'children', childId, 'growth')
}

export const useGrowthLogStore = defineStore('growthLog', () => {
  const {
    items: entries,
    activeChildId,
    incoming: incomingEntries,
    lastRemote: lastRemoteEntry,
    watchChild,
    acknowledgeIncoming,
    requireContext,
    creatorFields,
    removeEntry,
  } = useWatermarkedFeed<GrowthEntry>({
    storageKeyPrefix: 'ates-olcer:last-seen-growth',
    buildQuery: (familyId, childId) =>
      query(growthCollection(familyId, childId), orderBy('takenAt', 'desc')),
    mapDoc: (id, data) =>
      ({ ...data, id, takenAt: (data.takenAt as Timestamp).toMillis() }) as GrowthEntry,
    sortKey: (entry) => entry.takenAt,
    collection: growthCollection,
  })

  async function addGrowthEntry(
    heightCm?: number,
    weightKg?: number,
    takenAt?: Date,
    headCircumferenceCm?: number,
  ) {
    const { familyId, childId } = requireContext()
    const payload: Omit<GrowthEntry, 'id' | 'takenAt'> & { takenAt: Timestamp } = {
      takenAt: takenAt ? Timestamp.fromDate(takenAt) : Timestamp.now(),
      ...(heightCm ? { heightCm } : {}),
      ...(weightKg ? { weightKg } : {}),
      ...(headCircumferenceCm ? { headCircumferenceCm } : {}),
      ...creatorFields(),
    }
    await addDoc(growthCollection(familyId, childId), payload)
    void notifyFamily(messageForGrowth(currentWhoLabel(), heightCm, weightKg), 'entry-push')
  }

  // Called from the child profile form (both creating a new child and
  // editing an existing one) whenever height/weight/head-circumference was
  // entered there. Writes a new dated Growth entry when there's none yet
  // (first-ever numbers) OR when what was entered actually differs from
  // the latest existing entry (a real updated measurement) — but not on
  // every save, since the form re-submits the child's current values even
  // when the parent only changed the name and never touched these fields.
  // Takes familyId/childId directly (not requireContext/activeChildId)
  // since the edited child isn't necessarily the active one.
  async function syncEntryFromProfile(
    familyId: string,
    childId: string,
    heightCm?: number,
    weightKg?: number,
    headCircumferenceCm?: number,
  ) {
    const existing = await getDocs(
      query(growthCollection(familyId, childId), orderBy('takenAt', 'desc'), limit(1)),
    )
    const latest = existing.docs[0]?.data() as GrowthEntry | undefined
    const changed =
      (heightCm != null && heightCm !== latest?.heightCm) ||
      (weightKg != null && weightKg !== latest?.weightKg) ||
      (headCircumferenceCm != null && headCircumferenceCm !== latest?.headCircumferenceCm)
    if (existing.empty || changed) {
      const payload: Omit<GrowthEntry, 'id' | 'takenAt'> & { takenAt: Timestamp } = {
        takenAt: Timestamp.now(),
        ...(heightCm ? { heightCm } : {}),
        ...(weightKg ? { weightKg } : {}),
        ...(headCircumferenceCm ? { headCircumferenceCm } : {}),
        ...creatorFields(),
      }
      await addDoc(growthCollection(familyId, childId), payload)
    }
  }

  return {
    entries,
    activeChildId,
    incomingEntries,
    lastRemoteEntry,
    watchChild,
    acknowledgeIncoming,
    addGrowthEntry,
    removeEntry,
    syncEntryFromProfile,
  }
})
