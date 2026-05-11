import { NavLink, useNavigate } from 'react-router-dom';

const LOGO_URL = 'https://glonis.pe/cdn/shop/files/LOGO_WEB.webp?height=22&v=1761341530';
const ICON_URL = 'https://glonis.pe/cdn/shop/files/cloudio.webp?crop=center&height=32&v=1751428378&width=32';

const NAV_RECLUTAMIENTO = [
  { to: '/dashboard', label: 'Dashboard', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )},
  { to: '/vacantes', label: 'Vacantes', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )},
  { to: '/kanban', label: 'Tablero de selección', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  )},
  { to: '/calendario', label: 'Calendario de entrevistas', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )},
];

const NAV_CUENTA = [
  { to: '/usuarios', label: 'Configuración', adminOnly: true, icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )},
];

function getInitials(nombre) {
  if (!nombre) return '?';
  return nombre.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-pink-500', 'bg-emerald-500',
  'bg-orange-500', 'bg-sky-500', 'bg-rose-500', 'bg-teal-500',
];

function getAvatarColor(nombre) {
  if (!nombre) return AVATAR_COLORS[0];
  const idx = nombre.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

export default function Layout({ usuario, onLogout, children }) {
  const navigate = useNavigate();
  const esAdmin = usuario?.rol === 'ADMIN';

  function handleLogout() {
    onLogout();
    navigate('/login');
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar oscuro */}
      <aside className="w-[200px] shrink-0 bg-gray-900 flex flex-col">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <img src={ICON_URL} alt="Glonis" className="w-7 h-7 rounded" />
            <div>
              <img src={LOGO_URL} alt="GLONIS" className="h-4 brightness-0 invert" />
              <p className="text-[9px] text-gray-500 tracking-widest mt-0.5">ATS · v2.4</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto space-y-5">
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-2 mb-1.5">
              Reclutamiento
            </p>
            <div className="space-y-0.5">
              {NAV_RECLUTAMIENTO.map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`
                  }
                >
                  {icon}
                  {label}
                </NavLink>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-2 mb-1.5">
              Cuenta
            </p>
            <div className="space-y-0.5">
              {NAV_CUENTA.filter(item => !item.adminOnly || esAdmin).map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`
                  }
                >
                  {icon}
                  {label}
                </NavLink>
              ))}
              <a
                href="mailto:soporte@glonis.pe"
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Ayuda
              </a>
            </div>
          </div>
        </nav>

        {/* User */}
        <div className="px-3 py-3 border-t border-gray-800">
          <div className="flex items-center gap-2.5 mb-2">
            <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white ${getAvatarColor(usuario?.nombre)}`}>
              {getInitials(usuario?.nombre)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{usuario?.nombre}</p>
              <p className="text-[11px] text-gray-500 truncate">{usuario?.rol === 'ADMIN' ? 'Administrador' : 'Reclutador/a'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex-1 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
