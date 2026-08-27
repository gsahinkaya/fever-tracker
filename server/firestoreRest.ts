// Minimal Firestore REST client for the one thing notify-family.ts needs:
// reading a family's member list and each member's device tokens. Calls
// authenticated with a service-account access token run under IAM, not
// Firestore security rules, so this can read across users/families the way
// a client SDK call never could.
interface FirestoreDocument {
  name: string
  fields?: Record<string, FirestoreValue>
}
interface FirestoreValue {
  stringValue?: string
  booleanValue?: boolean
  mapValue?: { fields?: Record<string, FirestoreValue> }
}

function docUrl(projectId: string, path: string): string {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`
}

export async function getFamilyMemberUids(
  accessToken: string,
  projectId: string,
  familyId: string,
): Promise<string[]> {
  const res = await fetch(docUrl(projectId, `families/${familyId}`), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return []
  const data = (await res.json()) as FirestoreDocument
  const membersField = data.fields?.members?.mapValue?.fields ?? {}
  return Object.keys(membersField)
}

export async function getDeviceTokens(
  accessToken: string,
  projectId: string,
  uid: string,
): Promise<string[]> {
  const res = await fetch(docUrl(projectId, `users/${uid}/deviceTokens`), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return []
  const data = (await res.json()) as { documents?: FirestoreDocument[] }
  return (data.documents ?? []).map((d) => d.name.split('/').pop()!)
}
