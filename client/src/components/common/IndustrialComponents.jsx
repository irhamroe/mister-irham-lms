import React from 'react';

/**
 * Industrial Skeuomorphism - Core UI Signature Components
 * - Tactile realism, physical lighting, mechanical details (Dieter Rams & Teenage Engineering vibe)
 */

/**
 * LED Status Indicator with bloom glow & optional pulse
 * @param {'online' | 'alert' | 'warning' | 'offline'} status
 * @param {string} label - Uppercase monospace technical label
 */
export function LedIndicator({ status = 'online', label, pulse = true, size = 'sm' }) {
  const sizePx = size === 'lg' ? 12 : size === 'md' ? 10 : 8;

  const colorMap = {
    online: {
      color: '#22c55e',
      glow: '0 0 10px 2px rgba(34, 197, 94, 0.75)',
      defaultLabel: 'ONLINE'
    },
    alert: {
      color: '#ff4757',
      glow: '0 0 12px 3px rgba(255, 71, 87, 0.85)',
      defaultLabel: 'ALERT'
    },
    warning: {
      color: '#f59e0b',
      glow: '0 0 10px 2px rgba(245, 158, 11, 0.75)',
      defaultLabel: 'STANDBY'
    },
    offline: {
      color: '#718096',
      glow: 'none',
      defaultLabel: 'OFFLINE'
    }
  };

  const current = colorMap[status] || colorMap.online;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <div
        className={pulse && status !== 'offline' ? 'led-pulse-anim' : ''}
        style={{
          width: sizePx,
          height: sizePx,
          borderRadius: '50%',
          backgroundColor: current.color,
          boxShadow: current.glow,
          border: '1px solid rgba(255,255,255,0.6)',
          flexShrink: 0
        }}
      />
      {label !== undefined && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)'
          }}
        >
          {label || current.defaultLabel}
        </span>
      )}
    </div>
  );
}

/**
 * 3 Pill-shaped ventilation slots in top-right of industrial chassis panels
 */
export function VentSlots({ count = 3, height = 20 }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }} title="Cooling Vents">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: height,
            borderRadius: 9999,
            backgroundColor: 'var(--bg-recessed)',
            boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.25), inset -1px -1px 2px #ffffff'
          }}
        />
      ))}
    </div>
  );
}

/**
 * Stamped Technical Spec Badge (Industrial Chassis Stamping)
 */
export function TechnicalBadge({ children, variant = 'default', skew = false }) {
  const isOrange = variant === 'orange' || variant === 'accent';
  const isDark = variant === 'dark';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontFamily: 'var(--font-mono)',
        fontSize: '0.7rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        padding: '3px 8px',
        borderRadius: 4,
        background: isOrange
          ? '#ff4757'
          : isDark
          ? '#2d3436'
          : 'var(--bg-recessed)',
        color: isOrange || isDark ? '#ffffff' : 'var(--text-main)',
        boxShadow: isOrange
          ? '0 2px 6px rgba(255, 71, 87, 0.4)'
          : 'inset 1px 1px 2px rgba(0,0,0,0.15), 1px 1px 0 #ffffff',
        border: '1px solid rgba(0,0,0,0.08)',
        transform: skew ? 'skewX(-6deg)' : 'none'
      }}
    >
      {children}
    </span>
  );
}

/**
 * Horizontal mechanical cylindrical pipe connecting stages/modules
 */
export function MechanicalPipe({ label }) {
  return (
    <div
      style={{
        position: 'relative',
        height: 8,
        width: '100%',
        borderRadius: 9999,
        background: 'var(--bg-recessed)',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.22), 0 1px 0 #ffffff',
        margin: '18px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {label && (
        <span
          style={{
            position: 'absolute',
            background: 'var(--bg-chassis)',
            padding: '2px 10px',
            borderRadius: 4,
            fontFamily: 'var(--font-mono)',
            fontSize: '0.68rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
            boxShadow: 'var(--shadow-sharp)'
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

/**
 * Metal screw head element for corners of modular panels
 */
export function ScrewHead({ size = 12 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #babecc 70%, #8a9ba8 100%)',
        boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.4), 1px 1px 1px rgba(255,255,255,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}
    >
      <div
        style={{
          width: '70%',
          height: 1.5,
          background: 'rgba(45, 52, 54, 0.7)',
          transform: 'rotate(45deg)'
        }}
      />
    </div>
  );
}
