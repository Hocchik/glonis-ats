# CLAUDE.md — ATS Glonis · Gestión de contexto

> Lee este archivo completo antes de escribir cualquier línea de código.
> Es la fuente de verdad del proyecto. Si algo no está aquí, pregunta antes de asumir.

---

## 1. Identidad del proyecto

**Nombre:** Sistema ATS (Applicant Tracking System) — Glonis
**Cliente:** Glonis (tienda de ropa peruana) — https://glonis.pe/
**Tipo:** Proyecto universitario · sin infraestructura de pago en producción
**Objetivo:** Reemplazar el proceso manual de selección por LinkedIn (perfil por perfil) con un sistema centralizado que reciba postulantes, analice sus CVs automáticamente y los rankee mediante un Score de Aptitud.
**Problema raíz:** Alta rotación de personal en retail. El equipo de RRHH revisa perfiles de LinkedIn uno por uno sin centralización, sin historial y sin criterio objetivo de comparación.

---

## 2. Decisiones de arquitectura — NO cambiar sin discutir

### 2.1 Arquitectura en capas (3 capas estrictas)

```
[Frontend React]  →  HTTP/JSON  →  [API Express]  →  Prisma ORM  →  [PostgreSQL]
```

- El frontend NUNCA accede directamente a la base de datos.
- Toda lógica de negocio vive en la API (Express), nunca en el frontend.
- El frontend solo muestra datos y dispara acciones hacia la API.

### 2.2 Separación de rutas públicas y privadas

```
/public/*   → sin autenticación (formulario de postulación, CAPTCHA)
/api/*      → requiere JWT válido (panel del reclutador)
```

- El formulario de postulación es completamente público (acceso por link).
- Todo el panel interno requiere login con JWT.
- La carpeta `/uploads/` NO se sirve como estático — los CVs solo se acceden vía `/api/candidatos/:id/cv` con JWT.

### 2.3 Análisis de CV — extractor local (sin IA externa)

- Librería: `pdf-parse` (Node.js)
- El sistema extrae texto del PDF y busca coincidencias con el banco de palabras clave (pre-normalizadas sin tildes).
- NO se usa ninguna API de IA externa para este análisis (decisión de costo).
- El score de CV es proporcional al número de palabras clave encontradas sobre el total del banco.

### 2.4 CAPTCHA

- Proveedor: **hCaptcha** (gratuito, sin tarjeta)
- Se verifica en el backend antes de procesar cualquier dato.
- Si el CAPTCHA falla, el archivo PDF subido se elimina del disco inmediatamente.
- Dev bypass: si `NODE_ENV !== 'production'` y el token es `'test'`, se acepta sin verificar.

### 2.5 Roles de usuario

- **ADMIN:** acceso completo + módulo de gestión de usuarios (`/usuarios`)
- **RECLUTADOR:** acceso a todas las vistas excepto gestión de usuarios
- Un ADMIN no puede degradarse a sí mismo ni ser el último admin eliminado.

---

## 3. Stack tecnológico — versiones fijas

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | React + Vite | React 18, Vite 5 |
| Estilos | Tailwind CSS | v3 |
| Kanban drag-and-drop | @dnd-kit/core + @dnd-kit/sortable | v6 |
| Calendario | FullCalendar (React) | v6 |
| Gráficas dashboard | Recharts | v2 |
| Backend | Node.js + Express | Node 20 LTS |
| ORM | Prisma | v5 |
| Base de datos | PostgreSQL | v15 |
| Autenticación | JWT (jsonwebtoken) + bcrypt | — |
| Extracción de PDF | pdf-parse | v1 |
| Subida de archivos | Multer | v1 |
| CAPTCHA | hCaptcha (@hcaptcha/react-hcaptcha) | — |
| Routing frontend | react-router-dom | v6 |
| Variables de entorno backend | dotenv | v16 |
| Drag utilities | @dnd-kit/utilities | v3 |
| Deploy backend | Render.com | free tier |
| Deploy frontend | Vercel | free tier |
| Control de versiones | Git + GitHub | — |

**Regla:** No agregar dependencias no listadas aquí sin actualizar este archivo primero.

---

## 4. Módulos del sistema — estado actual

