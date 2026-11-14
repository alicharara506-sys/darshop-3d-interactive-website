import type { MascotLocale } from './mascot.config'

export const CART_ADDED = 'dar:mascot-cart-added'
export const SEARCH_EMPTY = 'dar:mascot-search-empty'

export function announceCartAdd(lang: MascotLocale) {
  document.dispatchEvent(new CustomEvent(CART_ADDED, { detail: lang }))
}

export function showMascotSearch(target: HTMLElement, lang: MascotLocale, kind: 'header' | 'shop', show: boolean) {
  target.hidden = !show
  document.dispatchEvent(new CustomEvent(SEARCH_EMPTY, { detail: { target, lang, kind, show } }))
}
