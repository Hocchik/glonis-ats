import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { PUESTO_LABEL, PUESTOS_AGRUPADOS, TURNO_PREFERIDO_LABEL } from '../lib/puestos';

const ESTADO_STYLE = {
  ACTIVA:  { dot: 'bg-emerald-400', badge: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  PAUSADA: { dot: 'bg-amber-400',   badge: 'text-amber-700 bg-amber-50 border-amber-200'     },
  CERRADA: { dot: 'bg-gray-400',    badge: 'text-gray-600 bg-gray-100 border-gray-200'        },
};

const CONTRATOS_OPCIONES = ['Tiempo completo', 'Medio tiempo', 'Part-time', 'Por horas', 'Temporal', 'Practicante'];
const TURNOS_PREFERIDOS = ['MANANA', 'TARDE', 'AMBOS'];

const EMPTY_FORM = {
  titulo: '', puesto: 'ASESOR_VENTAS', descripcion: '', requisitos: '',
  tiposContrato: [], turnoPreferido: 'AMBOS', fechaCierre: '', estado: 'ACTIVA',
};

function parseLista(str) {
  if (!str) return [];
  return str.split(/\s*[,/]\s*/).filter(Boolean);
}

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

function ChipToggle({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
        active
          ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
      }`}
    >
      {label}
    </button>
  );
}

export default function Vacantes() {
  const navigate = useNavigate();
  const { data: vacantes, loading, refetch } = useApi('/api/vacantes');
  const [tabEstado, setTabEstado] = useState('TODAS');
  const [modal, setModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [copied, setCopied] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const todas = vacantes || [];
  const tabs = [
    { key: 'TODAS',   label: 'Todas',   count: todas.length },
    { key: 'ACTIVA',  label: 'Activas',  count: todas.filter(v => v.estado === 'ACTIVA').length },
    { key: 'PAUSADA', label: 'Pausadas', count: todas.filter(v => v.estado === 'PAUSADA').length },
    { key: 'CERRADA', label: 'Cerradas', count: todas.filter(v => v.estado === 'CERRADA').length },
  ];
  const lista = tabEstado === 'TODAS' ? todas : todas.filter(v => v.estado === tabEstado);

  function abrirCrear() {
    setModoEdicion(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModal(true);
  }

  function abrirEditar(e, v) {
    e.stopPropagation();
    setModoEdicion(v);
    setForm({
      titulo: v.titulo,
      puesto: v.puesto,
      descripcion: v.descripcion,
      requisitos: v.requisitos,
      tiposContrato: parseLista(v.tipoContrato),
      turnoPreferido: v.turnoPreferido || 'AMBOS',
      fechaCierre: v.fechaCierre ? v.fechaCierre.slice(0, 10) : '',
      estado: v.estado,
    });
    setFormError('');
    setModal(true);
  }

  function toggleItem(arr, item) {
    return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (form.tiposContrato.length === 0) {
      setFormError('Selecciona al menos un tipo de contrato.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        titulo: form.titulo,
        puesto: form.puesto,
        descripcion: form.descripcion,
        requisitos: form.requisitos,
        tipoContrato: form.tiposContrato.join(', '),
        turnoPreferido: form.turnoPreferido,
        fechaCierre: form.fechaCierre || null,
      };
      if (modoEdicion) {
        await api.put(`/api/vacantes/${modoEdicion.id}`, body);
        if (form.estado !== modoEdicion.estado) {
          await api.patch(`/api/vacantes/${modoEdicion.id}/estado`, { estado: form.estado });
        }
      } else {
        await api.post('/api/vacantes', body);
      }
      await refetch();
      setModal(false);
      setForm(EMPTY_FORM);
      setModoEdicion(null);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.del(`/api/vacantes/${id}`);
      await refetch();
      setConfirmDelete(null);
    } catch (err) {
      alert(err.message);
      setConfirmDelete(null);
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
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Vacantes</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {todas.length} vacantes · {todas.reduce((s, v) => s + (v._count?.postulaciones || 0), 0)} postulantes activos
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva vacante
        </button>
      </div>

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
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    <span className={`text-xs font-semibold border rounded-full px-2 py-0.5 ${s.badge}`}>
                      {v.estado}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-400 font-medium">{PUESTO_LABEL[v.puesto] || v.puesto}</span>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={(e) => copyLink(e, v.slug)}
                      title="Copiar link público"
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      {copied === v.slug ? '¡Copiado!' : 'Copiar'}
                    </button>
                    <button
                      onClick={(e) => abrirEditar(e, v)}
                      title="Editar"
                      className="text-gray-400 hover:text-indigo-600 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(v); }}
                      title="Eliminar"
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-gray-900 mb-0.5 group-hover:text-indigo-700 transition-colors">
                  {v.titulo}
                </h3>
                <p className="text-xs text-gray-400 mb-3">{v.tipoContrato} · Turno {TURNO_PREFERIDO_LABEL[v.turnoPreferido] || v.turnoPreferido}</p>

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

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Postulaciones</span>
                  </div>
                  <PipelineBar pct={pct} estado={v.estado} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900">{modoEdicion ? 'Editar vacante' : 'Nueva vacante'}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{modoEdicion ? 'Ajusta los datos y el estado de la vacante.' : 'Define los detalles base de la vacante.'}</p>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Puesto *</label>
                  <select value={form.puesto} onChange={e => setForm({...form, puesto: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400">
                    {PUESTOS_AGRUPADOS.map(({ grupo, puestos }) => (
                      <optgroup key={grupo} label={grupo}>
                        {puestos.map(p => <option key={p} value={p}>{PUESTO_LABEL[p]}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha cierre</label>
                  <input type="date" value={form.fechaCierre} onChange={e => setForm({...form, fechaCierre: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de contrato * <span className="text-gray-400 font-normal">(uno o varios)</span></label>
                <div className="flex flex-wrap gap-1.5">
                  {CONTRATOS_OPCIONES.map(c => (
                    <ChipToggle key={c} label={c} active={form.tiposContrato.includes(c)}
                      onClick={() => setForm({ ...form, tiposContrato: toggleItem(form.tiposContrato, c) })} />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Turno preferido *</label>
                <select value={form.turnoPreferido} onChange={e => setForm({...form, turnoPreferido: e.target.value})}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400">
                  {TURNOS_PREFERIDOS.map(t => <option key={t} value={t}>{TURNO_PREFERIDO_LABEL[t]}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1.5">Informativo para el score — un candidato full-time siempre suma 100; uno part-time gana 75 si su turno coincide.</p>
              </div>

              {modoEdicion && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
                  <div className="flex gap-1.5">
                    {['ACTIVA', 'PAUSADA', 'CERRADA'].map(e => (
                      <ChipToggle key={e} label={e} active={form.estado === e}
                        onClick={() => setForm({ ...form, estado: e })} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {form.estado === 'PAUSADA' && 'No recibirá nuevas postulaciones. El link público estará deshabilitado.'}
                    {form.estado === 'CERRADA' && 'La vacante quedará archivada. El link público estará deshabilitado.'}
                    {form.estado === 'ACTIVA' && 'Aceptando postulaciones desde el link público.'}
                  </p>
                </div>
              )}

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

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-xl transition-colors">
                  {saving ? 'Guardando...' : (modoEdicion ? 'Guardar cambios' : 'Crear vacante')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="font-semibold text-gray-900 mb-2">Eliminar vacante</h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Seguro que deseas eliminar <span className="font-semibold">{confirmDelete.titulo}</span>?
              Esta acción no se puede deshacer. Si la vacante tiene postulaciones, no podrá eliminarse — debes cerrarla.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete.id)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
