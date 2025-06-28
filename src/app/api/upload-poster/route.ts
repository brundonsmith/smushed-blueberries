import { put, del, list } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    // Delete existing poster if it exists
    try {
      const { blobs } = await list({ prefix: 'smushed_poster.png' });
      if (blobs.length > 0) {
        await del(blobs[0].url);
        console.log('Deleted existing poster');
      }
    } catch (deleteError) {
      console.log('No existing poster to delete or delete failed:', deleteError);
    }

    // Upload new poster
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const blob = await put('smushed_poster.png', buffer, {
      access: 'public',
      contentType: file.type,
    });

    console.log('Uploaded new poster:', blob.url);

    return NextResponse.json({ 
      success: true, 
      url: blob.url,
      message: 'Poster uploaded successfully' 
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' }, 
      { status: 500 }
    );
  }
}