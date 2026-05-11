import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import Avatar from '../components/ui/Avatar';
import { PREGUNTAS } from '../lib/preguntas';

async function descargarCV(candidatoId, nombre) {
  const base = import.meta.env.VITE_API_URL || '';
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${base}/api/candidatos/${candidatoId}/cv`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      alert('No se pudo descargar el CV: ' + res.status);
      return;
    }
    const blob = await res.blob();
    const pdfBlob = new Blob([blob], { type: 'application/pdf' });
    const url = URL.createObjectURL(pdfBlob);
    const safe = (nombre || 'candidato').replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safe}-CV.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    alert('Error al descargar el CV: ' + err.message);
  }
}

const ETAPAS = ['POSTULADO', 'EN_REVISION', 'ENTREVISTA', 'OFERTA', 'DESCARTADO'];
const ETAPA_STYLE = {
  POSTULADO:   'bg-gray-100 text-gray-600',
  EN_REVISION: 'bg-blue-50 text-blue-700',
  ENTREVISTA:  'bg-amber-50 text-amber-700',
  OFERTA:      'bg-emerald-50 text-emerald-700',
  DESCARTADO:  'bg-red-50 text-red-600',
};


function ScoreBar({ value, label, color = 'bg-indigo-500' }) {
  const pct = Math.min(100, Math.round(value || 0));
  const barColor = pct >= 70 ? 'bg-emerald-400' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-xs font-semibold text-gray-700">{pct}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ScoreBadge({ value }) {
  const v = Math.round((value || 0) * 10) / 10;
  const cls = v >= 70 ? 'text-emerald-700 bg-emerald-50' : v >= 40 ? 'text-amber-700 bg-amber-50' : 'text-red-600 bg-red-50';
  return <span className={`px-2 py-0.5 rounded-lg text-sm font-bold ${cls}`}>{v}</span>;
}

export default function VacanteDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: vacante, loading: loadingV } = useApi(`/api/vacantes/${id}`);
  const { data: postulaciones, loading: loadingP, refetch } = useApi(`/api/postulaciones?vacanteId=${id}`);
  const [selected, setSelected] = useState(null);
  const [coherencia, setCoherencia] = useState('');
  const [savingCoh, setSavingCoh] = useState(false);

  async function handleCoherencia(postId) {
    if (!coherencia) return;
    setSavingCoh(true);
    try {
      const updated = await api.patch(`/api/postulaciones/${postId}/coherencia`, { scoreCoherencia: Number(coherencia) });
      await refetch();
      setSelected(s => s ? { ...s, scoreTotal: updated.scoreTotal, score: updated.score } : null);
    } catch (err) { alert(err.message); }
    finally { setSavingCoh(false); }
  }

  async function handleEtapa(postId, etapa) {
    try {
      await api.patch(`/api/postulaciones/${postId}/etapa`, { etapa });
      await refetch();
      setSelected(s => s ? { ...s, etapa } : null);
    } catch (err) { alert(err.message); }
  }

  if (loadingV) return <div className="p-6 text-sm text-gray-400">Cargando...</div>;
  if (!vacante) return <div className="p-6 text-sm text-gray-400">Vacante no encontrada</div>;

  const lista = postulaciones || [];
  const selectedIdx = selected ? lista.findIndex(p => p.id === selected.id) : -1;

  return (
    <div className="flex h-full">
      {/* Lista */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-white">
          <button onClick={() => navigate('/vacantes')} className="text-xs text-gray-400 hover:text-gray-600 mb-2 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            Vacantes
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">{vacante.titulo}</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {vacante.estado}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">{vacante.area} · {vacante.tipoContrato} · {vacante.turno} · {lista.length} postulantes</p>
        </div>

        {/* Tabla */}
        <div className="flex-1 overflow-auto p-6">
          {loadingP ? (
            <div className="text-center py-12 text-sm text-gray-400">Cargando candidatos...</div>
          ) : lista.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">Sin postulantes aún</div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Candidato</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Score total</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Score CV</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Disponibilidad</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Cuestionario</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Etapa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lista.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setSelected(p)}
                      className={`cursor-pointer transition-colors ${selected?.id === p.id ? 'bg-indigo-50/60' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar nombre={p.candidato.nombre} size="sm" />
                          <div>
                            <p className="font-medium text-gray-900">{p.candidato.nombre}</p>
                            <p className="text-xs text-gray-400">{p.candidato.distrito || p.candidato.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <ScoreBadge value={p.scoreTotal} />
                          <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${p.scoreTotal >= 70 ? 'bg-emerald-400' : p.scoreTotal >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                              style={{ width: `${Math.min(100, p.scoreTotal)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">{Math.round(p.score?.scoreCV ?? 0)}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">{Math.round(p.score?.scoreDisponibilidad ?? 0)}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">{Math.round(p.score?.scoreCuestionario ?? 0)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ETAPA_STYLE[p.etapa]}`}>
                          {p.etapa.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Panel lateral */}
      {selected && (
        <div className="w-72 shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
          {/* Nav candidato */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-1.5">
              <button
                disabled={selectedIdx <= 0}
                onClick={() => setSelected(lista[selectedIdx - 1])}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
              </button>
              <span className="text-xs text-gray-400">{selectedIdx + 1} de {lista.length}</span>
              <button
                disabled={selectedIdx >= lista.length - 1}
                onClick={() => setSelected(lista[selectedIdx + 1])}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
            <button onClick={() => setSelected(null)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Info candidato */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-start gap-3">
                <Avatar nombre={selected.candidato.nombre} size="lg" />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{selected.candidato.nombre}</p>
                  <p className="text-xs text-gray-400">{selected.candidato.email}</p>
                  <p className="text-xs text-gray-400">{selected.candidato.telefono}</p>
                  {selected.candidato.distrito && <p className="text-xs text-gray-400">{selected.candidato.distrito}</p>}
                </div>
              </div>
              {/* Score total destacado */}
              <div className="mt-3 flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                <span className="text-sm font-medium text-gray-600">Score total</span>
                <span className={`text-2xl font-bold ${selected.scoreTotal >= 70 ? 'text-emerald-600' : selected.scoreTotal >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                  {Math.round(selected.scoreTotal * 10) / 10}
                </span>
              </div>
              {/* Acciones rápidas */}
              <div className="flex gap-2 mt-3">
                <a href={`mailto:${selected.candidato.email}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  Email
                </a>
                <button onClick={() => descargarCV(selected.candidato.id, selected.candidato.nombre)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  CV
                </button>
              </div>
            </div>

            {/* Desglose de score */}
            <div className="p-4 border-b border-gray-100 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Desglose de score</p>
              <ScoreBar label="Match CV (palabras clave)" value={selected.score?.scoreCV ?? 0} />
              <ScoreBar label="Cuestionario Likert" value={selected.score?.scoreCuestionario ?? 0} />
              <ScoreBar label="Disponibilidad horaria" value={selected.score?.scoreDisponibilidad ?? 0} />
              <ScoreBar label="Coherencia (manual)" value={selected.score?.scoreCoherencia ?? 0} />
            </div>

            {/* Keywords */}
            {(selected.score?.keywordsEncontradas?.length ?? 0) > 0 && (
              <div className="p-4 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Palabras clave del CV</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.score.keywordsEncontradas.map(kw => (
                    <span key={kw} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">{kw}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Disponibilidad */}
            {selected.disponibilidad && (
              <div className="p-4 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Disponibilidad</p>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {selected.disponibilidad.turnoManana && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Mañana</span>}
                  {selected.disponibilidad.turnoTarde && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Tarde</span>}
                  {selected.disponibilidad.turnoNoche && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Noche</span>}
                  {selected.disponibilidad.finesDeSemanaDispo && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Fines de semana</span>}
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{selected.disponibilidad.horasSemanales}h/sem</span>
                </div>
              </div>
            )}

            {/* Ajustar coherencia */}
            <div className="p-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Coherencia (manual) 1–5</p>
              <div className="flex gap-2">
                <select value={coherencia} onChange={e => setCoherencia(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                  <option value="">--</option>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <button onClick={() => handleCoherencia(selected.id)} disabled={savingCoh || !coherencia}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm rounded-xl transition-colors">
                  {savingCoh ? '...' : 'OK'}
                </button>
              </div>
            </div>

            {/* Cambiar etapa */}
            <div className="p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cambiar etapa</p>
              <div className="flex flex-wrap gap-1.5">
                {ETAPAS.map(etapa => (
                  <button key={etapa} onClick={() => handleEtapa(selected.id, etapa)}
                    className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                      selected.etapa === etapa
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600'
                    }`}>
                    {etapa.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
