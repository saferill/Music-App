import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'icon.svg');
    const buffer = fs.readFileSync(filePath);
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error fetching icon:', error);
    return new NextResponse('Error fetching icon', { status: 500 });
  }
}
