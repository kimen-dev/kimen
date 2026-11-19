import { avatarPortrait, row } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

const avatarGroupMembers = [
  `<ki-avatar label="Ada Lovelace" src="${avatarPortrait}"></ki-avatar>`,
  '<ki-avatar label="Grace Hopper" initials="GH"></ki-avatar>',
  '<ki-avatar label="Alan Turing" initials="AT"></ki-avatar>',
  '<ki-avatar label="Unknown member"></ki-avatar>',
  '<ki-avatar label="Edsger Dijkstra" initials="ED"></ki-avatar>',
  '<ki-avatar label="Barbara Liskov" initials="BL"></ki-avatar>',
].join('');

export default {
  html: [
    // Uncapped: every member renders overlapped, no counter.
    row(`<ki-avatar-group>${avatarGroupMembers}</ki-avatar-group>`),
    // Capped: three members plus the exact "+3" overflow counter.
    row(`<ki-avatar-group max="3">${avatarGroupMembers}</ki-avatar-group>`),
    // Size override (S6): the group's sm metrics win over a member-declared
    // xl, so the stack stays uniform; four members plus "+2".
    row(
      `<ki-avatar-group size="sm" max="4"><ki-avatar label="Ada Lovelace" size="xl" src="${avatarPortrait}"></ki-avatar>` +
        '<ki-avatar label="Grace Hopper" initials="GH"></ki-avatar>' +
        '<ki-avatar label="Alan Turing" initials="AT"></ki-avatar>' +
        '<ki-avatar label="Unknown member"></ki-avatar>' +
        '<ki-avatar label="Edsger Dijkstra" initials="ED"></ki-avatar>' +
        '<ki-avatar label="Barbara Liskov" initials="BL"></ki-avatar></ki-avatar-group>',
    ),
  ].join(''),
} satisfies VisualGallery;
