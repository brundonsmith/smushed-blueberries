import Image from "next/image";
import { list } from '@vercel/blob';

async function getPosterImageDataUri() {
  try {
    const { blobs } = await list({ prefix: 'smushed_poster' });
    
    let imageUrl;
    if (blobs.length === 0) {
      // Use local image as fallback
      const fs = await import('fs/promises');
      const path = await import('path');
      const imagePath = path.join(process.cwd(), 'public', 'smushed_poster.png');
      const imageBuffer = await fs.readFile(imagePath);
      return `data:image/png;base64,${imageBuffer.toString('base64')}`;
    } else {
      // Get the most recent blob
      const latestBlob = blobs.sort((a, b) => 
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      )[0];
      imageUrl = latestBlob.url;
    }
    
    // Fetch the image and convert to data URI
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'image/png';
    
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error('Error fetching image:', error);
    // Fallback to local image
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const imagePath = path.join(process.cwd(), 'public', 'smushed_poster.png');
      const imageBuffer = await fs.readFile(imagePath);
      return `data:image/png;base64,${imageBuffer.toString('base64')}`;
    } catch (fallbackError) {
      console.error('Fallback image also failed:', fallbackError);
      return '/smushed_poster.png'; // Last resort - regular URL
    }
  }
}

export default async function Home() {
  const posterImageDataUri = await getPosterImageDataUri();
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: '100%'
      }}>
        <h1 style={{ margin: '0 0 8px 0', textAlign: 'center' }}>Smushed Blueberries</h1>
        <h2 style={{ margin: '0 0 20px 0', textAlign: 'center' }}>...stories, poems, and other juice</h2>
        <Image
          src={posterImageDataUri}
          alt="Smushed Blueberries Poster"
          width={800}
          height={1200}
          style={{
            maxHeight: 'calc(100vh - 140px)',
            maxWidth: '100%',
            width: 'auto',
            height: 'auto'
          }}
          priority
        />
      </div>
    </div>
  );
}
