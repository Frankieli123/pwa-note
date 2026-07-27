import crypto from 'crypto'
import { NextResponse } from 'next/server'

export function verifyMaintenanceRequest(request: Request): NextResponse | null {
  const expected = process.env.MAINTENANCE_API_KEY
  const provided = request.headers.get('x-maintenance-key')

  if (!expected || !provided) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const expectedBuffer = Buffer.from(expected)
  const providedBuffer = Buffer.from(provided)
  const valid = expectedBuffer.length === providedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, providedBuffer)

  return valid ? null : NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
