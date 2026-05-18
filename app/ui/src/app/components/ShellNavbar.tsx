// app/components/ShellNavbar.tsx
"use client";

/**
 * Minimal top bar for onboarding flow pages.
 * Uses overflow: hidden + text-overflow: ellipsis so the brand name
 * clips gracefully on narrow screens instead of overflowing.
 */
export default function ShellNavbar() {
  return (
    <header style={{
      height: '48px',
      background: '#ffffff',
      borderBottom: '1px solid #e8e8e8',
      display: 'flex',
      alignItems: 'center',
      paddingLeft: '20px',
      paddingRight: '20px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      minWidth: 0,
      overflow: 'hidden',
    }}>
      <span style={{
        fontSize: '12px',
        fontWeight: 700,
        letterSpacing: '0.08em',
        color: '#111',
        textTransform: 'uppercase',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        minWidth: 0,
      }}>
        Delivery Optimizer
      </span>
    </header>
  );
}
