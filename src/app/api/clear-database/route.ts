import { NextResponse } from 'next/server'

export async function POST() {
  const apiUrl = 'https://live-the-code-alphacoders-backend.onrender.com/clear-database'
  const response = await fetch(apiUrl, { method: 'POST' })

  const data = await response.json()
  return NextResponse.json(data)
}
