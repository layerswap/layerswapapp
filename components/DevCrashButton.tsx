// components/DevCrashButton.tsx
import React, { useState } from 'react'

type Props = { label?: string; message?: string }

export default function DevCrashButton({
  label = 'Throw Error',
  message = 'Intentional test error'
}: Props) {
  const [boom, setBoom] = useState(false)

  if (boom) {
    throw new Error(message)
  }

  return (
    <button
      type="button"
      onClick={() => setBoom(true)}
      className="px-3 py-2 rounded bg-red-500 text-white hover:bg-red-600 transition"
    >
      {label}
    </button>
  )
}
