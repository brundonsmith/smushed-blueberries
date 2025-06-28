'use client';

import { useState } from 'react';

interface SecurityCheckProps {
  onAccessGranted: (secret: string) => void;
}

export default function SecurityCheck({ onAccessGranted }: SecurityCheckProps) {
  const [answer, setAnswer] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;

    setVerifying(true);
    setError('');

    try {
      const response = await fetch('/api/verify-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answer: answer.trim() }),
      });

      const result = await response.json();

      if (result.success) {
        // Store the secret in localStorage
        localStorage.setItem('admin_secret', result.secret);
        onAccessGranted(result.secret);
      } else {
        setError(result.message || 'Incorrect answer');
      }
    } catch (error) {
      setError('Verification failed. Please try again.');
      console.error('Verification error:', error);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '400px',
      padding: '30px',
      border: '2px solid rgba(255,255,255,0.3)',
      borderRadius: '12px',
      backgroundColor: 'rgba(255,255,255,0.1)',
      textAlign: 'center'
    }}>
      <h3 style={{
        margin: '0 0 20px 0',
        fontSize: '1.5rem',
        fontWeight: 'bold'
      }}>
        Access Required
      </h3>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '10px',
            fontSize: '1.1rem',
            textAlign: 'left'
          }}>
            Where is Meg from originally?
          </label>
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Enter your answer"
            disabled={verifying}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '1rem',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '6px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: 'inherit'
            }}
          />
        </div>

        {error && (
          <p style={{
            margin: '0 0 15px 0',
            color: 'rgba(255,100,100,1)',
            fontSize: '0.9rem'
          }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={verifying || !answer.trim()}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '1rem',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '6px',
            backgroundColor: verifying ? 'rgba(255,255,255,0.1)' : 'rgba(0,255,0,0.2)',
            color: 'inherit',
            cursor: verifying ? 'not-allowed' : 'pointer'
          }}
        >
          {verifying ? 'Verifying...' : 'Submit'}
        </button>
      </form>
    </div>
  );
}