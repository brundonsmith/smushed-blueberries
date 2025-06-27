import Image from "next/image";
import { list } from '@vercel/blob';
import sharp from 'sharp';
import { kv } from '@vercel/kv';

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

async function getContentData(): Promise<ContentData | null> {
  try {
    // First try to load from blob storage
    const { blobs } = await list({ prefix: 'smushed_content' });

    if (blobs.length > 0) {
      const latestBlob = blobs.sort((a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      )[0];

      const response = await fetch(latestBlob.url);
      if (response.ok) {
        const contentData = await response.json();
        return contentData;
      }
    }

    // Fallback to local file system
    const fs = await import('fs/promises');
    const path = await import('path');
    const contentPath = path.join(process.cwd(), 'smushed_content.json');

    try {
      const fileContent = await fs.readFile(contentPath, 'utf8');
      const contentData = JSON.parse(fileContent);
      return contentData;
    } catch {
      console.log('No smushed_content.json found locally');
      return null;
    }
  } catch (error) {
    console.error('Error fetching content data:', error);
    return null;
  }
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

      // Use blob URL as cache key (it changes when image changes)
      const imageHash = latestBlob.url.split('/').pop()?.split('.')[0] || 'unknown';
      const cacheKey = `image-colors:${imageHash}`;
      
      // Check cache first for colors
      try {
        const cached = await kv.get(cacheKey);
        if (cached) {
          console.log('Using cached image colors');
          // Still need to fetch the image for data URI
          const response = await fetch(latestBlob.url);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            imageBuffer = Buffer.from(arrayBuffer);
            contentType = response.headers.get('content-type') || 'image/png';
            
            const dataUri = `data:${contentType};base64,${imageBuffer.toString('base64')}`;
            return {
              dataUri,
              ...(cached as { backgroundColor: string; textColor: string; accentColor: string })
            };
          }
        }
      } catch {
        console.log('Cache miss for image colors');
      }

      // Fetch the image
      const response = await fetch(latestBlob.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
      contentType = response.headers.get('content-type') || 'image/png';
      
      // Extract colors from the image
      const backgroundColor = await extractEdgeColors(imageBuffer);
      const textColor = getContrastingColor(backgroundColor);
      const accentColor = getComplementaryAccent(backgroundColor);
      
      // Cache the colors (but not the data URI since it's large)
      const colorData = {
        backgroundColor: `rgb(${backgroundColor.join(', ')})`,
        textColor,
        accentColor
      };
      
      try {
        await kv.set(cacheKey, colorData, { ex: 60 * 60 * 24 * 7 }); // Cache for 1 week
        console.log('Cached image colors');
      } catch (cacheError) {
        console.log('Failed to cache colors:', cacheError);
      }
      
      // Convert to data URI
      const dataUri = `data:${contentType};base64,${imageBuffer.toString('base64')}`;
      
      return {
        dataUri,
        ...colorData
      };
    }

    // For local images, extract colors normally (no caching)
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

function InstagramEmbed({ username }: { username: string }) {
  if (!username) return null;

  return (
    <div style={{ margin: '40px 0', textAlign: 'center' }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: '1.8rem', fontWeight: 'bold' }}>
        Follow on Instagram
      </h3>
      <div style={{
        border: '1px solid #ddd',
        borderRadius: '12px',
        padding: '20px',
        maxWidth: '500px',
        margin: '0 auto',
        backgroundColor: 'rgba(255,255,255,0.1)'
      }}>
        <a
          href={`https://instagram.com/${username}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            fontSize: '1.2rem'
          }}
        >
          📸 @{username}
        </a>
      </div>
    </div>
  );
}

function LinkPreviewCard({ metadata, accentColor }: {
  metadata: LinkMetadata;
  accentColor: string;
}) {
  return (
    <div style={{
      border: `2px solid ${accentColor}`,
      borderRadius: '12px',
      backgroundColor: 'rgba(255,255,255,0.1)',
      transition: 'transform 0.2s',
      cursor: 'pointer',
      padding: '24px',
      minHeight: '160px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <a
        href={metadata.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          textDecoration: 'none',
          color: 'inherit',
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}
      >
        <h4 style={{
          margin: '0 0 12px 0',
          fontSize: '1.3rem',
          fontWeight: 'bold',
          lineHeight: '1.3'
        }}>
          {metadata.title}
        </h4>
        {metadata.description && (
          <p style={{
            margin: '0 0 16px 0',
            opacity: 0.8,
            fontSize: '0.95rem',
            lineHeight: '1.5',
            flex: 1
          }}>
            {metadata.description.substring(0, 200)}{metadata.description.length > 200 ? '...' : ''}
          </p>
        )}
        <div style={{
          fontSize: '0.85rem',
          opacity: 0.7,
          fontWeight: '500',
          marginTop: 'auto'
        }}>
          {new URL(metadata.url).hostname}
        </div>
      </a>
    </div>
  );
}

interface LinkMetadata {
  title: string;
  description?: string;
  url: string;
}

async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
  // Check cache first
  const cacheKey = `link-metadata:${url}`;
  try {
    const cached = await kv.get(cacheKey);
    if (cached) {
      console.log(`Using cached metadata for ${url}`);
      return cached as LinkMetadata;
    }
  } catch {
    console.log('Cache miss for', url);
  }
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // Extract Open Graph and Twitter metadata with more comprehensive patterns
    const titleMatches = [
      html.match(/<meta\s+property="og:title"\s+content="([^"]*)"[^>]*>/i),
      html.match(/<meta\s+name="twitter:title"\s+content="([^"]*)"[^>]*>/i),
      html.match(/<title[^>]*>([^<]*)<\/title>/i)
    ];

    const descriptionMatches = [
      html.match(/<meta\s+property="og:description"\s+content="([^"]*)"[^>]*>/i),
      html.match(/<meta\s+name="twitter:description"\s+content="([^"]*)"[^>]*>/i),
      html.match(/<meta\s+name="description"\s+content="([^"]*)"[^>]*>/i)
    ];

    const titleMatch = titleMatches.find(match => match)?.[1];
    const descriptionMatch = descriptionMatches.find(match => match)?.[1];

    // For social media, prefer our custom title extraction over scraped titles
    const isSocialMedia = url.includes('instagram.com') || url.includes('facebook.com') || url.includes('twitter.com') || url.includes('x.com');

    let title: string;
    if (isSocialMedia) {
      title = getDomainTitle(url);
    } else {
      title = titleMatch?.trim() || getDomainTitle(url);
      // Decode HTML entities
      title = title.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
        .replace(/&#x([a-f\d]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
    }

    let description = descriptionMatch?.trim();
    if (description) {
      // Decode HTML entities in descriptions
      description = description.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
        .replace(/&#x([a-f\d]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
    }

    const result = {
      title,
      description,
      url
    };
    
    // Cache the result
    try {
      await kv.set(cacheKey, result, { ex: 60 * 60 * 24 * 3 }); // Cache for 3 days
      console.log(`Cached metadata for ${url}`);
    } catch (cacheError) {
      console.log('Failed to cache metadata:', cacheError);
    }
    
    return result;
  } catch (error) {
    console.error(`Error fetching metadata for ${url}:`, error);
    const fallback = {
      title: getDomainTitle(url),
      url
    };
    
    // Cache fallback for shorter time to retry sooner
    try {
      await kv.set(cacheKey, fallback, { ex: 60 * 60 }); // Cache for 1 hour
    } catch (cacheError) {
      console.log('Failed to cache fallback metadata:', cacheError);
    }
    
    return fallback;
  }
}

function getDomainTitle(url: string): string {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');

    // Extract usernames for social media platforms
    if (domain.includes('facebook.com')) {
      const match = url.match(/facebook\.com\/(@?[\w.]+)/);
      if (match) {
        const username = match[1].replace('@', '');
        return `@${username} on Facebook`;
      }
    }

    if (domain.includes('instagram.com')) {
      const match = url.match(/(?:www\.)?instagram\.com\/(\w+)/);
      if (match) {
        return `@${match[1]} on Instagram`;
      }
    }

    if (domain.includes('twitter.com') || domain.includes('x.com')) {
      const match = url.match(/(?:twitter|x)\.com\/(\w+)/);
      if (match) {
        return `@${match[1]} on X`;
      }
    }

    if (domain.includes('linkedin.com')) {
      const match = url.match(/linkedin\.com\/in\/([^/?]+)/);
      if (match) {
        return `${match[1]} on LinkedIn`;
      }
    }

    // Default to domain name
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  } catch {
    return url;
  }
}

function AddressDisplay({ addressData, accentColor }: { 
  addressData: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  accentColor: string;
}) {
  if (!addressData) return null;

  return (
    <div style={{ margin: '40px 0' }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: '1.8rem', fontWeight: 'bold', textAlign: 'center' }}>
        Location
      </h3>
      <div style={{
        border: `2px solid ${accentColor}`,
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '400px',
        margin: '0 auto',
        backgroundColor: 'rgba(255,255,255,0.1)',
        textAlign: 'center'
      }}>
        <address style={{
          fontStyle: 'normal',
          lineHeight: '1.6',
          fontSize: '1.1rem'
        }}>
          <div style={{
            fontSize: '1.3rem',
            fontWeight: 'bold',
            marginBottom: '12px'
          }}>
            {addressData.name}
          </div>
          <div style={{ marginBottom: '8px' }}>
            {addressData.address}
          </div>
          <div>
            {addressData.city}, {addressData.state} {addressData.zip}
          </div>
        </address>
      </div>
    </div>
  );
}

export default async function Home() {
  const { dataUri, backgroundColor, textColor, accentColor } = await getPosterImageDataAndColors();
  const contentData = await getContentData();

  // Fetch metadata for all links server-side
  let linkMetadata: LinkMetadata[] = [];
  if (contentData?.links) {
    const metadataPromises = contentData.links.map(async (link) => {
      const url = typeof link === 'string' ? link : link.url;
      if (typeof link === 'string') {
        return await fetchLinkMetadata(url);
      } else {
        return {
          title: link.title,
          description: link.description,
          url: link.url
        };
      }
    });

    linkMetadata = await Promise.all(metadataPromises);
  }

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
        }}>Smushed Blueberries 🫐</h1>
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

        {contentData && (
          <>
            {/* Instagram Section */}
            {contentData.instagram && (
              <InstagramEmbed username={contentData.instagram} />
            )}

            {/* Links Section */}
            {linkMetadata.length > 0 && (
              <div style={{ margin: '40px 0', width: '100%', maxWidth: '800px' }}>
                <h3 style={{
                  margin: '0 0 20px 0',
                  fontSize: '1.8rem',
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}>
                  Community links!
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '20px',
                  padding: '0 20px'
                }}>
                  {linkMetadata.map((metadata, index) => (
                    <LinkPreviewCard
                      key={index}
                      metadata={metadata}
                      accentColor={accentColor}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Address Section */}
            {contentData.address && (
              <AddressDisplay 
                addressData={contentData.address} 
                accentColor={accentColor}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