### M1 · Gestión de vacantes (CRUD) ✅
- Campos: título, área (ventas / caja / almacén / visual / otro), descripción, requisitos, tipo de contrato, turno, estado (activa / pausada / cerrada), fecha de cierre, slug único.
- El slug se genera automáticamente al crear (`generarSlug(titulo)` con sufijo hex aleatorio).
- Solo usuarios autenticados (ADMIN o RECLUTADOR) pueden crear/editar/cerrar vacantes.
- `fechaCierre` se valida con `!isNaN(new Date(fechaCierre))` antes de guardar.

### M2 · Formulario público de postulación ✅
- Ruta: `/postular/:slug` — sin autenticación.
- 4 pasos: datos personales → disponibilidad → cuestionario Likert → CV + CAPTCHA.
- `nombre` y `apellidos` se combinan en un solo campo `nombre` antes de enviar al backend.
- El backend valida exactamente 18 respuestas con `preguntaId` (1–18) y `valorLikert` (1–5).
- Al enviar: se crea `Candidato` (upsert por email) + `Postulacion` + `ScoreDetalle` + `Disponibilidad` + `RespuestaFormulario[]` en una sola transacción Prisma.
- El candidato recibe confirmación en pantalla (no por email).

### M3 · Vista de candidatos por vacante ✅
- Tabla ordenada por `scoreTotal` desc.
- Panel lateral derecho con: score total, desglose por componente (barras), keywords encontradas, disponibilidad, ajuste de coherencia (1–5), etapa actual, botón descarga CV.
- La descarga de CV usa `fetch` con header `Authorization` y crea un Object URL temporal (no `<a href>` directo).
- Navegación prev/next entre candidatos sin cerrar el panel.

### M4 · Tablero Kanban (pipeline) ✅
- Columnas fijas: `POSTULADO` → `EN_REVISION` → `ENTREVISTA` → `OFERTA` → `DESCARTADO`
- Drag-and-drop con `@dnd-kit/core` (PointerSensor, distancia mínima 5px).
- Al soltar llama a `PATCH /api/postulaciones/:id/etapa`.
- Filtro por vacante en la barra superior.

### M5 · Calendario de entrevistas ✅
- Vista mensual y semanal (FullCalendar, locale `es`).
- Crear entrevista → avanza la postulación a etapa `ENTREVISTA` en la misma transacción.
- Click en evento → confirmar marcar como `REALIZADA`.
- `PUT /:id` valida `estado` contra `ESTADOS_VALIDOS` antes de guardar.

### M6 · Motor de Score de Aptitud ✅

```
Score Total (0–100) =
  (Score CV            × 0.35) +
  (Score Disponibilidad × 0.25) +
  (Score Cuestionario   × 0.25) +
  (Score Coherencia     × 0.15)
```

- `scoreCuestionario`: preguntas invertidas `{4, 7, 9, 14}` → `valor = 6 - valorLikert`. Fórmula: `(suma / (18×5)) × 100`.
- `scoreDisponibilidad`: cada turno 25 pts (máx 75), fines semana 15 pts, horas (máx 48) proporcional 10 pts.
- `scoreCoherencia`: input 1–5 del reclutador → se normaliza a 0–100 con `(valor-1)/4 × 100`.
- `scoreTotal` se desnormaliza en `Postulacion.scoreTotal`. Se recalcula al ajustar coherencia.
- `scoringService.js` es el ÚNICO lugar donde se calcula el score.

### M7 · Dashboard ejecutivo ✅
- Métricas: total postulantes del mes, score promedio, vacantes activas/cerradas.
- Gráfico de barras: distribución por etapa del pipeline (Recharts).
- Top 5 candidatos por score (excluye DESCARTADO).

### M8 · Gestión de usuarios (ADMIN only) ✅
- Ruta: `/usuarios` — protegida por `AdminRoute` en el frontend y `soloAdmin` middleware en backend.
- CRUD completo: crear, editar (con cambio de contraseña opcional), eliminar.
- No se puede eliminar el propio usuario ni degradar al último ADMIN.
- La verificación del último admin se hace dentro de una `$transaction` para evitar race conditions.

---

## 4.1 Base de datos y almacenamiento de archivos

