'use client';

import { useState } from 'react';

export default function UploadComponent() {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus('Uploading...');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload-poster', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setUploadStatus('✅ Poster uploaded successfully!');
        // Reload page to see new colors
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const error = await response.text();
        setUploadStatus(`❌ Upload failed: ${error}`);
      }
    } catch (error) {
      setUploadStatus(`❌ Upload failed: ${error}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{
      width: '100%',
      padding: '30px',
      border: '2px dashed rgba(255,255,255,0.3)',
      borderRadius: '12px',
      textAlign: 'center',
      backgroundColor: 'rgba(255,255,255,0.1)'
    }}>
      <h3 style={{
        margin: '0 0 20px 0',
        fontSize: '1.5rem',
        fontWeight: 'bold'
      }}>
        Upload New Poster
      </h3>
      
      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        disabled={uploading}
        style={{
          margin: '20px 0',
          padding: '10px',
          fontSize: '1rem',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '6px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          color: 'inherit'
        }}
      />
      
      {uploadStatus && (
        <p style={{
          margin: '20px 0 0 0',
          fontSize: '1.1rem',
          fontWeight: 'bold'
        }}>
          {uploadStatus}
        </p>
      )}
    </div>
  );
}