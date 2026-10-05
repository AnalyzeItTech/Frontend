import { ImageResponse } from 'next/og';
import { SITE_NAME, SITE_TAGLINE } from './lib/site';

export const alt = `${SITE_NAME}: ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** The social preview for the whole site (links shared on social, chat apps and search results). */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: '#F3EDE4',
          color: '#322C28',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #E3836C, #E8C4A0)', display: 'flex' }} />
          <div style={{ fontSize: 40, letterSpacing: 2 }}>{SITE_NAME}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 76, lineHeight: 1.05, fontWeight: 600 }}>{SITE_TAGLINE}</div>
          <div style={{ fontSize: 34, color: '#5C534A' }}>Ask in plain words. Answers from live tools and your own data, with the sources shown.</div>
        </div>
        <div style={{ display: 'flex', gap: 28, fontSize: 28, color: '#C45A42' }}>
          <div style={{ display: 'flex' }}>Weather · FX · stocks · maps</div>
          <div style={{ display: 'flex' }}>Your data, permission first</div>
          <div style={{ display: 'flex' }}>Free to start</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