- **PostgreSQL:** Local en `localhost:5432` durante desarrollo (base de datos: `glonis_ats`)
- **CVs en PDF:** Se almacenan en `backend/uploads/` — solo accesibles vía API autenticada.
- **La carpeta `/uploads/` NO está expuesta como static** en Express (eliminado para seguridad).
- **Para deploy:** PostgreSQL → Render.com (free tier). CVs → disco persistente en Render.

---

## 5. Modelo de base de datos

```prisma
model Usuario {
  id           String   @id @default(uuid())
  nombre       String
  email        String   @unique
  passwordHash String
  rol          Rol      @default(RECLUTADOR)
  creadoEn     DateTime @default(now())
  vacantes     Vacante[]
}

enum Rol {
  ADMIN
  RECLUTADOR
}

model Vacante {
  id            String        @id @default(uuid())
  titulo        String
  area          AreaVacante
  descripcion   String
  requisitos    String
  tipoContrato  String
  turno         String
  estado        EstadoVacante @default(ACTIVA)
  slug          String        @unique
  fechaCierre   DateTime?
  creadoEn      DateTime      @default(now())
  creadoPor     Usuario       @relation(fields: [usuarioId], references: [id])
  usuarioId     String
  postulaciones Postulacion[]
}

enum AreaVacante { VENTAS CAJA ALMACEN VISUAL OTRO }
enum EstadoVacante { ACTIVA PAUSADA CERRADA }

model Candidato {
  id            String        @id @default(uuid())
  nombre        String
  email         String        @unique
  telefono      String
  dni           String?
  distrito      String?
  cvUrl         String
  creadoEn      DateTime      @default(now())
  postulaciones Postulacion[]
}

model Postulacion {
  id             String               @id @default(uuid())
  etapa          EtapaPipeline        @default(POSTULADO)
  scoreTotal     Float                @default(0)
  creadoEn       DateTime             @default(now())
  actualizadoEn  DateTime             @updatedAt
  candidato      Candidato            @relation(fields: [candidatoId], references: [id])
  candidatoId    String
  vacante        Vacante              @relation(fields: [vacanteId], references: [id])
  vacanteId      String
  score          ScoreDetalle?
  respuestas     RespuestaFormulario[]
  entrevistas    Entrevista[]
  disponibilidad Disponibilidad?
}

enum EtapaPipeline { POSTULADO EN_REVISION ENTREVISTA OFERTA DESCARTADO }

model ScoreDetalle {
  id                  String      @id @default(uuid())
  scoreCV             Float
  scoreDisponibilidad Float
  scoreCuestionario   Float
  scoreCoherencia     Float       @default(0)
  keywordsEncontradas String[]
  postulacion         Postulacion @relation(fields: [postulacionId], references: [id])
  postulacionId       String      @unique
  actualizadoEn       DateTime    @updatedAt
}

model Disponibilidad {
  id                 String      @id @default(uuid())
  turnoManana        Boolean
  turnoTarde         Boolean
  turnoNoche         Boolean
  finesDeSemanaDispo Boolean
  horasSemanales     Int
  postulacion        Postulacion @relation(fields: [postulacionId], references: [id])
  postulacionId      String      @unique
}

model RespuestaFormulario {
  id            String      @id @default(uuid())
  preguntaId    Int
  valorLikert   Int
  postulacion   Postulacion @relation(fields: [postulacionId], references: [id])
  postulacionId String
}

model Entrevista {
  id            String              @id @default(uuid())
  fechaHora     DateTime
  modalidad     ModalidadEntrevista
  notas         String?
  estado        EstadoEntrevista    @default(PROGRAMADA)
  postulacion   Postulacion         @relation(fields: [postulacionId], references: [id])
  postulacionId String
  creadoEn      DateTime            @default(now())
}

enum ModalidadEntrevista { PRESENCIAL VIDEOLLAMADA }
enum EstadoEntrevista    { PROGRAMADA REALIZADA CANCELADA }
```

---

## 6. Banco de palabras clave para extractor de CV

Las keywords están pre-normalizadas (sin tildes) para comparar directamente con el texto del PDF normalizado. El `scoreCV` = `(coincidencias / 38) × 100`, tope 100.

