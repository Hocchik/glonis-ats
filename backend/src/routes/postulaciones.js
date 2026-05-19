const express = require('express');
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const { calcularScoreTotal } = require('../services/scoringService');

const router = express.Router();

const ETAPAS_VALIDAS = ['POSTULADO', 'EN_REVISION', 'ENTREVISTA', 'OFERTA', 'DESCARTADO'];

router.get('/', auth, async (req, res, next) => {
  try {
    const where = {};
    if (req.query.vacanteId) where.vacanteId = req.query.vacanteId;
    if (req.query.etapa) {
      if (!ETAPAS_VALIDAS.includes(req.query.etapa)) {
        return res.status(400).json({ error: true, message: 'Etapa inválida', code: 'INVALID_ETAPA' });
      }
      where.etapa = req.query.etapa;
    }

    const postulaciones = await prisma.postulacion.findMany({
      where,
      orderBy: { scoreTotal: 'desc' },
      include: {
        candidato: {
          select: { id: true, nombre: true, email: true, telefono: true, distrito: true, cvUrl: true },
        },
        vacante: {
          select: { id: true, titulo: true, puesto: true, slug: true },
        },
        score: {
          select: {
            scoreCV: true,
            scoreDisponibilidad: true,
            scoreCuestionario: true,
            scoreCoherencia: true,
          },
        },
      },
    });

    res.json(postulaciones);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', auth, async (req, res, next) => {
  try {
    const postulacion = await prisma.postulacion.findUnique({
      where: { id: req.params.id },
      include: {
        candidato: true,
        vacante: {
          select: { id: true, titulo: true, puesto: true, slug: true, estado: true },
        },
        score: true,
        respuestas: { orderBy: { preguntaId: 'asc' } },
        disponibilidad: true,
        entrevistas: { orderBy: { fechaHora: 'asc' } },
      },
    });

    if (!postulacion) {
      return res.status(404).json({ error: true, message: 'Postulación no encontrada', code: 'NOT_FOUND' });
    }

    res.json(postulacion);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/etapa', auth, async (req, res, next) => {
  try {
    const { etapa } = req.body;

    if (!etapa || !ETAPAS_VALIDAS.includes(etapa)) {
      return res.status(400).json({ error: true, message: 'Etapa inválida', code: 'INVALID_ETAPA' });
    }

    const postulacion = await prisma.postulacion.update({
      where: { id: req.params.id },
      data: { etapa },
      include: { candidato: { select: { nombre: true } }, vacante: { select: { titulo: true } } },
    });

    res.json(postulacion);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: true, message: 'Postulación no encontrada', code: 'NOT_FOUND' });
    }
    next(err);
  }
});

router.patch('/:id/coherencia', auth, async (req, res, next) => {
  try {
    const coherencia = Number(req.body.scoreCoherencia);

    if (isNaN(coherencia) || coherencia < 1 || coherencia > 5) {
      return res.status(400).json({ error: true, message: 'scoreCoherencia debe ser un número entre 1 y 5', code: 'INVALID_COHERENCIA' });
    }

    // Normalizar coherencia de escala 1-5 a 0-100
    const scoreCoherenciaNorm = ((coherencia - 1) / 4) * 100;

    const scoreDetalle = await prisma.scoreDetalle.findUnique({
      where: { postulacionId: req.params.id },
    });

    if (!scoreDetalle) {
      return res.status(404).json({ error: true, message: 'Postulación no encontrada', code: 'NOT_FOUND' });
    }

    const nuevoScoreTotal = calcularScoreTotal(
      scoreDetalle.scoreCV,
      scoreDetalle.scoreDisponibilidad,
      scoreDetalle.scoreCuestionario,
      scoreCoherenciaNorm,
    );

    const [updatedScore, updatedPost] = await prisma.$transaction([
      prisma.scoreDetalle.update({
        where: { postulacionId: req.params.id },
        data: { scoreCoherencia: scoreCoherenciaNorm },
      }),
      prisma.postulacion.update({
        where: { id: req.params.id },
        data: { scoreTotal: nuevoScoreTotal },
      }),
    ]);

    res.json({
      ...updatedPost,
      score: updatedScore,
    });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: true, message: 'Postulación no encontrada', code: 'NOT_FOUND' });
    }
    next(err);
  }
});

module.exports = router;
