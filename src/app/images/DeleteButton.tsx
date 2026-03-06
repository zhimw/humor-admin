'use client';

export default function DeleteButton({
  id,
  deleteAction,
}: {
  id: string;
  deleteAction: (fd: FormData) => Promise<void>;
}) {
  return (
    <form action={deleteAction} style={{ display: 'inline' }}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        onClick={(e) => {
          if (!confirm('Delete this image? This cannot be undone.')) {
            e.preventDefault();
          }
        }}
        style={{
          fontSize: '0.72rem',
          color: 'rgb(248 113 113)',
          padding: '0.2rem 0.5rem',
          border: '1px solid rgba(248,113,113,0.35)',
          borderRadius: '0.375rem',
          background: 'rgba(220,38,38,0.08)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Delete
      </button>
    </form>
  );
}