```javascript
// backend/src/services/cvExtractor.js
const KEYWORDS_RETAIL = [
  'ventas', 'vendedor', 'vendedora', 'atencion al cliente', 'servicio al cliente',
  'tienda', 'retail', 'comercio', 'boutique', 'moda', 'indumentaria', 'ropa',
  'caja', 'cajero', 'cajera', 'cobro', 'pos', 'punto de venta', 'efectivo',
  'vuelto', 'facturacion', 'boleta', 'factura',
  'almacen', 'almacenero', 'inventario', 'stock', 'mercaderia', 'picking',
  'despacho', 'recepcion de mercaderia', 'control de stock',
  'visual merchandising', 'vitrina', 'exhibicion', 'planograma', 'escaparate',
  'trabajo en equipo', 'proactivo', 'proactiva', 'responsable', 'puntual',
  'comunicacion', 'orientado al cliente', 'orientada al cliente',
  'administracion', 'marketing', 'negocios', 'textil', 'diseno de modas',
];
```

La función `normalizar(str)` aplica `.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')` al texto del PDF antes de comparar.

---

## 7. Cuestionario Likert — 18 preguntas

Fuente de verdad: `frontend/src/lib/preguntas.js` — importado por `FormularioPublico.jsx` y `VacanteDetalle.jsx`.

Escala: 1 = Totalmente en desacuerdo · 5 = Totalmente de acuerdo
Preguntas `(-)` se invierten: `valor = 6 - valorLikert`.
Preguntas invertidas: **4, 7, 9, 14**.

### Bloque A — Actitud de servicio (1–5)
1. Disfruto interactuar con personas y ayudarlas a encontrar lo que buscan.
2. Me siento cómodo/a trabajando en un ambiente de mucha interacción social.
3. Mantengo una actitud positiva incluso cuando los clientes son exigentes.
4. Me cuesta mantener la calma cuando hay mucha presión o afluencia de público. `(-)`
5. Para mí es importante que el cliente se vaya satisfecho, aunque eso tome más tiempo.

### Bloque B — Trabajo en equipo y adaptabilidad (6–10)
6. Me adapto fácilmente a los cambios de horario o tareas inesperadas.
7. Prefiero trabajar solo/a que coordinando con un equipo. `(-)`
8. Cuando hay mucho trabajo, apoyo a mis compañeros aunque no sea mi área.
9. Me resulta difícil pedir ayuda cuando no sé cómo hacer algo. `(-)`
10. He trabajado antes en equipos con ritmo acelerado y lo manejo bien.

### Bloque C — Responsabilidad y compromiso (11–14)
11. Llego puntualmente a mis compromisos laborales y personales.
12. Si cometo un error, lo reconozco y busco corregirlo de inmediato.
13. Me comprometo con los horarios acordados, incluyendo fines de semana si es necesario.
14. Cuando una tarea me aburre, me cuesta mantener el mismo nivel de esfuerzo. `(-)`

### Bloque D — Afinidad con el rubro (15–18)
15. Me interesa el mundo de la moda y me actualizo sobre tendencias.
16. Entiendo que en retail el aspecto y la presentación personal influyen en la atención.
17. Estaría dispuesto/a a aprender sobre los productos que vende la tienda.
18. Me motiva trabajar en un ambiente dinámico donde cada día es diferente.

---

## 8. Endpoints de la API

