'use client'

import { Suspense } from 'react'
import SignupForm from './SignupForm'

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-matte-black" />}>
      <SignupForm />
    </Suspense>
  )
}
