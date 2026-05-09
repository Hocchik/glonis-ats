import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { PREGUNTAS } from '../lib/preguntas';

const ICON_URL = 'https://glonis.pe/cdn/shop/files/cloudio.webp?crop=center&height=32&v=1751428378&width=32';


const LIKERT_LABELS = ['Muy en desacuerdo', 'En desacuerdo', 'Neutral', 'De acuerdo', 'Muy de acuerdo'];

const STEPS = [
  { num: 1, label: 'Datos personales' },
  { num: 2, label: 'Disponibilidad' },
  { num: 3, label: 'Cuestionario' },
  { num: 4, label: 'CV y envío' },
];

const REFERIDOS = ['LinkedIn', 'Instagram', 'Tienda física', 'Recomendación'];

export default function FormularioPublico() {
  const { slug } = useParams();
  const { data: vacante, loading: loadingV } = useApi(`/public/vacantes/${slug}`);
  const captchaRef = useRef(null);

  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');

  const [personal, setPersonal] = useState({ nombre: '', email: '', telefono: '', dni: '', distrito: '', referido: '' });
  const [disponibilidad, setDisponibilidad] = useState({ turnoManana: false, turnoTarde: false, turnoNoche: false, finesDeSemanaDispo: false, horasSemanales: '' });
  const [respuestas, setRespuestas] = useState({});
  const [cv, setCv] = useState(null);
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);

  function next() { setStep(s => Math.min(4, s + 1)); }
  function prev() { setStep(s => Math.max(1, s - 1)); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!captchaToken) { setSubmitError('Completa el CAPTCHA'); return; }
    if (Object.keys(respuestas).length < 18) { setSubmitError('Responde todas las preguntas del cuestionario'); return; }
    if (!cv) { setSubmitError('Adjunta tu CV en PDF'); return; }

    setSubmitting(true);
    setSubmitError('');
    const fd = new FormData();
    const nombreCompleto = [personal.nombre, personal.apellidos].filter(Boolean).join(' ');
    fd.append('nombre', nombreCompleto);
    const { nombre: _n, apellidos: _a, fechaNac: _fn, referido: _r, ...personalRest } = personal;
    Object.entries(personalRest).forEach(([k, v]) => fd.append(k, v));
    Object.entries(disponibilidad).forEach(([k, v]) => fd.append(k, v));
    fd.append('captchaToken', captchaToken);
    fd.append('respuestas', JSON.stringify(
      Object.entries(respuestas).map(([preguntaId, valorLikert]) => ({ preguntaId: Number(preguntaId), valorLikert: Number(valorLikert) }))
    ));
    fd.append('cv', cv);

    try {
      await api.postForm(`/public/postular/${slug}`, fd);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message);
      captchaRef.current?.resetCaptcha();
      setCaptchaToken('');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingV) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!vacante) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-700">Vacante no disponible</p>
        <p className="text-sm text-gray-400 mt-1">Este link ya no está activo o la vacante fue cerrada.</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8 max-w-sm w-full text-center">
        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">¡Postulación enviada!</h2>
        <p className="text-sm text-gray-500">
          Recibimos tu postulación para <strong>{vacante.titulo}</strong>. El equipo de Glonis revisará tu perfil pronto.
        </p>
        <p className="text-xs text-gray-400 mt-4">© 2026 Glonis · Lima, Perú</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={ICON_URL} alt="Glonis" className="w-7 h-7 rounded" />
          <div>
            <p className="text-xs font-bold tracking-widest text-gray-900">GLONIS®</p>
            <p className="text-[9px] text-gray-400 tracking-wider uppercase">Postulación</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Tus datos están protegidos
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Vacante info */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Vacante abierta</p>
          <h1 className="text-2xl font-bold text-gray-900">{vacante.titulo}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              Lima
            </span>
            <span className="text-gray-300">·</span>
            <span>{vacante.tipoContrato}</span>
            <span className="text-gray-300">·</span>
            <span>{vacante.turno}</span>
            <span className="text-gray-300">·</span>
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              Activa
            </span>
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-center mb-8">
          {STEPS.map(({ num, label }, i) => (
            <div key={num} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2 shrink-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === num ? 'bg-indigo-600 text-white' :
                  step > num ? 'bg-emerald-500 text-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {step > num ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                  ) : num}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${step === num ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-3 ${step > num ? 'bg-emerald-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <form onSubmit={handleSubmit}>

            {/* Step 1 */}
            {step === 1 && (
              <div className="p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Cuéntanos sobre ti</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Empezamos con lo básico. Tomará menos de 2 minutos.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombres <span className="text-red-500">*</span></label>
                    <input value={personal.nombre} onChange={e => setPersonal({...personal, nombre: e.target.value})} required
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                      placeholder="Lucía" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Apellidos <span className="text-red-500">*</span></label>
                    <input value={personal.apellidos || ''} onChange={e => setPersonal({...personal, apellidos: e.target.value})}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                      placeholder="Mendoza Cruz" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">DNI <span className="text-red-500">*</span></label>
                    <input value={personal.dni} onChange={e => setPersonal({...personal, dni: e.target.value})} required
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                      placeholder="71234567" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha de nacimiento</label>
                    <input type="date" onChange={e => setPersonal({...personal, fechaNac: e.target.value})}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Correo electrónico <span className="text-red-500">*</span></label>
                  <input type="email" value={personal.email} onChange={e => setPersonal({...personal, email: e.target.value})} required
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                    placeholder="lucia.mendoza@gmail.com" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Teléfono / WhatsApp <span className="text-red-500">*</span></label>
                    <div className="flex gap-2">
                      <span className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-400 bg-gray-50">PE +51</span>
                      <input value={personal.telefono} onChange={e => setPersonal({...personal, telefono: e.target.value})} required
                        className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                        placeholder="987 654 321" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Distrito <span className="text-red-500">*</span></label>
                    <input value={personal.distrito} onChange={e => setPersonal({...personal, distrito: e.target.value})} required
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                      placeholder="Surco" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">¿Cómo te enteraste de la vacante?</label>
                  <div className="flex flex-wrap gap-2">
                    {REFERIDOS.map(r => (
                      <button key={r} type="button" onClick={() => setPersonal({...personal, referido: r})}
                        className={`px-3.5 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                          personal.referido === r ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={aceptaPrivacidad} onChange={e => setAceptaPrivacidad(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-indigo-600" required />
                  <span className="text-xs text-gray-500">
                    Acepto que Glonis trate mis datos personales según la{' '}
                    <span className="text-indigo-600 hover:underline cursor-pointer">política de privacidad</span>{' '}
                    para fines de evaluación.
                  </span>
                </label>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Disponibilidad horaria</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Cuéntanos cuándo puedes trabajar.</p>
                </div>
                <div className="space-y-3">
                  {[
                    { key: 'turnoManana', label: 'Turno mañana', sub: '6:00 am – 2:00 pm' },
                    { key: 'turnoTarde', label: 'Turno tarde', sub: '2:00 pm – 10:00 pm' },
                    { key: 'turnoNoche', label: 'Turno noche', sub: '10:00 pm – 6:00 am' },
                    { key: 'finesDeSemanaDispo', label: 'Fines de semana', sub: 'Sábados y domingos' },
                  ].map(({ key, label, sub }) => (
                    <label key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-indigo-300 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{label}</p>
                        <p className="text-xs text-gray-400">{sub}</p>
                      </div>
                      <input type="checkbox" checked={disponibilidad[key]}
                        onChange={e => setDisponibilidad({...disponibilidad, [key]: e.target.checked})}
                        className="w-4 h-4 accent-indigo-600" />
                    </label>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Horas disponibles por semana</label>
                  <input type="number" min="1" max="48" value={disponibilidad.horasSemanales}
                    onChange={e => setDisponibilidad({...disponibilidad, horasSemanales: e.target.value})}
                    className="w-32 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                    placeholder="40" />
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Cuestionario</h2>
                  <p className="text-sm text-gray-400 mt-0.5">
                    Indica qué tan de acuerdo estás con cada afirmación (1 = muy en desacuerdo, 5 = muy de acuerdo).
                  </p>
                </div>
                <div className="space-y-4">
                  {PREGUNTAS.map(p => (
                    <div key={p.id} className="pb-4 border-b border-gray-100 last:border-0">
                      <p className="text-sm text-gray-700 mb-3">{p.id}. {p.texto}</p>
                      <div className="flex gap-2">
                        {[1,2,3,4,5].map(v => (
                          <button key={v} type="button" title={LIKERT_LABELS[v-1]} onClick={() => setRespuestas(r => ({...r, [p.id]: v}))}
                            className={`w-10 h-10 rounded-full text-sm font-semibold border-2 transition-colors ${
                              respuestas[p.id] === v
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'border-gray-200 text-gray-500 hover:border-indigo-400 hover:text-indigo-600'
                            }`}>
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 sticky bottom-0 bg-white py-2">
                  {Object.keys(respuestas).length} / 18 respondidas
                </p>
              </div>
            )}

            {/* Step 4 */}
            {step === 4 && (
              <div className="p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">CV y envío</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Último paso. Adjunta tu CV y confirma el envío.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Currículum vitae en PDF <span className="text-red-500">*</span>
                    <span className="text-gray-400 font-normal"> (máx. 5 MB)</span>
                  </label>
                  <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${cv ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:border-indigo-300'}`}>
                    {cv ? (
                      <div>
                        <svg className="w-8 h-8 text-emerald-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        <p className="text-sm font-medium text-emerald-700">{cv.name}</p>
                        <button type="button" onClick={() => setCv(null)} className="text-xs text-gray-400 hover:text-red-500 mt-1">Cambiar archivo</button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                        </svg>
                        <p className="text-sm text-gray-500">Arrastra tu CV aquí o <span className="text-indigo-600 font-medium">selecciona un archivo</span></p>
                        <p className="text-xs text-gray-400 mt-1">Solo PDF, máximo 5 MB</p>
                        <input type="file" accept="application/pdf" onChange={e => setCv(e.target.files?.[0] || null)} className="hidden" required />
                      </label>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Verificación de seguridad</p>
                  <HCaptcha sitekey={import.meta.env.VITE_HCAPTCHA_SITEKEY} onVerify={setCaptchaToken} onExpire={() => setCaptchaToken('')} ref={captchaRef} />
                </div>
                {submitError && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3.5 py-2.5 rounded-xl border border-red-100">
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                    {submitError}
                  </div>
                )}
              </div>
            )}

            {/* Footer nav */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <button type="button" onClick={prev} disabled={step === 1}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
                {step === 1 ? 'Cancelar' : 'Anterior'}
              </button>
              <span className="text-xs text-gray-400">Paso {step} de 4</span>
              {step < 4 ? (
                <button type="button" onClick={next}
                  className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors">
                  Continuar
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                </button>
              ) : (
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-xl transition-colors">
                  {submitting ? 'Enviando...' : 'Enviar postulación'}
                  {!submitting && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>}
                </button>
              )}
            </div>
          </form>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">© 2026 Glonis · Política de privacidad · Términos</p>
      </div>
    </div>
  );
}