```
AUTH
POST   /api/auth/login                    → { token, usuario }

USUARIOS (solo ADMIN)
GET    /api/usuarios                      → lista sin passwordHash
POST   /api/usuarios                      → crear usuario
PUT    /api/usuarios/:id                  → editar (password opcional)
DELETE /api/usuarios/:id                  → eliminar (no self, no último admin)

VACANTES
GET    /api/vacantes                      → lista (filtros: estado, area)
POST   /api/vacantes                      → crear vacante
GET    /api/vacantes/:id                  → detalle
PUT    /api/vacantes/:id                  → editar
PATCH  /api/vacantes/:id/estado           → cambiar estado

POSTULACIONES
GET    /api/postulaciones                 → lista (filtros: vacanteId, etapa) ordenada por score desc
GET    /api/postulaciones/:id             → detalle con score, respuestas, disponibilidad, entrevistas
PATCH  /api/postulaciones/:id/etapa       → mover en Kanban
PATCH  /api/postulaciones/:id/coherencia  → ajustar score coherencia (1–5) + recalcula scoreTotal

FORMULARIO PÚBLICO (sin JWT)
GET    /public/vacantes/:slug             → datos de vacante (solo si ACTIVA)
POST   /public/postular/:slug             → recibir formulario + CV + CAPTCHA

CANDIDATOS
GET    /api/candidatos/:id                → perfil completo con postulaciones
GET    /api/candidatos/:id/cv             → stream del PDF (requiere JWT)

ENTREVISTAS
GET    /api/entrevistas                   → lista (filtros: mes, vacanteId)
POST   /api/entrevistas                   → crear + avanza postulación a ENTREVISTA
PUT    /api/entrevistas/:id               → editar (valida estado contra enum)
PATCH  /api/entrevistas/:id/estado        → cambiar estado

DASHBOARD
GET    /api/dashboard/resumen             → totalPostulantes, scorePromedio, vacantesActivas, vacantesCerradas
GET    /api/dashboard/pipeline            → count por EtapaPipeline
GET    /api/dashboard/top-candidatos      → top 5 por scoreTotal (excluye DESCARTADO)
```

---

## 9. Estructura de carpetas — estado real

```
glonis-ats/
├── CLAUDE.md
├── .gitignore
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js               ← crea admin@glonis.pe / admin123
│   ├── src/
│   │   ├── index.js              ← Express entry point (sin express.static /uploads)
│   │   ├── middleware/
│   │   │   ├── auth.js           ← JWT verify → req.usuario
│   │   │   ├── errorHandler.js   ← solo expone mensaje en errores operacionales (<500)
│   │   │   └── upload.js         ← Multer: solo PDF, máx 5 MB
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── usuarios.js       ← soloAdmin middleware
│   │   │   ├── vacantes.js
│   │   │   ├── postulaciones.js
│   │   │   ├── candidatos.js     ← stream CV con error handler
│   │   │   ├── entrevistas.js
│   │   │   ├── dashboard.js
│   │   │   └── public.js         ← sin auth, cleanupFile() en todos los early returns
│   │   ├── services/
│   │   │   ├── scoringService.js
│   │   │   ├── cvExtractor.js    ← keywords pre-normalizadas, función normalizar()
│   │   │   └── captchaService.js ← timeout 5s, dev bypass con token 'test'
│   │   └── lib/
│   │       └── prisma.js
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── index.html                ← Inter font, favicon Glonis CDN
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx               ← PrivateRoute + AdminRoute
│   │   ├── index.css             ← font-family Inter global
│   │   ├── components/
│   │   │   └── ui/
│   │   │       ├── Layout.jsx    ← sidebar oscuro bg-gray-900, nav por rol
│   │   │       └── Avatar.jsx    ← iniciales + color por hash de nombre
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Vacantes.jsx
│   │   │   ├── VacanteDetalle.jsx
│   │   │   ├── Kanban.jsx
│   │   │   ├── Calendario.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── FormularioPublico.jsx
│   │   │   └── Usuarios.jsx      ← AdminRoute, usa api.del()
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   └── useApi.js
│   │   └── lib/
│   │       ├── api.js            ← get, post, put, patch, del, postForm
│   │       └── preguntas.js      ← PREGUNTAS array compartido (fuente única)
│   ├── package.json
│   ├── .env
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
│
└── uploads/                      ← CVs en PDF (gitignored)
    └── .gitkeep
```

---

## 10. Variables de entorno

```env
# backend/.env  (ver backend/.env.example para todas las variables)
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/glonis_ats"
JWT_SECRET="genera-con-openssl-rand-base64-64"
JWT_EXPIRES_IN="8h"
HCAPTCHA_SECRET="ver-dashboard-hcaptcha"
UPLOAD_DIR="./uploads"
PORT=3000
NODE_ENV="development"
SEED_ADMIN_PASSWORD="contraseña-segura"
FRONTEND_URL="http://localhost:5173"

# frontend/.env  (ver frontend/.env.example)
VITE_API_URL="http://localhost:3000"
VITE_HCAPTCHA_SITEKEY="ver-dashboard-hcaptcha"
```

