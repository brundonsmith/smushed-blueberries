import Image from "next/image";
import { list } from '@vercel/blob';
import sharp from 'sharp';

function getContrastingColor(rgb: [number, number, number]): string {
  const [r, g, b] = rgb;
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // Return white for dark backgrounds, dark for light backgrounds
  return luminance > 0.5 ? '#2c2c2c' : '#f5f5f5';
}

function getComplementaryAccent(rgb: [number, number, number]): string {
  const [r, g, b] = rgb;
  // Create a subtle complementary color by shifting hue slightly
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  
  if (delta === 0) {
    // Gray background - use a warm accent
    return 'rgba(180, 140, 100, 0.8)';
  }
  
  // Find dominant channel and create subtle complement
  let accentR = r, accentG = g, accentB = b;
  
  if (r === max) {
    // Red dominant - shift toward cyan
    accentR = Math.max(0, r - 30);
    accentG = Math.min(255, g + 20);
    accentB = Math.min(255, b + 20);
  } else if (g === max) {
    // Green dominant - shift toward magenta
    accentR = Math.min(255, r + 20);
    accentG = Math.max(0, g - 30);
    accentB = Math.min(255, b + 20);
  } else {
    // Blue dominant - shift toward yellow
    accentR = Math.min(255, r + 20);
    accentG = Math.min(255, g + 20);
    accentB = Math.max(0, b - 30);
  }
  
  return `rgba(${accentR}, ${accentG}, ${accentB}, 0.7)`;
}

function extractEdgeColors(buffer: Buffer): Promise<[number, number, number]> {
  return new Promise(async (resolve) => {
    try {
      const image = sharp(buffer);
      const { width, height } = await image.metadata();
      
      if (!width || !height || width < 10 || height < 10) {
        resolve([255, 255, 255]); // Default white
        return;
      }
      
      
      // Get corners instead of full edges to avoid extraction issues
      const cornerSize = Math.min(10, Math.min(width, height) / 4);
      
      const corners = [
        // Top-left
        { left: 0, top: 0, width: cornerSize, height: cornerSize },
        // Top-right
        { left: width - cornerSize, top: 0, width: cornerSize, height: cornerSize },
        // Bottom-left
        { left: 0, top: height - cornerSize, width: cornerSize, height: cornerSize },
        // Bottom-right
        { left: width - cornerSize, top: height - cornerSize, width: cornerSize, height: cornerSize }
      ];
      
      let totalR = 0, totalG = 0, totalB = 0, totalPixels = 0;
      
      for (const corner of corners) {
        try {
          const cornerBuffer = await image
            .extract(corner)
            .raw()
            .toBuffer();
          
          for (let i = 0; i < cornerBuffer.length; i += 3) {
            totalR += cornerBuffer[i];
            totalG += cornerBuffer[i + 1];
            totalB += cornerBuffer[i + 2];
            totalPixels++;
          }
        } catch (cornerError) {
          console.warn('Error extracting corner:', cornerError);
          continue;
        }
      }
      
      if (totalPixels === 0) {
        resolve([255, 255, 255]); // Default white
        return;
      }
      
      const avgR = Math.round(totalR / totalPixels);
      const avgG = Math.round(totalG / totalPixels);
      const avgB = Math.round(totalB / totalPixels);
      
      resolve([avgR, avgG, avgB]);
    } catch (error) {
      console.error('Error extracting edge colors:', error);
      resolve([255, 255, 255]); // Default white
    }
  });
}

async function getPosterImageDataAndColors(): Promise<{ dataUri: string; backgroundColor: string; textColor: string; accentColor: string }> {
  try {
    const { blobs } = await list({ prefix: 'smushed_poster' });
    
    let imageBuffer: Buffer;
    let contentType = 'image/png';
    
    if (blobs.length === 0) {
      // Use local image as fallback
      const fs = await import('fs/promises');
      const path = await import('path');
      const imagePath = path.join(process.cwd(), 'public', 'smushed_poster.png');
      imageBuffer = await fs.readFile(imagePath);
    } else {
      // Get the most recent blob
      const latestBlob = blobs.sort((a, b) => 
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      )[0];
      
      // Fetch the image
      const response = await fetch(latestBlob.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
      contentType = response.headers.get('content-type') || 'image/png';
    }
    
    // Extract colors from the image
    const backgroundColor = await extractEdgeColors(imageBuffer);
    const textColor = getContrastingColor(backgroundColor);
    const accentColor = getComplementaryAccent(backgroundColor);
    
    // Convert to data URI
    const dataUri = `data:${contentType};base64,${imageBuffer.toString('base64')}`;
    
    return {
      dataUri,
      backgroundColor: `rgb(${backgroundColor.join(', ')})`,
      textColor,
      accentColor
    };
  } catch (error) {
    console.error('Error processing image:', error);
    // Fallback to local image
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const imagePath = path.join(process.cwd(), 'public', 'smushed_poster.png');
      const imageBuffer = await fs.readFile(imagePath);
      
      const backgroundColor = await extractEdgeColors(imageBuffer);
      const textColor = getContrastingColor(backgroundColor);
      const accentColor = getComplementaryAccent(backgroundColor);
      const dataUri = `data:image/png;base64,${imageBuffer.toString('base64')}`;
      
      return {
        dataUri,
        backgroundColor: `rgb(${backgroundColor.join(', ')})`,
        textColor,
        accentColor
      };
    } catch (fallbackError) {
      console.error('Fallback image also failed:', fallbackError);
      return {
        dataUri: '/smushed_poster.png',
        backgroundColor: 'white',
        textColor: '#2c2c2c',
        accentColor: 'rgba(180, 140, 100, 0.8)'
      };
    }
  }
}

export default async function Home() {
  const { dataUri, backgroundColor, textColor, accentColor } = await getPosterImageDataAndColors();
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px',
      boxSizing: 'border-box',
      backgroundColor,
      color: textColor
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: '100%'
      }}>
        <h1 style={{ 
          margin: '0 0 16px 0', 
          textAlign: 'center',
          fontSize: '3.5rem',
          fontWeight: 'bold',
          color: textColor,
          textShadow: `2px 2px 4px ${accentColor}, -1px -1px 2px rgba(0,0,0,0.3)`,
          filter: `drop-shadow(0 0 6px ${accentColor})`
        }}>Smushed Blueberries</h1>
        <h2 style={{ 
          margin: '0 0 32px 0', 
          textAlign: 'center',
          fontSize: '1.5rem',
          fontStyle: 'italic',
          color: textColor,
          opacity: 0.9,
          textShadow: `1px 1px 3px ${accentColor}`
        }}>...stories, poems, and other juice</h2>
        <hr style={{
          width: '60%',
          border: 'none',
          height: '2px',
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          margin: '0 0 40px 0',
          opacity: 0.8
        }} />
        <Image
          src={dataUri}
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
