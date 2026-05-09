import { useApi } from '../hooks/useApi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Avatar from '../components/ui/Avatar';

const PIPELINE_COLORS = {
  POSTULADO: '#94a3b8', EN_REVISION: '#60a5fa', ENTREVISTA: '#fbbf24', OFERTA: '#34d399', DESCARTADO: '#f87171',
};
const PIPELINE_LABEL = {
  POSTULADO: 'Postulado', EN_REVISION: 'En revisión', ENTREVISTA: 'Entrevista', OFERTA: 'Oferta', DESCARTADO: 'Descartado',
};

function StatCard({ label, value, sub, trend }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {trend && (
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full mb-1 ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
            {trend > 0 ? '↑' : '↓'}{Math.abs(trend)}%
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="font-medium text-gray-700">{PIPELINE_LABEL[label] || label}</p>
      <p className="text-gray-500">{payload[0].value} candidatos</p>
    </div>
  );
};

export default function Dashboard() {
  const { data: resumen, loading: l1 } = useApi('/api/dashboard/resumen');
  const { data: pipeline, loading: l2 } = useApi('/api/dashboard/pipeline');
  const { data: top, loading: l3 } = useApi('/api/dashboard/top-candidatos');

  const loading = l1 || l2 || l3;
  const pipelineData = (pipeline || []).map(p => ({ ...p, label: PIPELINE_LABEL[p.etapa] || p.etapa }));

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard ejecutivo</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Resumen del reclutamiento · {new Date().toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-sm text-gray-400">Cargando datos...</div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Total postulantes (mes)" value={(resumen?.totalPostulantes ?? 0).toLocaleString()} />
            <StatCard label="Score promedio" value={resumen?.scorePromedio ?? 0} sub="últimos 30 días" />
            <StatCard label="Vacantes activas" value={resumen?.vacantesActivas ?? 0} />
            <StatCard label="Vacantes cerradas" value={resumen?.vacantesCerradas ?? 0} />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {/* Pipeline chart */}
            <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-gray-900">Distribución del pipeline</h3>
                <span className="text-xs text-gray-400">{(pipeline || []).reduce((s, p) => s + p.count, 0)} candidatos en proceso</span>
              </div>
              <p className="text-xs text-gray-400 mb-4">Estado actual de los candidatos en todas las vacantes activas.</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={pipelineData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {pipelineData.map(entry => (
                      <Cell key={entry.etapa} fill={PIPELINE_COLORS[entry.etapa] || '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top 5 */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Top 5 candidatos</h3>
                <span className="text-xs text-gray-400">Por score total</span>
              </div>
              {(top || []).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Sin datos suficientes</p>
              ) : (
                <div className="space-y-3">
                  {(top || []).map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                        i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>{i + 1}</span>
                      <Avatar nombre={p.candidato.nombre} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.candidato.nombre}</p>
                        <p className="text-xs text-gray-400 truncate">{p.vacante.titulo}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-indigo-600">{Math.round(p.scoreTotal * 10) / 10}</p>
                        <p className="text-[10px] text-gray-400">SCORE</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
