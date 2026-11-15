/* (From the group site.) The Freedom system, laid out round Freedom Group Enterprise at the centre with the seven operating worlds on the three
   dotted rings: Global on the inner ring in front; Fly (front right), Distribution (back right), Facilities (back left)
   and Form (front left) on the middle ring; Freight (left) and Fuel (right) on the outer ring. Units: Freedom Global's
   radius is 14.
   On this portfolio the worlds are these, but they stand as the group's hierarchy: each on its own ring where the page
   has left room for it (w-system.js works that out), so the places and rings below are only where they start. */

export const LIGHT_DIR = [-0.42, 0.55, 0.72];

/* the dotted rings round the centre: every operating world sits exactly on one, level with the centre */
export const RINGS = [155, 230, 372];
const onRing = (ring, deg) => { const a = deg * Math.PI / 180, r = RINGS[ring]; return [+(Math.cos(a) * r).toFixed(2), 0, +(Math.sin(a) * r).toFixed(2)]; };

export const WORLDS = {
  enterprise: { kind: 'pinkEarth', R: 20, pos: [0, 0, 0], spin: 0.02, tilt: 0.3, orbitK: 3.0, cloudK: 0.1,   // little cloud: the logo's globe is sea and land
    atmo: { day: [1.0, 0.3, 0.62], dusk: [1.0, 0.55, 0.78], power: 4.4, strength: 0.46, shell: 1.03 }, glow: '#ff5fae', cloud: [1.0, 0.86, 0.93], name: 'Freedom Group Enterprise' },
  global: { kind: 'gas', R: 14, pos: onRing(0, 87.8), map: 'neptune', ramp: [[0.12, 0.38, 0.92], [0.88, 0.96, 1.0]], bands: 1.4, storm: 0, flow: 0.004, limbDark: 0.45, detail: 0.5, expo: 1.35, spin: 0.03, tilt: 0.25, orbitK: 2.8,
    atmo: { day: [0.45, 0.72, 1.0], dusk: [0.4, 0.5, 0.95], power: 4.2, strength: 0.6, shell: 1.03, inner: 0.5 }, glow: '#6fb6ff', cloud: [0.7, 0.84, 1.0], name: 'Freedom Global' },
  facilities: { kind: 'rock', R: 11, pos: onRing(1, -115.0), map: 'moon', normal: 'moon-normal', normalScale: 0.7, ramp: [[0.02, 0.26, 0.18], [0.6, 1.0, 0.8]], hex: 1, detail: 0.3, spin: 0.02, tilt: 0.2, orbitK: 2.8,
    atmo: { day: [0.3, 0.95, 0.7], dusk: [0.2, 0.7, 0.55], power: 4.6, strength: 0.5, shell: 1.03, inner: 0.45 }, glow: '#2fe2a0', cloud: [0.8, 1.0, 0.9], name: 'Freedom Facilities' },
  distribution: { kind: 'rock', R: 10, pos: onRing(1, -60.0), map: 'mars', normal: 'mars-normal', normalScale: 0.9, detail: 0.6, spin: 0.02, tilt: 0.44, orbitK: 2.8,
    atmo: { day: [0.98, 0.6, 0.4], dusk: [0.9, 0.35, 0.15], power: 5.0, strength: 0.36, shell: 1.02, inner: 0.35 }, glow: '#ff7a3d', cloud: [1.0, 0.8, 0.65], name: 'Freedom Distribution' },
  form: { kind: 'gas', R: 12, pos: onRing(1, 149.9), map: 'saturn', tint: [1.0, 0.9, 0.62], flow: 0.0016, limbDark: 0.5, detail: 0.3, spin: 0.03, tilt: 0.42, orbitK: 3.3,
    ring: { map: 'saturn-ring', inner: 1.3, outer: 2.25, tone: 1.05 },
    atmo: { day: [1.0, 0.9, 0.6], dusk: [1.0, 0.65, 0.35], power: 4.5, strength: 0.3, shell: 1.02, inner: 0.3 }, glow: '#f2c94c', cloud: [1.0, 0.95, 0.8], name: 'Freedom Form' },
  freight: { kind: 'gas', R: 13, pos: onRing(2, -160.0), map: 'jupiter', flow: 0.0022, limbDark: 0.55, detail: 0.35, spin: 0.03, tilt: 0.05, orbitK: 2.8,
    atmo: { day: [1.0, 0.9, 0.75], dusk: [1.0, 0.6, 0.3], power: 4.5, strength: 0.32, shell: 1.02, inner: 0.3 }, glow: '#e9b86a', cloud: [1.0, 0.92, 0.8], name: 'Freedom Freight' },
  fly: { kind: 'gas', R: 11, pos: onRing(1, 40.1), map: 'jupiter', ramp: [[0.2, 0.06, 0.38], [0.84, 0.7, 0.98]], flow: 0.003, limbDark: 0.5, detail: 0.4, spin: 0.03, tilt: 0.35, orbitK: 2.8,
    atmo: { day: [0.7, 0.45, 1.0], dusk: [0.5, 0.3, 0.9], power: 4.3, strength: 0.55, shell: 1.03, inner: 0.45 }, glow: '#b48cff', cloud: [0.9, 0.82, 1.0], name: 'Freedom Fly' },
  fuel: { kind: 'gas', R: 9, pos: onRing(2, -9.9), map: 'uranus', ramp: [[0.06, 0.08, 0.4], [0.5, 0.58, 1.0]], bands: 1, flow: 0.0012, limbDark: 0.5, detail: 0.4, spin: 0.025, tilt: 1.2, orbitK: 3.0,
    ring: { map: 'thin-ring', inner: 1.6, outer: 1.95, tone: 0.8 },
    atmo: { day: [0.45, 0.5, 1.0], dusk: [0.35, 0.3, 0.9], power: 4.2, strength: 0.5, shell: 1.03, inner: 0.45 }, glow: '#7d8cff', cloud: [0.8, 0.84, 1.0], name: 'Freedom Fuel' }
};
