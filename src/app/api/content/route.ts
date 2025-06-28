import { put, list } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

interface ContentData {
  instagram: string;
  links: Array<string | { url: string; title: string; description?: string }>;
  address: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
}

// GET - Read current content
export async function GET() {
  try {
    const { blobs } = await list({ prefix: 'smushed_content.json' });

    if (blobs.length === 0) {
      // Fallback to local file
      const fs = await import('fs/promises');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'smushed_content.json');
      const fileContent = await fs.readFile(filePath, 'utf-8');
      return NextResponse.json(JSON.parse(fileContent));
    }

    const response = await fetch(blobs[0].url);
    const content = await response.json();
    return NextResponse.json(content);
  } catch (error) {
    console.error('Error fetching content:', error);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}

// PUT - Update content
export async function PUT(request: NextRequest) {
  try {
    const updatedContent: ContentData = await request.json();

    // Validate the content structure
    if (!updatedContent.links || !Array.isArray(updatedContent.links)) {
      return NextResponse.json({ error: 'Invalid content structure' }, { status: 400 });
    }

    // Convert to JSON string
    const jsonContent = JSON.stringify(updatedContent, null, 2);

    // Upload to blob storage (this will overwrite the existing file)
    const blob = await put('smushed_content.json', jsonContent, {
      allowOverwrite: true,
      access: 'public',
      contentType: 'application/json',
    });

    console.log('Updated content:', blob.url);

    return NextResponse.json({
      success: true,
      url: blob.url,
      message: 'Content updated successfully'
    });

  } catch (error) {
    console.error('Content update error:', error);
    return NextResponse.json(
      { error: 'Failed to update content' },
      { status: 500 }
    );
  }
}