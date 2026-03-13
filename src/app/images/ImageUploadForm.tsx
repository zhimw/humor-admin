'use client';

import { useState, type FormEvent } from 'react';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB client-side limit

type Props = {
  action: (formData: FormData) => void;
};

export function ImageUploadForm({ action }: Props) {
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    setError(null);

    const form = e.currentTarget;
    const fileInput = form.elements.namedItem('image_file') as HTMLInputElement | null;
    const file = fileInput?.files?.[0] ?? null;

    if (!file) {
      return; // required attribute will handle this case
    }

    if (file.size > MAX_IMAGE_BYTES) {
      e.preventDefault();
      setError('Image is too large. Please choose a file under 10 MB.');
    }
  }

  return (
    <form
      action={action}
      encType="multipart/form-data"
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
    >
      {error && (
        <p style={{ color: 'rgb(248 113 113)', fontSize: '0.8rem', margin: 0 }}>
          {error}
        </p>
      )}
      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>
          Image File <span style={{ color: 'rgb(248 113 113)' }}>*</span>
        </label>
        <input
          name="image_file"
          type="file"
          accept="image/*"
          required
          className="input"
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>
          Image description
        </label>
        <textarea
          name="image_description"
          rows={3}
          className="input"
          placeholder="Describe what's in the image…"
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>
          Additional context
        </label>
        <textarea
          name="additional_context"
          rows={2}
          className="input"
          placeholder="Any extra context for captioning…"
        />
      </div>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <label className="pill-toggle">
          <input type="hidden" name="is_common_use" value="false" />
          <input type="checkbox" name="is_common_use" value="true" />
          Common use pool
        </label>
        <label className="pill-toggle">
          <input type="hidden" name="is_public" value="false" />
          <input type="checkbox" name="is_public" value="true" />
          Publicly visible
        </label>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <a
          href="/images"
          style={{
            textDecoration: 'none',
            fontSize: '0.75rem',
            padding: '0.35rem 0.8rem',
            borderRadius: '999px',
            border: '1px solid rgba(148,163,184,0.6)',
            color: 'rgb(226 232 240)',
            background: 'rgba(15,23,42,0.85)',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          Cancel
        </a>
        <button type="submit" className="button" style={{ fontSize: '0.8rem' }}>
          Create image
        </button>
      </div>
    </form>
  );
}

