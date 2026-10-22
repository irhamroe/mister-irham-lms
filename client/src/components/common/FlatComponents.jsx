import React from 'react';

/**
 * Flat Design - Common Graphic Elements
 * - Zero artificial depth (no shadows, no bevels, no textures)
 * - Color as structure & geometric purity
 * - Scale transformations for interactive feedback
 */

export function FlatBadge({ children, variant = 'primary', size = 'md' }) {
  const variantStyles = {
    primary: { background: '#3B82F6', color: '#FFFFFF' },
    secondary: { background: '#10B981', color: '#FFFFFF' },
    warning: { background: '#F59E0B', color: '#FFFFFF' },
    danger: { background: '#EF4444', color: '#FFFFFF' },
    muted: { background: '#F3F4F6', color: '#111827' },
    blueLight: { background: '#EFF6FF', color: '#1D4ED8' },
    greenLight: { background: '#ECFDF5', color: '#047857' },
    amberLight: { background: '#FFFBEB', color: '#B45309' },
    redLight: { background: '#FEF2F2', color: '#B91C1C' }
  };

  const current = variantStyles[variant] || variantStyles.primary;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
        borderRadius: '6px',
        fontSize: size === 'sm' ? '0.72rem' : '0.8rem',
        fontWeight: 700,
        letterSpacing: '0.02em',
        background: current.background,
        color: current.color,
        border: 'none',
        boxShadow: 'none'
      }}
    >
      {children}
    </span>
  );
}

export function FlatStatusDot({ status = 'online', size = 8 }) {
  const colors = {
    online: '#10B981',   // Emerald
    alert: '#EF4444',    // Red
    warning: '#F59E0B',  // Amber
    offline: '#9CA3AF'   // Gray 400
  };

  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: colors[status] || colors.online,
        display: 'inline-block',
        flexShrink: 0
      }}
    />
  );
}
