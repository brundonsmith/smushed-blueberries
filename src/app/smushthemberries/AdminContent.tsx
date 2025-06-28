'use client';

import { useState, useEffect } from 'react';
import SecurityCheck from './SecurityCheck';
import UploadComponent from './UploadComponent';
import LinksEditor from './LinksEditor';

export default function AdminContent() {
  const [secret, setSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if secret is already stored in localStorage
    const storedSecret = localStorage.getItem('admin_secret');
    if (storedSecret) {
      setSecret(storedSecret);
    }
    setLoading(false);
  }, []);

  const handleAccessGranted = (newSecret: string) => {
    setSecret(newSecret);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!secret) {
    return <SecurityCheck onAccessGranted={handleAccessGranted} />;
  }

  return (
    <>
      <UploadComponent secret={secret} />
      <LinksEditor secret={secret} />
    </>
  );
}