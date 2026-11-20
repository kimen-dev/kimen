import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: [
    '<ki-chip-group label="Team" type="filter"><ki-chip selected value="design">Design</ki-chip><ki-chip value="eng">Engineering</ki-chip><ki-chip disabled>Legal</ki-chip></ki-chip-group>',
    '<ki-chip-group label="Recipients" type="input" reorderable><ki-chip value="ana" removable>Ana García</ki-chip><ki-chip size="sm" value="luis" removable>Luis</ki-chip><ki-chip value="team">Design team</ki-chip></ki-chip-group>',
    '<ki-chip-group label="Actions" type="assist"><ki-chip>Add to calendar</ki-chip><ki-chip size="sm">Directions</ki-chip></ki-chip-group>',
  ].join(''),
} satisfies VisualGallery;
