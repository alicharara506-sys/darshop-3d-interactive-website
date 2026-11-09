// What the 3D home page (main.js) tells the React hero: the language, the scroll stage and
// the stage of the build in the spotlight, and what the hero can ask the 3D scene to do.
let state = { lang: null, stage: 0, build: null, spotOn: true, shelfTools: [] };
const listeners = new Set();

export function setHeroState(patch) {
  state = { ...state, ...patch };
  listeners.forEach(fn => fn());
}
export const getHeroState = () => state;
export function subscribeHero(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// go(stage), step(±1), pause(bool), focus(brand or null), tool(id or null), shelf({ bay, job }), addToOrder(product ids). Set by main.js once the scene is running.
export const heroActions = { go(stage) {}, step(d) {}, pause(on) {}, focus(brand) {}, tool(id) {}, shelf(sel) {}, addToOrder(ids) {} };
export function registerHeroActions(actions) { Object.assign(heroActions, actions); }
