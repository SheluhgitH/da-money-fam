import type { UseInViewOptions } from 'framer-motion'

/** Trigger scroll animations early — tuned for mobile viewports. */
export const scrollRevealInView: UseInViewOptions = {
  once: true,
  amount: 0.08,
  margin: '0px 0px -80px 0px',
}

export const scrollRevealViewport = {
  once: true,
  amount: 0.08,
  margin: '0px 0px -80px 0px',
} as const