### Usuarios de prueba (seed)
- `admin@glonis.pe` / `admin123` — rol ADMIN
- `maria@glonis.pe` / `reclu123` — rol RECLUTADOR

---

## 11. Design system del frontend

- **Sidebar:** `bg-gray-900`, ancho 200px, nav items `rounded-lg`
- **Fuente:** Inter (Google Fonts, cargada en `index.html`)
- **Color primario:** `indigo-600`
- **Cards:** `bg-white border border-gray-200 rounded-2xl`
- **Inputs/selects:** `border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30`
- **Botones primarios:** `bg-indigo-600 hover:bg-indigo-700 rounded-xl`
- **Score colors:** ≥70 → `emerald`, ≥40 → `amber`, <40 → `red`
- **Logo:** `https://glonis.pe/cdn/shop/files/LOGO_WEB.webp?height=22&v=1761341530`
- **Icono:** `https://glonis.pe/cdn/shop/files/cloudio.webp?crop=center&height=32&v=1751428378&width=32`
- **Avatar:** componente `Avatar.jsx` — iniciales + color determinístico por nombre

---

## 12. Reglas para Claude Code — leer siempre

1. **Antes de crear cualquier archivo**, verifica si ya existe en la sección 9.
2. **Nunca hardcodear** URLs, secrets o credenciales. Siempre usar variables de entorno.
3. **`scoringService.js`** es el único lugar donde se calcula el score. No duplicar.
4. **`cvExtractor.js`** siempre devuelve `{ scoreCV: number, keywordsEncontradas: string[] }`. No cambiar la interfaz.
5. **Los enums del pipeline** (`EtapaPipeline`) deben ser idénticos en Prisma, frontend y Kanban.
6. **Multer** solo acepta `mimetype === 'application/pdf'`, máx 5 MB.
7. **Las rutas `/public/*`** nunca deben tener el middleware `auth.js`.
8. **El CAPTCHA** se verifica en el backend. El frontend solo envía el token.
9. **Toda respuesta de error** sigue el formato: `{ error: true, message: "...", code: "..." }`.
10. **`scoreTotal`** en `Postulacion` es desnormalizado. Se actualiza al cambiar `ScoreDetalle`. No calcularlo en el frontend.
11. **La descarga de CV** debe hacerse via `fetch` con `Authorization` header, no con `<a href>` directo.
12. **`PREGUNTAS`** vive en `frontend/src/lib/preguntas.js`. No duplicar en componentes.
13. **`api.del()`** existe en `frontend/src/lib/api.js`. Usarlo para DELETE; no usar `fetch` manual.
14. **Cleanup de archivos:** si una validación falla en `public.js` después de que Multer guardó el PDF, llamar `cleanupFile(req)` antes de retornar el error.
15. **Piensa antes de actuar.** Lee los archivos antes de escribir código.
16. **Edita solo lo que cambia**, no reescribas archivos enteros.
17. **Sin preámbulos, sin resúmenes al final**, sin explicar lo obvio.

---

## 13. Lo que NO hace este sistema (fuera de alcance)

- No envía emails automáticos a candidatos.
- No integra con la API oficial de LinkedIn.
- No tiene módulo de nómina ni gestión de empleados activos.
- No tiene aplicación móvil.
- No usa IA externa para analizar CVs.
- No tiene roles granulares más allá de ADMIN y RECLUTADOR.
- No soporta múltiples empresas (single-tenant, solo Glonis).
- No tiene rate limiting granular por usuario (solo por IP).

---

## 14. Estrategia de agente

**Modo principal:** Agente único (un solo Claude, contexto continuo)
**Razón:** Las capas son dependientes en cadena (schema → API → frontend). La coherencia requiere un único contexto.

**Sub-agentes puntuales permitidos:**
- `/everything-claude-code:code-review` — al terminar cada módulo
- `/everything-claude-code:security-review` — antes del deploy
- `/superpowers:verification-before-completion` — antes de dar algo por terminado

**Multiagente completo:** NO usar (costo + riesgo de inconsistencia).

---

## 15. Estado de iteraciones

