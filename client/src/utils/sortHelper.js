const ROMAN_MAP = {
  'XII': '12',
  'XI': '11',
  'IX': '09',
  'X': '10',
  'VIII': '08',
  'VII': '07',
  'VI': '06',
  'IV': '04',
  'V': '05',
  'III': '03',
  'II': '02',
  'I': '01'
};

export function normalizeClassName(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .replace(/\b(XII|XI|IX|X|VIII|VII|VI|IV|V|III|II|I)\b/gi, (m) => ROMAN_MAP[m.toUpperCase()] || m);
}

export function compareClassesNatural(a, b) {
  const nameA = typeof a === 'string' ? a : (a?.name || a?.label || '');
  const nameB = typeof b === 'string' ? b : (b?.name || b?.label || '');
  const normA = normalizeClassName(nameA);
  const normB = normalizeClassName(nameB);
  const cmp = normA.localeCompare(normB, undefined, { numeric: true, sensitivity: 'base' });
  if (cmp !== 0) return cmp;
  return (a?.id || 0) - (b?.id || 0);
}

export function sortClassesNatural(list) {
  if (!Array.isArray(list)) return [];
  return [...list].sort(compareClassesNatural);
}

