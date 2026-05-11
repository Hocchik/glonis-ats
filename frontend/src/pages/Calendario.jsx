import { useState, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';

const ESTADO_COLOR = { PROGRAMADA: '#6366f1', REALIZADA: '#22c55e', CANCELADA: '#ef4444' };

const EMPTY_FORM = { vacanteId: '', postulacionId: '', fechaHora: '', modalidad: 'PRESENCIAL', notas: '' };

// Perú es UTC-5 (sin horario de verano). Tratamos los inputs como hora Perú.
const PERU_OFFSET_MS = 5 * 60 * 60 * 1000;

// Toma un ISO UTC y devuelve "YYYY-MM-DDTHH:mm" en hora Perú (para datetime-local input)
function utcToPeruLocal(iso) {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - PERU_OFFSET_MS;
  return new Date(ms).toISOString().slice(0, 16);
}

// Toma "YYYY-MM-DDTHH:mm" (interpretado como hora Perú) y devuelve ISO UTC
function peruLocalToUTC(localStr) {
  if (!localStr) return '';
  return new Date(localStr + ':00-05:00').toISOString();
}

export default function Calendario() {
  const { data: entrevistas, loading, refetch } = useApi('/api/entrevistas');
  const { data: postulaciones } = useApi('/api/postulaciones');
  const { data: vacantes } = useApi('/api/vacantes');

  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const postulacionesEntrevista = useMemo(
    () => (postulaciones || []).filter(p => p.etapa === 'ENTREVISTA'),
    [postulaciones]
  );

  const vacantesConCandidatos = useMemo(() => {
    const ids = new Set(postulacionesEntrevista.map(p => p.vacanteId));
    return (vacantes || []).filter(v => ids.has(v.id));
  }, [vacantes, postulacionesEntrevista]);

  const candidatosFiltrados = useMemo(() => {
    if (!form.vacanteId) return [];
    return postulacionesEntrevista.filter(p => p.vacanteId === form.vacanteId);
  }, [postulacionesEntrevista, form.vacanteId]);

  const events = (entrevistas || []).map((e) => {
    const color = ESTADO_COLOR[e.estado] || ESTADO_COLOR.PROGRAMADA;
    return {
      id: e.id,
      title: `${e.postulacion.candidato.nombre} — ${e.postulacion.vacante.titulo}`,
      start: e.fechaHora,
      backgroundColor: color,
      borderColor: color,
      textColor: '#ffffff',
      display: 'block',
      extendedProps: { entrevista: e },
    };
  });

  function abrirCrear() {
    setEditando(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModal(true);
  }

  function abrirEditar(e) {
    setEditando(e);
    setForm({
      vacanteId: e.postulacion.vacante.id,
      postulacionId: e.postulacion.id,
      fechaHora: utcToPeruLocal(e.fechaHora),
      modalidad: e.modalidad,
      notas: e.notas || '',
      estado: e.estado,
    });
    setFormError('');
    setModal(true);
  }

  async function handleSubmit(evt) {
    evt.preventDefault();
    setFormError('');
    if (!form.postulacionId) {
      setFormError('Selecciona un candidato en etapa Entrevista.');
      return;
    }
    setSaving(true);
    try {
      const fechaUTC = peruLocalToUTC(form.fechaHora);
      if (editando) {
        await api.put(`/api/entrevistas/${editando.id}`, {
          fechaHora: fechaUTC,
          modalidad: form.modalidad,
          notas: form.notas,
          estado: form.estado,
        });
      } else {
        await api.post('/api/entrevistas', {
          postulacionId: form.postulacionId,
          fechaHora: fechaUTC,
          modalidad: form.modalidad,
          notas: form.notas,
        });
      }
      await refetch();
      setModal(false);
      setEditando(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editando) return;
    if (!window.confirm(`¿Eliminar la entrevista de ${editando.postulacion.candidato.nombre}?`)) return;
    try {
      await api.del(`/api/entrevistas/${editando.id}`);
      await refetch();
      setModal(false);
      setEditando(null);
    } catch (err) {
      setFormError(err.message);
    }
  }

  function handleEventClick({ event }) {
    const e = event.extendedProps.entrevista;
    if (e) abrirEditar(e);
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Calendario de entrevistas</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {(entrevistas || []).length} entrevista{(entrevistas || []).length !== 1 ? 's' : ''} programada{(entrevistas || []).length !== 1 ? 's' : ''} · solo candidatos en etapa Entrevista
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          + Agendar entrevista
        </button>
      </div>

      <div className="flex gap-4 mb-4 text-xs">
        {Object.entries(ESTADO_COLOR).map(([estado, color]) => (
          <div key={estado} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-gray-500 capitalize">{estado.toLowerCase()}</span>
          </div>
        ))}
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-gray-200 p-4 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400">Cargando...</div>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={esLocale}
            events={events}
            eventClick={handleEventClick}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek',
            }}
            height="100%"
          />
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">{editando ? 'Editar entrevista' : 'Agendar entrevista'}</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {!editando && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vacante *</label>
                    <select
                      value={form.vacanteId}
                      onChange={(e) => setForm({ ...form, vacanteId: e.target.value, postulacionId: '' })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      required
                    >
                      <option value="">Seleccionar vacante...</option>
                      {vacantesConCandidatos.map((v) => (
                        <option key={v.id} value={v.id}>{v.titulo}</option>
                      ))}
                    </select>
                    {vacantesConCandidatos.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1.5">No hay candidatos en etapa Entrevista. Muévelos primero desde el tablero de selección.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Candidato *</label>
                    <select
                      value={form.postulacionId}
                      onChange={(e) => setForm({ ...form, postulacionId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:bg-gray-50"
                      required
                      disabled={!form.vacanteId}
                    >
                      <option value="">{form.vacanteId ? 'Seleccionar candidato...' : 'Selecciona primero una vacante'}</option>
                      {candidatosFiltrados.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.candidato.nombre} · score {Math.round(p.scoreTotal)}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {editando && (
                <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-sm">
                  <p className="font-medium text-gray-900">{editando.postulacion.candidato.nombre}</p>
                  <p className="text-xs text-gray-500">{editando.postulacion.vacante.titulo}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y hora *</label>
                <input
                  type="datetime-local"
                  value={form.fechaHora}
                  onChange={(e) => setForm({ ...form, fechaHora: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modalidad *</label>
                <select
                  value={form.modalidad}
                  onChange={(e) => setForm({ ...form, modalidad: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  <option value="PRESENCIAL">Presencial</option>
                  <option value="VIDEOLLAMADA">Videollamada</option>
                </select>
              </div>

              {editando && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="PROGRAMADA">Programada</option>
                    <option value="REALIZADA">Realizada</option>
                    <option value="CANCELADA">Cancelada</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
                />
              </div>

              {formError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}

              <div className="flex items-center justify-between pt-2">
                {editando ? (
                  <button type="button" onClick={handleDelete}
                    className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                    Eliminar
                  </button>
                ) : <span />}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    {saving ? 'Guardando...' : editando ? 'Guardar cambios' : 'Agendar'}
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
