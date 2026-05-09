import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import Avatar from '../components/ui/Avatar';

const AREAS = ['VENTAS', 'CAJA', 'ALMACEN', 'VISUAL', 'OTRO'];
const ESTADOS = ['ACTIVA', 'PAUSADA', 'CERRADA'];

const ESTADO_STYLE = {
  ACTIVA:  { dot: 'bg-emerald-400', badge: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  PAUSADA: { dot: 'bg-amber-400',   badge: 'text-amber-700 bg-amber-50 border-amber-200'     },
  CERRADA: { dot: 'bg-gray-400',    badge: 'text-gray-600 bg-gray-100 border-gray-200'        },
};

const AREA_LABEL = { VENTAS: 'Ventas en tienda', CAJA: 'Caja', ALMACEN: 'Almacén', VISUAL: 'Visual', OTRO: 'Operaciones' };

const EMPTY_FORM = { titulo: '', area: 'VENTAS', descripcion: '', requisitos: '', tipoContrato: '', turno: '', fechaCierre: '' };

function PipelineBar({ pct = 0, estado }) {
  const color = estado === 'ACTIVA' ? 'bg-indigo-500' : estado === 'PAUSADA' ? 'bg-amber-400' : 'bg-gray-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function Vacantes() {
  const navigate = useNavigate();
  const { data: vacantes, loading, refetch } = useApi('/api/vacantes');
  const [tabEstado, setTabEstado] = useState('TODAS');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [copied, setCopied] = useState(null);

  const todas = vacantes || [];
  const tabs = [
    { key: 'TODAS',   label: 'Todas',   count: todas.length },
    { key: 'ACTIVA',  label: 'Activas',  count: todas.filter(v => v.estado === 'ACTIVA').length },
    { key: 'PAUSADA', label: 'Pausadas', count: todas.filter(v => v.estado === 'PAUSADA').length },
    { key: 'CERRADA', label: 'Cerradas', count: todas.filter(v => v.estado === 'CERRADA').length },
  ];
  const lista = tabEstado === 'TODAS' ? todas : todas.filter(v => v.estado === tabEstado);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.post('/api/vacantes', { ...form, fechaCierre: form.fechaCierre || null });
      await refetch();
      setModal(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function copyLink(e, slug) {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/postular/${slug}`);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Vacantes</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {todas.length} vacantes · {todas.reduce((s, v) => s + (v._count?.postulaciones || 0), 0)} postulantes activos
          </p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setFormError(''); setModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva vacante
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-gray-200">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTabEstado(key)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tabEstado === key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
              tabEstado === key ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'
            }`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Cargando vacantes...</div>
      ) : lista.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No hay vacantes en esta categoría</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {lista.map((v) => {
            const s = ESTADO_STYLE[v.estado] || ESTADO_STYLE.CERRADA;
            const total = v._count?.postulaciones || 0;
            const pct = total > 0 ? Math.min(100, Math.round((total / 50) * 100)) : 0;
            return (
              <div
                key={v.id}
                onClick={() => navigate(`/vacantes/${v.id}`)}
                className="bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-md hover:border-gray-300 cursor-pointer transition-all group"
              >
                {/* Estado + área */}
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    <span className={`text-xs font-semibold border rounded-full px-2 py-0.5 ${s.badge}`}>
                      {v.estado}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-400 font-medium">{AREA_LABEL[v.area] || v.area}</span>
                  <div className="ml-auto">
                    <button
                      onClick={(e) => copyLink(e, v.slug)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      {copied === v.slug ? '¡Copiado!' : 'Copiar link'}
                    </button>
                  </div>
                </div>

                {/* Título */}
                <h3 className="font-semibold text-gray-900 mb-0.5 group-hover:text-indigo-700 transition-colors">
                  {v.titulo}
                </h3>
                <p className="text-xs text-gray-400 mb-3">{v.tipoContrato} · {v.turno}</p>

                {/* Postulantes */}
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                  <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {total} postulante{total !== 1 ? 's' : ''}
                  </div>
                  {v.fechaCierre && (
                    <div className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Cierra {new Date(v.fechaCierre).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                    </div>
                  )}
                </div>

                {/* Pipeline bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Pipeline</span>
                  </div>
                  <PipelineBar pct={pct} estado={v.estado} />
                </div>

                {/* Avatares */}
                <div className="flex items-center -space-x-1">
                  {Array.from({ length: Math.min(4, total) }).map((_, i) => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-500">
                      {String.fromCharCode(65 + (i * 3) % 26)}
                    </div>
                  ))}
                  {total > 4 && (
                    <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-500">
                      +{total - 4}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nueva vacante */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900">Nueva vacante</h3>
                <p className="text-xs text-gray-400 mt-0.5">Define los detalles base — podrás ajustar el cuestionario después.</p>
              </div>
              <button onClick={() => setModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-lg">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Título de la vacante *</label>
                <input value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  placeholder="Asesora de Ventas Senior" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Área *</label>
                  <select value={form.area} onChange={e => setForm({...form, area: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400">
                    {AREAS.map(a => <option key={a} value={a}>{AREA_LABEL[a]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de contrato *</label>
                  <input value={form.tipoContrato} onChange={e => setForm({...form, tipoContrato: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                    placeholder="Tiempo completo" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Turno *</label>
                  <input value={form.turno} onChange={e => setForm({...form, turno: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                    placeholder="Mañana / Tarde / Noche" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha cierre</label>
                  <input type="date" value={form.fechaCierre} onChange={e => setForm({...form, fechaCierre: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción y responsabilidades *</label>
                <textarea value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})}
                  rows={3} required
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none"
                  placeholder="Buscamos asesoras con vocación de servicio..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Requisitos *</label>
                <textarea value={form.requisitos} onChange={e => setForm({...form, requisitos: e.target.value})}
                  rows={2} required
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none"
                  placeholder="Experiencia mínima en ventas retail..." />
              </div>
              {formError && <p className="text-sm text-red-600 bg-red-50 px-3.5 py-2.5 rounded-xl border border-red-100">{formError}</p>}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-gray-400">Paso 1 de 3 · Datos básicos</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                  <button type="submit" disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-xl transition-colors">
                    {saving ? 'Guardando...' : <>Continuar <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg></>}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
