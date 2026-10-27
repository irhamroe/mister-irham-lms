import React from 'react';

/**
 * Returns 2 uppercase initials for a student or person name.
 * e.g., "Achmad Zakky Fanani" -> "AZ", "Siti Rahmawati" -> "SR", "Budi" -> "BU"
 */
export function getStudentInitials(name) {
  if (!name || typeof name !== 'string') return 'SW';
  const clean = name.replace(/[^a-zA-Z\s]/g, ' ').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'SW';
  if (words.length === 1) {
    const w = words[0];
    return (w.length >= 2 ? w.slice(0, 2) : w + w).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Palette of accessible and visually pleasing avatar colors
 */
export const AVATAR_PALETTE = [
  { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' }, // Blue
  { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' }, // Green
  { bg: '#FAF5FF', text: '#7E22CE', border: '#E9D5FF' }, // Purple
  { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3' }, // Rose
  { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' }, // Amber
  { bg: '#ECFEFF', text: '#0E7490', border: '#A5F3FC' }, // Cyan
  { bg: '#FDF4FF', text: '#A21CAF', border: '#F5D0FE' }, // Fuchsia
  { bg: '#F0FDFA', text: '#0F766E', border: '#99F6E4' }, // Teal
  { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE' }  // Indigo
];

/**
 * Deterministically pick an avatar color based on name
 */
export function getAvatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}

/**
 * Student Avatar Component displaying 2-letter initials in a circle
 */
export function StudentAvatar({
  name = '',
  size = 32,
  className = '',
  style = {},
  title
}) {
  const initials = getStudentInitials(name);
  const color = getAvatarColor(name);
  const fontSize = Math.max(10, Math.round(size * 0.4));

  return (
    <div
      className={`student-initials-avatar ${className}`.trim()}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: '50%',
        backgroundColor: color.bg,
        color: color.text,
        border: `1.5px solid ${color.border}`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: `${fontSize}px`,
        letterSpacing: '0.02em',
        userSelect: 'none',
        flexShrink: 0,
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
        ...style
      }}
      title={title || name || 'Siswa'}
    >
      {initials}
    </div>
  );
}

export default StudentAvatar;

