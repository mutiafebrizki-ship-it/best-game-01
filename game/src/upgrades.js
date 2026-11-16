// Emberfall: the between-wave upgrade offer. Three distinct upgrades the
// keeper has not maxed out yet, drawn at random.

import { UPGRADES } from './config.js';

export function rollOffers(rng, taken) {
  const available = UPGRADES.filter((u) => (taken[u.id] || 0) < u.max);
  const pool = available.length >= 3 ? available : UPGRADES.filter((u) => (taken[u.id] || 0) < u.max + 2);
  const offers = [];
  const copy = pool.slice();
  while (offers.length < 3 && copy.length > 0) {
    const i = Math.floor(rng.next() * copy.length);
    offers.push(copy.splice(i, 1)[0]);
  }
  return offers;
}
