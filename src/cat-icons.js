// Line icons for the 11 shop categories (drawn for DAR, in the style of
// TOTAL's category row: a simple tool glyph inside a circle).
const wrap = inner => `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="22"/>${inner}</svg>`;

export const CAT_ICONS = {
  // drill
  power: wrap('<path d="M12 18h17a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3h-4l-2 9h-6l2-9h-7z"/><path d="M32 20h4M32 23h4"/><path d="M15 34h10"/>'),
  // saw blade
  accessories: wrap('<circle cx="24" cy="24" r="10"/><circle cx="24" cy="24" r="3"/><path d="M24 11v3M24 34v3M11 24h3M34 24h3M15 15l2 2M31 31l2 2M15 33l2-2M31 17l2-2"/>'),
  // generator
  generators: wrap('<rect x="12" y="16" width="24" height="16" rx="2"/><path d="M16 32v3M32 32v3M20 13h8"/><path d="M25 19l-4 6h5l-3 5"/>'),
  // welding machine
  welding: wrap('<rect x="12" y="15" width="20" height="17" rx="2"/><path d="M16 20h6M16 24h6M16 28h4"/><path d="M28 19l-2 4h3l-2 4"/><path d="M32 28c4 0 4 6 1 7"/>'),
  // concrete mixer / small construction
  construction: wrap('<path d="M14 20l12-5 6 9-12 5z"/><path d="M20 29l-3 6M31 25l3 10M13 35h23"/><circle cx="17" cy="35" r="1.6"/>'),
  // air compressor
  air: wrap('<rect x="11" y="21" width="26" height="11" rx="5.5"/><path d="M17 21v-4h8v4M29 17v4"/><circle cx="16" cy="34" r="2"/><circle cx="32" cy="34" r="2"/>'),
  // water pump
  pumps: wrap('<rect x="13" y="18" width="16" height="12" rx="2"/><path d="M17 18v12M21 18v12M25 18v12"/><path d="M29 22h4v-4h3M29 26h6"/><path d="M14 33h14"/>'),
  // pliers + screwdriver
  hand: wrap('<path d="M18 12l2 9-2 15M22 21l-6 14"/><path d="M29 12v10"/><rect x="27" y="22" width="4" height="13" rx="2"/>'),
  // tape measure
  measure: wrap('<circle cx="22" cy="24" r="9"/><circle cx="22" cy="24" r="3"/><path d="M22 33h14v-3h-4"/>'),
  // hard hat + goggles
  safety: wrap('<path d="M12 25a12 12 0 0 1 24 0z"/><path d="M24 13v6M10 25h28"/><rect x="14" y="29" width="8" height="5" rx="2.5"/><rect x="26" y="29" width="8" height="5" rx="2.5"/><path d="M22 31h4"/>'),
  // lawn mower
  garden: wrap('<path d="M12 30h17l3-7"/><path d="M32 23l4-9"/><rect x="13" y="24" width="15" height="6" rx="2"/><circle cx="16" cy="33" r="2.5"/><circle cx="27" cy="33" r="2.5"/>'),
  all: wrap('<rect x="14" y="14" width="8" height="8" rx="1.5"/><rect x="26" y="14" width="8" height="8" rx="1.5"/><rect x="14" y="26" width="8" height="8" rx="1.5"/><rect x="26" y="26" width="8" height="8" rx="1.5"/>'),
};
