'use client';

import { useState, useEffect } from 'react';

interface LinkItem {
  url: string;
  title: string;
  description?: string;
}

interface ContentData {
  instagram: string;
  links: Array<string | LinkItem>;
  address: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
}

export default function LinksEditor() {
  const [contentData, setContentData] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>('');

  // Load content data on mount
  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const response = await fetch('/api/content');
      if (response.ok) {
        const data = await response.json();
        setContentData(data);
      } else {
        setStatus('❌ Failed to load content');
      }
    } catch (error) {
      setStatus('❌ Failed to load content');
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveContent = async () => {
    if (!contentData) return;

    setSaving(true);
    setStatus('Saving...');

    try {
      const response = await fetch('/api/content', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contentData),
      });

      if (response.ok) {
        setStatus('✅ Links saved successfully!');
        setTimeout(() => setStatus(''), 3000);
      } else {
        const error = await response.text();
        setStatus(`❌ Save failed: ${error}`);
      }
    } catch (error) {
      setStatus(`❌ Save failed: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const addLink = () => {
    if (!contentData) return;
    
    setContentData({
      ...contentData,
      links: [...contentData.links, { url: '', title: '', description: '' }]
    });
  };

  const removeLink = (index: number) => {
    if (!contentData) return;
    
    const newLinks = contentData.links.filter((_, i) => i !== index);
    setContentData({
      ...contentData,
      links: newLinks
    });
  };

  const updateLink = (index: number, field: 'url' | 'title' | 'description', value: string) => {
    if (!contentData) return;
    
    const newLinks = [...contentData.links];
    const link = newLinks[index];
    
    if (typeof link === 'string') {
      // Convert string link to object
      const newLinkObj: LinkItem = { url: link, title: '', description: '' };
      newLinkObj[field] = value;
      newLinks[index] = newLinkObj;
    } else {
      // Update existing object
      newLinks[index] = { ...link, [field]: value };
    }
    
    setContentData({
      ...contentData,
      links: newLinks
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p>Loading links...</p>
      </div>
    );
  }

  if (!contentData) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p>❌ Failed to load content data</p>
        <button onClick={loadContent} style={{ marginTop: '20px', padding: '10px 20px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      padding: '30px',
      border: '2px solid rgba(255,255,255,0.3)',
      borderRadius: '12px',
      backgroundColor: 'rgba(255,255,255,0.1)',
      marginTop: '30px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <h3 style={{
          margin: '0',
          fontSize: '1.5rem',
          fontWeight: 'bold'
        }}>
          Edit Community Links
        </h3>
        <div>
          <button
            onClick={addLink}
            disabled={saving}
            style={{
              padding: '10px 20px',
              marginRight: '10px',
              fontSize: '1rem',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '6px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'inherit',
              cursor: 'pointer'
            }}
          >
            + Add Link
          </button>
          <button
            onClick={saveContent}
            disabled={saving}
            style={{
              padding: '10px 20px',
              fontSize: '1rem',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '6px',
              backgroundColor: 'rgba(0,255,0,0.2)',
              color: 'inherit',
              cursor: 'pointer'
            }}
          >
            {saving ? 'Saving...' : 'Save Links'}
          </button>
        </div>
      </div>

      {status && (
        <p style={{
          margin: '0 0 20px 0',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          {status}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {contentData.links.map((link, index) => {
          const linkData = typeof link === 'string' ? { url: link, title: '', description: '' } : link;
          
          return (
            <div
              key={index}
              style={{
                padding: '20px',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                backgroundColor: 'rgba(255,255,255,0.05)'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '15px',
                gap: '15px'
              }}>
                <strong style={{ minWidth: '60px' }}>#{index + 1}</strong>
                <button
                  onClick={() => removeLink(index)}
                  style={{
                    padding: '8px 15px',
                    fontSize: '0.9rem',
                    border: '1px solid rgba(255,0,0,0.3)',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(255,0,0,0.2)',
                    color: 'inherit',
                    cursor: 'pointer',
                    marginLeft: 'auto'
                  }}
                >
                  Remove
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', opacity: 0.8 }}>URL</label>
                  <input
                    type="url"
                    placeholder="Enter URL (e.g., https://example.com)"
                    value={linkData.url}
                    onChange={(e) => updateLink(index, 'url', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '1rem',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      color: 'inherit'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', opacity: 0.8 }}>Title (optional - will fallback to scraped metadata)</label>
                  <input
                    type="text"
                    placeholder="Custom title for this link"
                    value={linkData.title || ''}
                    onChange={(e) => updateLink(index, 'title', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '1rem',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      color: 'inherit'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', opacity: 0.8 }}>Description (optional - will fallback to scraped metadata)</label>
                  <textarea
                    placeholder="Custom description for this link"
                    value={linkData.description || ''}
                    onChange={(e) => updateLink(index, 'description', e.target.value)}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '1rem',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      color: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {contentData.links.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: 'rgba(255,255,255,0.6)'
        }}>
          <p>No links yet. Click &quot;Add Link&quot; to get started!</p>
        </div>
      )}
    </div>
  );
}