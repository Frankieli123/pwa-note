import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    message: "API测试正常",
    time: new Date().toISOString()
  });
} 