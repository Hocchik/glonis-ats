const express = require('express');
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');

const router = express.Router();

const ESTADOS_VALIDOS = ['PROGRAMADA', 'REALIZADA', 'CANCELADA'];
const MODALIDADES_VALIDAS = ['PRESENCIAL', 'VIDEOLLAMADA'];

router.get('/', auth, async (req, res, next) => {
  try {
    const where = {};

    if (req.query.vacanteId) {
      where.postulacion = { vacanteId: req.query.vacanteId };
    }

    if (req.query.mes) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(req.query.mes)) {
        return res.status(400).json({ error: true, message: 'Formato de mes inválido, use YYYY-MM', code: 'INVALID_MES' });
      }
      const [year, month] = req.query.mes.split('-').map(Number);
      const inicio = new Date(year, month - 1, 1);
      const fin = new Date(year, month, 0, 23, 59, 59);
      where.fechaHora = { gte: inicio, lte: fin };
    }

    const entrevistas = await prisma.entrevista.findMany({
      where,
      orderBy: { fechaHora: 'asc' },
      include: {
        postulacion: {
          include: {
            candidato: { select: { id: true, nombre: true, email: true } },
            vacante: { select: { id: true, titulo: true, area: true } },
          },
        },
      },
    });

    res.json(entrevistas);
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, async (req, res, next) => {
  try {
    const { postulacionId, fechaHora, modalidad, notas } = req.body;

    if (!postulacionId || !fechaHora || !modalidad) {
      return res.status(400).json({ error: true, message: 'postulacionId, fechaHora y modalidad son requeridos', code: 'MISSING_FIELDS' });
    }

    if (!MODALIDADES_VALIDAS.includes(modalidad)) {
      return res.status(400).json({ error: true, message: 'Modalidad inválida', code: 'INVALID_MODALIDAD' });
    }

    const postulacion = await prisma.postulacion.findUnique({ where: { id: postulacionId } });
    if (!postulacion) {
      return res.status(404).json({ error: true, message: 'Postulación no encontrada', code: 'NOT_FOUND' });
    }

    const [entrevista] = await prisma.$transaction([
      prisma.entrevista.create({
        data: {
          postulacionId,
          fechaHora: new Date(fechaHora),
          modalidad,
          notas: notas || null,
        },
        include: {
          postulacion: {
            include: {
              candidato: { select: { nombre: true } },
              vacante: { select: { titulo: true } },
            },
          },
        },
      }),
      prisma.postulacion.update({
        where: { id: postulacionId },
        data: { etapa: 'ENTREVISTA' },
      }),
    ]);

    res.status(201).json(entrevista);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth, async (req, res, next) => {
  try {
    const { fechaHora, modalidad, notas, estado } = req.body;

    if (estado && !ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({ error: true, message: 'Estado inválido', code: 'INVALID_ESTADO' });
    }

    if (modalidad && !MODALIDADES_VALIDAS.includes(modalidad)) {
      return res.status(400).json({ error: true, message: 'Modalidad inválida', code: 'INVALID_MODALIDAD' });
    }

    const entrevista = await prisma.entrevista.update({
      where: { id: req.params.id },
      data: {
        ...(fechaHora && { fechaHora: new Date(fechaHora) }),
        ...(modalidad && { modalidad }),
        ...(notas !== undefined && { notas }),
        ...(estado && { estado }),
      },
    });

    res.json(entrevista);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: true, message: 'Entrevista no encontrada', code: 'NOT_FOUND' });
    }
    next(err);
  }
});

router.patch('/:id/estado', auth, async (req, res, next) => {
  try {
    const { estado } = req.body;

    if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({ error: true, message: 'Estado inválido', code: 'INVALID_ESTADO' });
    }

    const entrevista = await prisma.entrevista.update({
      where: { id: req.params.id },
      data: { estado },
    });

    res.json(entrevista);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: true, message: 'Entrevista no encontrada', code: 'NOT_FOUND' });
    }
    next(err);
  }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    await prisma.entrevista.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: true, message: 'Entrevista no encontrada', code: 'NOT_FOUND' });
    }
    next(err);
  }
});

module.exports = router;
