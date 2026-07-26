export type CollectiveImage = {
  id: string
  src: string
  alt: string
}

export const collectiveImages: CollectiveImage[] = Array.from({ length: 15 }, (_, i) => {
  const n = i + 1
  return {
    id: `collective-${n}`,
    src: `/images/collective/collective-${n}.jpg`,
    alt: `Da Money Fam Collective ${n}`,
  }
})