| # | Iteración | Estado |
|---|---|---|
| 0 | Scaffolding | ✅ Completo |
| 1 | Auth (JWT + bcrypt) | ✅ Completo |
| 2 | Vacantes CRUD | ✅ Completo |
| 3 | Formulario público + CAPTCHA + CV | ✅ Completo |
| 4 | Motor de score | ✅ Completo |
| 5 | Vista candidatos + panel lateral | ✅ Completo |
| 6 | Kanban drag-and-drop | ✅ Completo |
| 7 | Calendario de entrevistas | ✅ Completo |
| 8 | Dashboard ejecutivo | ✅ Completo |
| 8.1 | Módulo de usuarios (ADMIN) | ✅ Completo |
| 9 | UI/UX redesign (design system) | ✅ Completo |
| 9.1 | Code review + fixes de seguridad | ✅ Completo |
| 10 | Security review + fixes | ✅ Completo |
| 11 | Configuración de deploy (Render + Vercel) | ✅ Completo |

### Fixes aplicados en code review (2026-05-09)
- Stream de CV sin error handler → corregido en `candidatos.js`
- `/uploads/` expuesto sin auth → `express.static` eliminado de `index.js`
- Archivos PDF huérfanos al fallar CAPTCHA → `cleanupFile()` en todos los early returns de `public.js`
- `errorHandler` exponía mensajes internos de Prisma → solo expone en errores operacionales (<500)
- CAPTCHA sin timeout → `req.setTimeout(5000)` en `captchaService.js`
- Respuestas Likert sin validar en backend → validación de rango y exactamente 18 respuestas
- `apellidos` descartado silenciosamente → combinado con `nombre` antes de enviar FormData
- `estado` sin validar en `PUT /entrevistas/:id` → validación contra `ESTADOS_VALIDOS`
- `fechaCierre` con string vacío → `!isNaN(new Date())` en `vacantes.js`
- Race condition en último admin → verificación en `$transaction`
- Link de descarga CV sin JWT → `fetch` con Authorization + Object URL
- Array `PREGUNTAS` duplicado → extraído a `frontend/src/lib/preguntas.js`
- Keywords con tildes literales → pre-normalizadas sin acentos en `cvExtractor.js`

### Fixes aplicados en security review (2026-05-09)
- `seed.js` con contraseña hardcodeada → lee `SEED_ADMIN_PASSWORD` desde `.env`
- `.gitignore` no cubría `.env` de subcarpetas → añadidos `backend/.env` y `frontend/.env` explícitamente
- Sin rate limiting → `express-rate-limit`: 20 req/15min en login, 5 req/hora en postular
- Sin headers de seguridad → `helmet` instalado y aplicado globalmente en `index.js`
- `Content-Disposition` con nombre de candidato sin sanitizar → sanitizado a `[a-zA-Z0-9\s\-_]` en `candidatos.js`
- Parámetros de query sin validar → whitelist en `estado`/`area` (vacantes), `etapa` (postulaciones)
- `modalidad` en entrevistas sin validar → validada contra `['PRESENCIAL', 'VIDEOLLAMADA']`
- DELETE de último admin sin protección → verificación en `$transaction` en `usuarios.js`
- JWT expirado no detectado al recargar frontend → `tokenVigente()` en `useAuth.js` limpia localStorage
- Sin límites de longitud en campos públicos → validados nombre (100), email (150), teléfono (20), etc.
- Sin validación de formato de email → regex `[^\s@]+@[^\s@]+\.[^\s@]+` en `public.js` y `usuarios.js`
- `?mes=` sin validar formato → regex `^\d{4}-(0[1-9]|1[0-2])$` en `entrevistas.js`
- Creados `backend/.env.example` y `frontend/.env.example` con todas las variables documentadas

### Configuración de deploy
- `render.yaml` en raíz → web service + PostgreSQL free tier, migra automáticamente al arrancar
- `frontend/vercel.json` → SPA rewrite para React Router
- `backend/package.json` → campo `engines: { node: ">=20.0.0" }` y script `db:deploy`
- `vite.config.js` → eliminado proxy de `/uploads` (ruta inexistente en producción)

---

*Última actualización: 2026-05-09 · v2.1*
