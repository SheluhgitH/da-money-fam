export type CollectiveImage = {
  id: string
  src: string
  alt: string
}

const COLLECTIVE_ORDER = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1] as const

export const collectiveImages: CollectiveImage[] = COLLECTIVE_ORDER.map((n) => ({
  id: `collective-${n}`,
  src: `/images/collective/collective-${n}.jpg`,
  alt: `Da Money Fam Collective ${n}`,
}))
