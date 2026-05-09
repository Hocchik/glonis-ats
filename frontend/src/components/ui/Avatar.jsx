const COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-pink-500', 'bg-emerald-500',
  'bg-orange-500', 'bg-sky-500', 'bg-rose-500', 'bg-teal-500',
  'bg-amber-500', 'bg-cyan-500', 'bg-fuchsia-500', 'bg-lime-500',
];

export function getAvatarColor(str) {
  if (!str) return COLORS[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function getInitials(nombre) {
  if (!nombre) return '?';
  return nombre.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

export default function Avatar({ nombre, size = 'md' }) {
  const sizeClass = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
    xl: 'w-12 h-12 text-base',
  }[size] || 'w-8 h-8 text-xs';

  return (
    <div className={`${sizeClass} ${getAvatarColor(nombre)} rounded-full flex items-center justify-center font-bold text-white shrink-0`}>
      {getInitials(nombre)}
    </div>
  );
}
