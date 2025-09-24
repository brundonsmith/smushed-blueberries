import Image from "next/image";
import { getPosterImageColors } from "./poster";

import contentData from '../../smushed_content.json'
import { headers } from "next/headers";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

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

type LinkMetadata = typeof contentData['links'][number]

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
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";

  const origin = `${proto}://${host}`;
  const { backgroundColor, textColor, accentColor } = await getPosterImageColors(origin);

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
            src='/smushed_poster.jpeg'
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
              {contentData.links.length > 0 && (
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
                    {contentData.links.map((metadata, index) => (
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
