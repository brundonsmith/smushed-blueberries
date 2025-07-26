import Image from "next/image";
import { list, put } from '@vercel/blob';
import { getPosterImageDataAndColors } from "./poster";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

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
  const { blobs } = await list({ prefix: 'smushed_content.json' });
  const response = await fetch(blobs[0]!.url);
  return await response.json()
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
  title?: string;
  description?: string;
  url: string;
}

async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {

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

    return {
      title,
      description,
      url
    };
  } catch (error) {
    console.error(`Error fetching metadata for ${url}:`, error);
    return {
      title: getDomainTitle(url),
      url
    };
  }
}

interface CachedLinkMetadata {
  timestamp: number;
  data: LinkMetadata[];
}

async function getCachedLinkMetadata(): Promise<LinkMetadata[] | null> {
  try {
    const { blobs } = await list({ prefix: 'link_metadata.json' });
    if (blobs.length === 0) {
      return null;
    }

    const response = await fetch(blobs[0].url);
    const cached: CachedLinkMetadata = await response.json();

    // Check if cache is expired (24 hours)
    const cacheAge = Date.now() - cached.timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (cacheAge > maxAge) {
      console.log('Link metadata cache expired');
      return null;
    }

    console.log('Using cached link metadata');
    return cached.data;
  } catch (error) {
    console.log('Failed to load cached link metadata:', error);
    return null;
  }
}

async function saveLinkMetadataCache(metadata: LinkMetadata[]): Promise<void> {
  try {
    const cacheData: CachedLinkMetadata = {
      timestamp: Date.now(),
      data: metadata
    };

    const json = JSON.stringify(cacheData);
    await put('link_metadata.json', json, {
      access: 'public',
      contentType: 'application/json'
    });

    console.log('Saved link metadata cache');
  } catch (error) {
    console.log('Failed to save link metadata cache:', error);
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
            marginBottom: '8px'
          }}>
            <Image
              src="/epoch_logo.png"
              alt={addressData.name}
              width={300}
              height={80}
              style={{
                maxHeight: '80px',
                maxWidth: '300px',
                height: 'auto',
                width: 'auto'
              }}
            />
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

  // Fetch metadata for all links server-side with caching
  let linkMetadata: LinkMetadata[] = [];

  if (contentData?.links) {
    // Try to load from cache first
    const cachedMetadata = await getCachedLinkMetadata();

    if (cachedMetadata && cachedMetadata.length === contentData.links.length) {
      // Use cached data if available and matches current links count
      linkMetadata = cachedMetadata;
      console.log('Using cached link metadata');
    } else {
      // Fetch fresh data
      console.log('Fetching fresh link metadata...');
      const metadataPromises = contentData.links.map(async (link) => {
        const normalized = typeof link === 'string' ? { url: link, title: undefined, description: undefined } : link
        const scraped = await fetchLinkMetadata(normalized.url);

        return {
          title: normalized.title || scraped.title,
          description: normalized.description || scraped.description,
          url: normalized.url
        };
      });

      linkMetadata = await Promise.all(metadataPromises);

      // Save to cache
      await saveLinkMetadataCache(linkMetadata);
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          html, body {
            background-color: ${backgroundColor};
            color: ${textColor}
          }
        `
      }} />
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '20px',
        boxSizing: 'border-box',
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
    </>
  );
}
