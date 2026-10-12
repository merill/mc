// A post carries SeenOnlyIn when only one kind of source tenant returned it,
// for example only the education tenants that contribute to the archive.
export type SeenOnlyInLabel = {
  short: string
  label: string
  description: string
}

const seenOnlyInLabels: Record<string, SeenOnlyInLabel> = {
  edu: {
    short: "EDU",
    label: "Seen in EDU tenants",
    description:
      "We've only seen this message in Education (EDU) tenants. That usually means it's just for education, but it could also come down to licensing, or a rollout that hasn't reached our other tenants yet.",
  },
}

export function getSeenOnlyInLabel(
  value: string | null | undefined
): SeenOnlyInLabel | undefined {
  return value ? seenOnlyInLabels[value] : undefined
}
