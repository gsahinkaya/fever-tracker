import { defineStore } from 'pinia'
import { addDoc, collection, orderBy, query, Timestamp } from 'firebase/firestore'
import { db } from '@/firebase'
import { useWatermarkedFeed } from '@/composables/useWatermarkedFeed'
import { currentWhoLabel, messageForMedicalNote } from '@/lib/describeActivity'
import { notifyFamily } from '@/lib/notifyFamily'
import type { MedicalNoteCategory, MedicalNoteEntry } from '@/types/health'

function notesCollection(familyId: string, childId: string) {
  return collection(db, 'families', familyId, 'children', childId, 'medicalNotes')
}

export const useMedicalNotesStore = defineStore('medicalNotes', () => {
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
  } = useWatermarkedFeed<MedicalNoteEntry>({
    storageKeyPrefix: 'ates-olcer:last-seen-medical-notes',
    buildQuery: (familyId, childId) =>
      query(notesCollection(familyId, childId), orderBy('takenAt', 'desc')),
    mapDoc: (id, data) =>
      ({ ...data, id, takenAt: (data.takenAt as Timestamp).toMillis() }) as MedicalNoteEntry,
    sortKey: (entry) => entry.takenAt,
    collection: notesCollection,
  })

  async function addNote(
    category: MedicalNoteCategory,
    content: string,
    title?: string,
    takenAt?: Date,
  ) {
    const { familyId, childId } = requireContext()
    const payload: Omit<MedicalNoteEntry, 'id' | 'takenAt'> & { takenAt: Timestamp } = {
      category,
      content,
      takenAt: takenAt ? Timestamp.fromDate(takenAt) : Timestamp.now(),
      ...(title ? { title } : {}),
      ...creatorFields(),
    }
    const ref = await addDoc(notesCollection(familyId, childId), payload)
    void notifyFamily(
      messageForMedicalNote(currentWhoLabel(), category, title || content),
      `medical-note-${ref.id}`,
      undefined,
      '/notes',
    )
  }

  return {
    entries,
    activeChildId,
    incomingEntries,
    allRemoteEntries,
    lastRemoteEntry,
    watchChild,
    acknowledgeIncoming,
    addNote,
    removeEntry,
    clearAllEntries,
    recentEntries,
  }
})
