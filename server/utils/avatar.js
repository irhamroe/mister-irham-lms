/**
 * LMS Student & User Avatar Utilities
 * Generates crisp 2-letter initials avatar for students
 */

function getStudentInitials(name) {
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

const AVATAR_PALETTE = [
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

function getAvatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}

function generateInitialsAvatarDataUrl(name, size = 64) {
  const initials = getStudentInitials(name);
  const color = getAvatarColor(name);
  const fontSize = Math.round(size * 0.42);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<rect width="${size}" height="${size}" rx="${size / 2}" fill="${color.bg}" stroke="${color.border}" stroke-width="2"/>` +
    `<text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="${color.text}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="700">${initials}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

module.exports = {
  getStudentInitials,
  getAvatarColor,
  generateInitialsAvatarDataUrl,
  AVATAR_PALETTE
};
