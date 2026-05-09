import { useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import Avatar from '../components/ui/Avatar';

const ETAPAS = ['POSTULADO', 'EN_REVISION', 'ENTREVISTA', 'OFERTA', 'DESCARTADO'];
const ETAPA_LABEL = { POSTULADO: 'Postulado', EN_REVISION: 'En revisión', ENTREVISTA: 'Entrevista', OFERTA: 'Oferta', DESCARTADO: 'Descartado' };
const ETAPA_DOT = { POSTULADO: 'bg-gray-400', EN_REVISION: 'bg-blue-500', ENTREVISTA: 'bg-amber-400', OFERTA: 'bg-emerald-500', DESCARTADO: 'bg-red-400' };

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'hoy';
  if (d === 1) return 'hace 1 d';
  return `hace ${d} d`;
}

function KanbanCard({ p, isDragging = false }) {
  const score = Math.round(p.scoreTotal || 0);
  const barColor = score >= 70 ? 'bg-emerald-400' : score >= 40 ? 'bg-amber-400' : 'bg-red-400';

  return (
    <div className={`bg-white border rounded-xl p-3 select-none ${isDragging ? 'shadow-xl border-indigo-300 opacity-95' : 'border-gray-200 shadow-sm'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar nombre={p.candidato.nombre} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{p.candidato.nombre}</p>
            <p className="text-xs text-gray-400 truncate">{p.vacante.titulo}</p>
          </div>
        </div>
        <svg className="w-4 h-4 text-gray-300 shrink-0 cursor-grab" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
        </svg>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Score</span>
          <span className={`text-xs font-bold ${score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-600' : 'text-red-500'}`}>{score}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${score}%` }} />
        </div>
      </div>
      <p className="text-[11px] text-gray-400 mt-2">{timeAgo(p.creadoEn)}</p>
    </div>
  );
}

function DraggableCard({ p }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: p.id });
  const style = transform ? { transform: `translate(${transform.x}px,${transform.y}px)` } : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={isDragging ? 'opacity-40' : ''}>
      <KanbanCard p={p} />
    </div>
  );
}

function Column({ etapa, postulaciones }) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa });
  return (
    <div className="flex flex-col w-56 shrink-0">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${ETAPA_DOT[etapa]}`} />
          <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide text-xs">{ETAPA_LABEL[etapa]}</span>
        </div>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{postulaciones.length}</span>
      </div>
      <div ref={setNodeRef} className={`flex-1 min-h-24 rounded-2xl p-2 space-y-2 transition-colors ${isOver ? 'bg-indigo-50 ring-2 ring-indigo-200' : 'bg-gray-100/60'}`}>
        {postulaciones.map(p => <DraggableCard key={p.id} p={p} />)}
        {isOver && postulaciones.length === 0 && (
          <div className="h-16 border-2 border-dashed border-indigo-300 rounded-xl flex items-center justify-center text-xs text-indigo-400">
            Soltar aquí
          </div>
        )}
      </div>
    </div>
  );
}

export default function Kanban() {
  const { data: vacantes } = useApi('/api/vacantes');
  const [vacanteId, setVacanteId] = useState('');
  const { data: postulaciones, loading, refetch } = useApi(
    vacanteId ? `/api/postulaciones?vacanteId=${vacanteId}` : '/api/postulaciones',
    [vacanteId]
  );
  const [activeCard, setActiveCard] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const byEtapa = ETAPAS.reduce((acc, e) => {
    acc[e] = (postulaciones || []).filter(p => p.etapa === e);
    return acc;
  }, {});

  async function handleDragEnd({ active, over }) {
    setActiveCard(null);
    if (!over || !ETAPAS.includes(over.id)) return;
    const post = (postulaciones || []).find(p => p.id === active.id);
    if (!post || post.etapa === over.id) return;
    try {
      await api.patch(`/api/postulaciones/${active.id}/etapa`, { etapa: over.id });
      await refetch();
    } catch (err) { alert(err.message); }
  }

  const total = (postulaciones || []).length;

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Pipeline</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total} candidatos en proceso</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={vacanteId} onChange={e => setVacanteId(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white">
            <option value="">Vacante: Todas</option>
            {(vacantes || []).map(v => <option key={v.id} value={v.id}>{v.titulo}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Cargando...</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={e => setActiveCard((postulaciones||[]).find(p=>p.id===e.active.id)||null)} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
            {ETAPAS.map(etapa => <Column key={etapa} etapa={etapa} postulaciones={byEtapa[etapa]} />)}
          </div>
          <DragOverlay>
            {activeCard && <div className="w-56"><KanbanCard p={activeCard} isDragging /></div>}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
