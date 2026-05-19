const express = require('express');
const fs = require('fs');
const prisma = require('../lib/prisma');
const upload = require('../middleware/upload');
const { verifyCaptcha } = require('../services/captchaService');
const { extractCV } = require('../services/cvExtractor');
const { calcularScoreCuestionario, calcularScoreDisponibilidad, calcularScoreTotal } = require('../services/scoringService');

const router = express.Router();

function cleanupFile(req) {
  if (req.file?.path) {
    try { fs.unlinkSync(req.file.path); } catch { /* already gone */ }
  }
}

router.get('/vacantes/:slug', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');

    const vacante = await prisma.vacante.findUnique({
      where: { slug: req.params.slug },
      select: {
        id: true,
        titulo: true,
        puesto: true,
        descripcion: true,
        requisitos: true,
        tipoContrato: true,
        turnoPreferido: true,
        estado: true,
        fechaCierre: true,
      },
    });

    if (!vacante) {
      return res.status(404).json({ error: true, message: 'Vacante no encontrada', code: 'NOT_FOUND' });
    }

    if (vacante.estado !== 'ACTIVA') {
      return res.status(410).json({ error: true, message: 'Esta vacante ya no está disponible', code: 'VACANTE_CLOSED' });
    }

    res.json(vacante);
  } catch (err) {
    next(err);
  }
});

router.post('/postular/:slug', upload.single('cv'), async (req, res, next) => {
  try {
    const { slug } = req.params;

    // Verificar CAPTCHA antes de procesar nada
    const captchaToken = req.body.captchaToken;
    const captchaOk = await verifyCaptcha(captchaToken);
    if (!captchaOk) {
      cleanupFile(req);
      return res.status(400).json({ error: true, message: 'Verificación de seguridad fallida', code: 'CAPTCHA_FAILED' });
    }

    if (!req.file) {
      return res.status(400).json({ error: true, message: 'El CV en PDF es requerido', code: 'MISSING_CV' });
    }

    // Validar vacante
    const vacante = await prisma.vacante.findUnique({ where: { slug } });
    if (!vacante) {
      cleanupFile(req);
      return res.status(404).json({ error: true, message: 'Vacante no encontrada', code: 'NOT_FOUND' });
    }
    if (vacante.estado !== 'ACTIVA') {
      cleanupFile(req);
      return res.status(410).json({ error: true, message: 'Esta vacante ya no está disponible', code: 'VACANTE_CLOSED' });
    }

    // Extraer datos del body
    const { nombre, email, telefono, dni, distrito, captchaToken: _ct, ...rest } = req.body;

    if (!nombre || !email || !telefono) {
      cleanupFile(req);
      return res.status(400).json({ error: true, message: 'Nombre, email y teléfono son requeridos', code: 'MISSING_FIELDS' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      cleanupFile(req);
      return res.status(400).json({ error: true, message: 'Formato de email inválido', code: 'INVALID_EMAIL' });
    }

    if (nombre.length > 100 || email.length > 150 || telefono.length > 20) {
      cleanupFile(req);
      return res.status(400).json({ error: true, message: 'Datos demasiado largos', code: 'FIELDS_TOO_LONG' });
    }

    if (dni && dni.length > 20) {
      cleanupFile(req);
      return res.status(400).json({ error: true, message: 'DNI inválido', code: 'INVALID_DNI' });
    }

    if (distrito && distrito.length > 100) {
      cleanupFile(req);
      return res.status(400).json({ error: true, message: 'Distrito demasiado largo', code: 'FIELDS_TOO_LONG' });
    }

    // Disponibilidad
    const modalidad = rest.modalidad;
    if (modalidad !== 'FULLTIME' && modalidad !== 'PARTTIME') {
      cleanupFile(req);
      return res.status(400).json({ error: true, message: 'Modalidad inválida (FULLTIME o PARTTIME)', code: 'INVALID_MODALIDAD' });
    }

    let turnoManana = rest.turnoManana === 'true' || rest.turnoManana === true;
    let turnoTarde = rest.turnoTarde === 'true' || rest.turnoTarde === true;

    if (modalidad === 'FULLTIME') {
      turnoManana = true;
      turnoTarde = true;
    } else if (!turnoManana && !turnoTarde) {
      cleanupFile(req);
      return res.status(400).json({ error: true, message: 'Para medio tiempo selecciona al menos un turno', code: 'MISSING_TURNO' });
    }

    const disponibilidad = { modalidad, turnoManana, turnoTarde };

    // Respuestas Likert — validar exactamente 18 respuestas con valores 1-5
    let respuestas = [];
    try {
      const raw = typeof rest.respuestas === 'string'
        ? JSON.parse(rest.respuestas)
        : rest.respuestas || [];
      respuestas = raw.filter((r) => {
        const id = Number(r.preguntaId);
        const val = Number(r.valorLikert);
        return Number.isInteger(id) && id >= 1 && id <= 18 &&
               Number.isInteger(val) && val >= 1 && val <= 5;
      });
    } catch {
      respuestas = [];
    }

    if (respuestas.length < 18) {
      cleanupFile(req);
      return res.status(400).json({ error: true, message: 'Debes responder las 18 preguntas del cuestionario', code: 'INCOMPLETE_QUESTIONNAIRE' });
    }

    // Ruta del CV
    const cvUrl = `/uploads/${req.file.filename}`;

    // Extraer CV y calcular scores
    const { scoreCV, keywordsEncontradas } = await extractCV(req.file.path, vacante.puesto);
    const scoreDisponibilidad = calcularScoreDisponibilidad(disponibilidad, vacante.turnoPreferido);
    const scoreCuestionario = calcularScoreCuestionario(respuestas);
    const scoreTotal = calcularScoreTotal(scoreCV, scoreDisponibilidad, scoreCuestionario, 0);

    // Todo en una transacción
    const postulacion = await prisma.$transaction(async (tx) => {
      const candidato = await tx.candidato.upsert({
        where: { email },
        update: { nombre, telefono, dni: dni || null, distrito: distrito || null, cvUrl },
        create: { nombre, email, telefono, dni: dni || null, distrito: distrito || null, cvUrl },
      });

      const nuevaPostulacion = await tx.postulacion.create({
        data: {
          candidatoId: candidato.id,
          vacanteId: vacante.id,
          scoreTotal,
          disponibilidad: {
            create: disponibilidad,
          },
          respuestas: {
            create: respuestas.map((r) => ({
              preguntaId: Number(r.preguntaId),
              valorLikert: Number(r.valorLikert),
            })),
          },
          score: {
            create: {
              scoreCV,
              scoreDisponibilidad,
              scoreCuestionario,
              scoreCoherencia: 0,
              keywordsEncontradas,
            },
          },
        },
        include: { score: true },
      });

      return nuevaPostulacion;
    });

    res.status(201).json({
      message: 'Postulación recibida exitosamente',
      postulacionId: postulacion.id,
      scoreTotal: Math.round(postulacion.scoreTotal * 10) / 10,
    });
  } catch (err) {
    cleanupFile(req);
    next(err);
  }
});

module.exports = router;
