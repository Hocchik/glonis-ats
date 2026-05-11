const express = require('express');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');

const router = express.Router();

const ESTADOS_VALIDOS = ['ACTIVA', 'PAUSADA', 'CERRADA'];
const AREAS_VALIDAS = ['VENTAS', 'CAJA', 'ALMACEN', 'VISUAL', 'OTRO'];

function generarSlug(titulo) {
  const base = titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${base}-${suffix}`;
}

router.get('/', auth, async (req, res, next) => {
  try {
    const where = {};
    if (req.query.estado) {
      if (!ESTADOS_VALIDOS.includes(req.query.estado)) {
        return res.status(400).json({ error: true, message: 'Estado inválido', code: 'INVALID_ESTADO' });
      }
      where.estado = req.query.estado;
    }
    if (req.query.area) {
      if (!AREAS_VALIDAS.includes(req.query.area)) {
        return res.status(400).json({ error: true, message: 'Área inválida', code: 'INVALID_AREA' });
      }
      where.area = req.query.area;
    }

    const vacantes = await prisma.vacante.findMany({
      where,
      orderBy: { creadoEn: 'desc' },
      include: { _count: { select: { postulaciones: true } } },
    });

    res.json(vacantes);
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, async (req, res, next) => {
  try {
    const { titulo, area, descripcion, requisitos, tipoContrato, turno, fechaCierre } = req.body;

    if (!titulo || !area || !descripcion || !requisitos || !tipoContrato || !turno) {
      return res.status(400).json({ error: true, message: 'Campos requeridos incompletos', code: 'MISSING_FIELDS' });
    }

    const vacante = await prisma.vacante.create({
      data: {
        titulo,
        area,
        descripcion,
        requisitos,
        tipoContrato,
        turno,
        slug: generarSlug(titulo),
        fechaCierre: fechaCierre ? new Date(fechaCierre) : null,
        usuarioId: req.usuario.id,
      },
    });

    res.status(201).json(vacante);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', auth, async (req, res, next) => {
  try {
    const vacante = await prisma.vacante.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { postulaciones: true } } },
    });

    if (!vacante) {
      return res.status(404).json({ error: true, message: 'Vacante no encontrada', code: 'NOT_FOUND' });
    }

    res.json(vacante);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth, async (req, res, next) => {
  try {
    const { titulo, area, descripcion, requisitos, tipoContrato, turno, fechaCierre } = req.body;

    const vacante = await prisma.vacante.update({
      where: { id: req.params.id },
      data: {
        ...(titulo && { titulo }),
        ...(area && { area }),
        ...(descripcion && { descripcion }),
        ...(requisitos && { requisitos }),
        ...(tipoContrato && { tipoContrato }),
        ...(turno && { turno }),
        ...(fechaCierre && !isNaN(new Date(fechaCierre)) && { fechaCierre: new Date(fechaCierre) }),
      },
    });

    res.json(vacante);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: true, message: 'Vacante no encontrada', code: 'NOT_FOUND' });
    }
    next(err);
  }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    const conteo = await prisma.postulacion.count({ where: { vacanteId: req.params.id } });
    if (conteo > 0) {
      return res.status(409).json({
        error: true,
        message: `No se puede eliminar: la vacante tiene ${conteo} postulación${conteo !== 1 ? 'es' : ''}. Ciérrala en su lugar.`,
        code: 'HAS_POSTULACIONES',
      });
    }

    await prisma.vacante.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: true, message: 'Vacante no encontrada', code: 'NOT_FOUND' });
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

    const vacante = await prisma.vacante.update({
      where: { id: req.params.id },
      data: { estado },
    });

    res.json(vacante);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: true, message: 'Vacante no encontrada', code: 'NOT_FOUND' });
    }
    next(err);
  }
});

module.exports = router;
