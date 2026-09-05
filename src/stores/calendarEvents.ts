import { defineStore } from 'pinia'
import { addDoc, collection, orderBy, query, Timestamp } from 'firebase/firestore'
import { db } from '@/firebase'
import { useWatermarkedFeed } from '@/composables/useWatermarkedFeed'
import { currentWhoLabel, messageForCalendarEvent } from '@/lib/describeActivity'
import { notifyFamily } from '@/lib/notifyFamily'
import type { CalendarEvent } from '@/types/health'

function calendarEventsCollection(familyId: string, childId: string) {
  return collection(db, 'families', familyId, 'children', childId, 'calendarEvents')
}

export const useCalendarEventsStore = defineStore('calendarEvents', () => {
  const {
    items: events,
    activeChildId,
    incoming: incomingEvents,
    lastRemote: lastRemoteEvent,
    watchChild,
    acknowledgeIncoming,
    requireContext,
    creatorFields,
    removeEntry,
    clearAllEntries,
  } = useWatermarkedFeed<CalendarEvent>({
    storageKeyPrefix: 'ates-olcer:last-seen-calendar',
    // Ascending, unlike every log store's `desc` — this is a forward-looking
    // list of what's coming up, not a history of what already happened.
    buildQuery: (familyId, childId) =>
      query(calendarEventsCollection(familyId, childId), orderBy('date', 'asc')),
    mapDoc: (id, data) =>
      ({
        ...data,
        id,
        ...(data.createdAt ? { createdAt: (data.createdAt as Timestamp).toMillis() } : {}),
      }) as CalendarEvent,
    // createdAt (when it was added), not `date` (what it's scheduled for) —
    // the incoming/notification watermark needs "just added", the query
    // above already handles display order.
    sortKey: (event) => event.createdAt ?? 0,
    collection: calendarEventsCollection,
  })

  async function addEvent(
    title: string,
    date: string,
    time?: string,
    note?: string,
    repeat?: CalendarEvent['repeat'],
  ) {
    const { familyId, childId } = requireContext()
    const payload: Omit<CalendarEvent, 'id' | 'createdAt'> & { createdAt: Timestamp } = {
      title,
      date,
      createdAt: Timestamp.now(),
      ...(time ? { time } : {}),
      ...(note ? { note } : {}),
      ...(repeat ? { repeat } : {}),
      ...creatorFields(),
    }
    await addDoc(calendarEventsCollection(familyId, childId), payload)
    void notifyFamily(messageForCalendarEvent(currentWhoLabel(), title), 'entry-push')
  }

  return {
    events,
    activeChildId,
    incomingEvents,
    lastRemoteEvent,
    watchChild,
    acknowledgeIncoming,
    addEvent,
    removeEntry,
    clearAllEntries,
  }
})
