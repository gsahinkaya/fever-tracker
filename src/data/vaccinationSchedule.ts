export interface VaccinationScheduleItem {
  id: string
  name: string
  doseLabel: string
  // Age in days at which this dose is due, counted from birthDate. Turkey's
  // national schedule (T.C. Sağlık Bakanlığı Genişletilmiş Bağışıklama
  // Programı) states doses in months/years — converted here to days for
  // simple date arithmetic. General guidance only, not medical advice; the
  // child's own pediatrician's schedule takes precedence.
  //
  // Kept in sync by hand with api/check-upcoming-vaccinations.ts, which
  // can't import this file — see the note at the top of that file for why.
  ageDays: number
}

export const VACCINATION_SCHEDULE: VaccinationScheduleItem[] = [
  { id: 'hepb-1', name: 'Hepatit B', doseLabel: '1. doz', ageDays: 0 },
  { id: 'bcg', name: 'BCG', doseLabel: 'Tek doz', ageDays: 60 },
  { id: 'altili-1', name: 'Altılı Karma (DaBT-İPA-Hib-HepB)', doseLabel: '1. doz', ageDays: 60 },
  { id: 'kpa-1', name: 'Pnömokok (KPA)', doseLabel: '1. doz', ageDays: 60 },
  { id: 'altili-2', name: 'Altılı Karma', doseLabel: '2. doz', ageDays: 120 },
  { id: 'kpa-2', name: 'Pnömokok (KPA)', doseLabel: '2. doz', ageDays: 120 },
  { id: 'altili-3', name: 'Altılı Karma', doseLabel: '3. doz', ageDays: 180 },
  { id: 'opa-1', name: 'OPA (Oral Polio)', doseLabel: '1. doz', ageDays: 180 },
  { id: 'kkk-1', name: 'KKK (Kızamık-Kabakulak-Kızamıkçık)', doseLabel: '1. doz', ageDays: 365 },
  { id: 'sucicegi-1', name: 'Suçiçeği', doseLabel: '1. doz', ageDays: 365 },
  { id: 'kpa-pekistirme', name: 'Pnömokok (KPA)', doseLabel: 'Pekiştirme', ageDays: 365 },
  { id: 'altili-pekistirme', name: 'Altılı Karma', doseLabel: 'Pekiştirme', ageDays: 540 },
  { id: 'opa-2', name: 'OPA (Oral Polio)', doseLabel: '2. doz', ageDays: 540 },
  { id: 'hepa-1', name: 'Hepatit A', doseLabel: '1. doz', ageDays: 540 },
  { id: 'hepa-2', name: 'Hepatit A', doseLabel: '2. doz', ageDays: 730 },
  { id: 'kkk-2', name: 'KKK', doseLabel: '2. doz', ageDays: 1460 },
  { id: 'dabt-ipa-pekistirme', name: 'DaBT-İPA', doseLabel: 'Pekiştirme', ageDays: 1460 },
  { id: 'sucicegi-2', name: 'Suçiçeği', doseLabel: '2. doz', ageDays: 1460 },
  { id: 'td-pekistirme', name: 'Td (Tetanoz-Difteri)', doseLabel: 'Pekiştirme (13 yaş)', ageDays: 4745 },
]
