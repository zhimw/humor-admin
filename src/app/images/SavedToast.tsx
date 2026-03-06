'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function SavedToast() {
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (searchParams.get('saved') === '1') {
      setVisible(true);
      // Remove ?saved=1 from URL without a page reload
      const url = new URL(window.location.href);
      url.searchParams.delete('saved');
      window.history.replaceState(null, '', url.toString());

      const t = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '1.5rem',
      right: '1.5rem',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      gap: '0.6rem',
      padding: '0.65rem 1.1rem',
      borderRadius: '0.6rem',
      border: '1px solid rgba(34, 197, 94, 0.5)',
      background: 'rgba(22, 163, 74, 0.15)',
      backdropFilter: 'blur(8px)',
      color: 'rgb(74 222 128)',
      fontSize: '0.85rem',
      fontWeight: 500,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      animation: 'fadeInUp 0.2s ease',
    }}>
      ✓ Changes saved
    </div>
  );
}
