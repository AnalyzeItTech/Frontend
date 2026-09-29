import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let title = 'AnalyzeIt result';
  let text = '';
  try {
    const res = await fetch(`${API}/v1/shares/${encodeURIComponent(token)}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = (await res.json()) as { title?: string; text?: string };
      title = data.title || title;
      text = (data.text || '').slice(0, 220);
    }
  } catch {
    /* preview still renders */
  }
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#F3EDE4',
          color: '#322C28',
          padding: 64,
        }}
      >
        <div style={{ fontSize: 22, letterSpacing: 4, color: '#C45A42' }}>ANALYZEIT</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 56, lineHeight: 1.1 }}>{title}</div>
          <div style={{ fontSize: 28, color: '#5C534A' }}>{text}</div>
        </div>
        <div style={{ fontSize: 22 }}>analyzeit.in</div>
      </div>
    ),
    size,
  );
}
