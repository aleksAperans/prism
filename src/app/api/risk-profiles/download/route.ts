import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const PROFILES_DIR = path.join(process.cwd(), 'src/lib/risk-profiles');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing profile id' },
        { status: 400 }
      );
    }
    
    const safeId = id.replace(/[^a-z0-9-]/gi, '-');
    const filePath = path.join(PROFILES_DIR, `${safeId}.yaml`);
    
    // Check if file exists and read its content
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      
      return new NextResponse(fileContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/yaml',
          'Content-Disposition': `attachment; filename="${safeId}.yaml"`
        }
      });
    } catch {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Failed to download risk profile:', error);
    return NextResponse.json(
      { error: 'Failed to download risk profile' },
      { status: 500 }
    );
  }
}