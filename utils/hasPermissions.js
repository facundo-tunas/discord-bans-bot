export function hasModeratorRole(member) {
  const allowedRoles = ["FIA", "HOST MOD", "Staff"];
  return member.roles.cache.some((role) => allowedRoles.includes(role.name));
}
