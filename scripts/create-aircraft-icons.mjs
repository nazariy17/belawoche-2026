import { writeFile } from 'node:fs/promises';
const fuselage='<path d="M29 4 Q32 -1 35 4 L37 47 35 59 29 59 27 47Z"/>';
const tail='<path d="M29 47 19 56 19 60 32 56 45 60 45 56 35 47Z"/>';
const swept='<path d="M28 20 3 39 3 44 29 35 35 35 61 44 61 39 36 20Z"/>';
const engine=(x,y)=>`<rect class="engine" x="${x}" y="${y}" width="5" height="12" rx="2.5" stroke="#092531" stroke-width="1.2"/>`;
const wide='<path d="M28 5 Q32 -2 36 5 L38 46 35 60 29 60 26 46Z"/><path d="M28 18 1 38 1 44 28 34 36 34 63 44 63 38 36 18Z"/>';
const icons={
 small:'<path d="M30 9 Q32 4 34 9 L35 47 33 57 31 57 29 47Z"/><path d="M9 23 55 23 57 29 7 29Z"/><path d="M22 48 42 48 44 53 20 53Z"/><path d="M23 7H41" stroke="#e5fff8" stroke-width="2"/>',
 medium:fuselage+'<path d="M29 23 10 32 10 37 30 32 34 32 54 37 54 32 35 23Z"/>'+tail+engine(21,36)+engine(38,36),
 large:fuselage+swept+tail+engine(19,25)+engine(40,25),
 'heavy-twin':wide+tail+engine(17,24)+engine(42,24),
 'heavy-four':wide+tail+engine(10,30)+engine(21,22)+engine(38,22)+engine(49,30),
 heavy:wide+tail,
 helicopter:'<ellipse cx="32" cy="27" rx="7" ry="13"/><path d="M30 34 34 34 34 56 30 56Z"/><path d="M23 53H41M7 8L57 45M7 45L57 8" stroke="#e5fff8" stroke-width="3" stroke-linecap="round"/>',
 unknown:'<path d="M32 7 48 49 32 41 16 49Z" fill="none" stroke="#e5fff8" stroke-width="3" stroke-linejoin="round"/>',
};
const palettes = { '': ['#647d91', '#e5eff4'], SWR: ['#d71920', '#fafafa'], DLH: ['#061b45', '#f7f8fa'], EZY: ['#ff6600', '#fff7ef'], BAW: ['#133b70', '#f8fafc'], EDW: ['#d71920', '#fcfcfc'], UAE: ['#16834d', '#f9f9f6'] };
for (const [name, original] of Object.entries(icons)) for (const [brand, [color, white]] of Object.entries(palettes)) {
  let body = original.replace(tail, tail.replace('<path', `<path fill="${color}"`));
  const airliner = ['medium', 'large', 'heavy-twin', 'heavy-four', 'heavy'].includes(name);
  const cockpit = airliner || name === 'small' ? '<path d="M29.5 9 Q32 7 34.5 9 L34.5 12 32 11 29.5 12Z" fill="#183c50" stroke="none"/>' : '';
  const windows = airliner ? Array.from({length: 11}, (_, i) => `<path d="M29 ${15 + i * 2.6}h.7 M34.3 ${15 + i * 2.6}h.7" stroke="#315062" stroke-width=".7"/>`).join('') : '';
  const panels = airliner ? `<path d="M7 39 26 29M38 29 57 39" fill="none" stroke="#8497a2" stroke-width=".6"/><path d="M31 47 32 56 33 47Z" fill="${color}"/><path d="M28 16V42" stroke="${color}" stroke-width=".7"/>` : '';
  const cross = brand === 'SWR' && airliner ? '<path d="M31 50h2v2h2v2h-2v2h-2v-2h-2v-2h2Z" fill="white" stroke="none"/>' : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="body"><stop stop-color="#8ea4b1"/><stop offset=".45" stop-color="${white}"/><stop offset=".65" stop-color="#fff"/><stop offset="1" stop-color="#8ea4b1"/></linearGradient></defs><g fill="url(#body)" stroke="#708894" stroke-width=".6" stroke-linejoin="round">${body}${panels}${cockpit}${windows}${cross}</g></svg>\n`;
  await writeFile(new URL(`../frontend/public/icons/aircraft/${name}${brand ? '-' + brand : ''}.svg`, import.meta.url), svg);
}
