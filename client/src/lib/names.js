// Public-facing user name (issue #69): the display name a user set in
// Settings, falling back to their sign-in identifier. Use this anywhere
// another user's name is shown (leaderboard, battles, groups) so a rename
// applies everywhere at once.
export function publicName(user) {
  if (!user) return '?';
  return user.display_name || user.identifier || '?';
}
