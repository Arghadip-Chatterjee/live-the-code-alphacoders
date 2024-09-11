import { NextResponse } from 'next/server'

export async function POST() {
  const apiUrl = 'http://localhost:8000/clear-database'
  const response = await fetch(apiUrl, { method: 'POST' })

  const data = await response.json()
  return NextResponse.json(data)
}
