export function getAvatarUrl(employee) {
  const photo = employee?.photo;
  if (typeof photo === 'string' && photo.trim()) return photo;

  const name = typeof employee?.name === 'string' && employee.name.trim() ? employee.name : 'Colaborador';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e2e8f0&color=0f172a`;
}
