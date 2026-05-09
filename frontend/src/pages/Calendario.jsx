import { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';

const MODALIDAD_COLOR = { PRESENCIAL: '#6366f1', VIDEOLLAMADA: '#0ea5e9' };
const ESTADO_COLOR = { PROGRAMADA: '#6366f1', REALIZADA: '#22c55e', CANCELADA: '#ef4444' };

export default function Calendario() {
  const { data: entrevistas, loading, refetch } = useApi('/api/entrevistas');
  const { data: postulaciones } = useApi('/api/postulaciones');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ postulacionId: '', fechaHora: '', modalidad: 'PRESENCIAL', notas: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const events = (entrevistas || []).map((e) => ({
    id: e.id,
    title: `${e.postulacion.candidato.nombre} — ${e.postulacion.vacante.titulo}`,
    start: e.fechaHora,
    backgroundColor: ESTADO_COLOR[e.estado] || ESTADO_COLOR.PROGRAMADA,
    borderColor: 'transparent',
    extendedProps: { entrevista: e },
  }));

  async function handleSubmit(evt) {
    evt.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.post('/api/entrevistas', form);
      await refetch();
      setModal(false);
      setForm({ postulacionId: '', fechaHora: '', modalidad: 'PRESENCIAL', notas: '' });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEventClick({ event }) {
    const e = event.extendedProps.entrevista;
    if (!e) return;
    const accion = window.confirm(
      `Entrevista: ${e.postulacion.candidato.nombre}\nEstado actual: ${e.estado}\n\n¿Marcar como REALIZADA?`
    );
    if (accion) {
      await api.patch(`/api/entrevistas/${e.id}/estado`, { estado: 'REALIZADA' });
      await refetch();
    }
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Calendario de entrevistas</h1>
          <p className="text-sm text-gray-400 mt-0.5">{(entrevistas || []).length} entrevista{(entrevistas || []).length !== 1 ? 's' : ''} programada{(entrevistas || []).length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setModal(true); setFormError(''); }}
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
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Agendar entrevista</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Candidato / Postulación *</label>
                <select
                  value={form.postulacionId}
                  onChange={(e) => setForm({ ...form, postulacionId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  required
                >
                  <option value="">Seleccionar...</option>
                  {(postulaciones || [])
                    .filter((p) => p.etapa !== 'DESCARTADO')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.candidato.nombre} — {p.vacante.titulo}
                      </option>
                    ))}
                </select>
              </div>
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

              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  {saving ? 'Guardando...' : 'Agendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
