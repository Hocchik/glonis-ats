const express = require('express');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');

const router = express.Router();

const ESTADOS_VALIDOS = ['ACTIVA', 'PAUSADA', 'CERRADA'];
const PUESTOS_VALIDOS = [
  'GERENTE_TIENDA', 'ASESOR_VENTAS', 'COORDINADOR_COMPRAS', 'JEFE_ALMACEN',
  'COMMUNITY_MANAGER', 'PRACTICANTE_MARKETING', 'ANALISTA_RRHH', 'CONTADOR',
  'PRACTICANTE_CONTABILIDAD', 'OPERADOR_SERVICIO_CLIENTE', 'AUXILIAR_TIENDA',
  'AGENTE_SEGURIDAD_TIENDA', 'SUPERVISOR_SEGURIDAD', 'AGENTE_SEGURIDAD_ALMACEN',
];
const TURNOS_PREFERIDOS = ['MANANA', 'TARDE', 'AMBOS'];

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
    if (req.query.puesto) {
      if (!PUESTOS_VALIDOS.includes(req.query.puesto)) {
        return res.status(400).json({ error: true, message: 'Puesto inválido', code: 'INVALID_PUESTO' });
      }
      where.puesto = req.query.puesto;
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
    const { titulo, puesto, descripcion, requisitos, tipoContrato, turnoPreferido, fechaCierre } = req.body;

    if (!titulo || !puesto || !descripcion || !requisitos || !tipoContrato || !turnoPreferido) {
      return res.status(400).json({ error: true, message: 'Campos requeridos incompletos', code: 'MISSING_FIELDS' });
    }

    if (!PUESTOS_VALIDOS.includes(puesto)) {
      return res.status(400).json({ error: true, message: 'Puesto inválido', code: 'INVALID_PUESTO' });
    }

    if (!TURNOS_PREFERIDOS.includes(turnoPreferido)) {
      return res.status(400).json({ error: true, message: 'Turno preferido inválido', code: 'INVALID_TURNO' });
    }

    const vacante = await prisma.vacante.create({
      data: {
        titulo,
        puesto,
        descripcion,
        requisitos,
        tipoContrato,
        turnoPreferido,
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
    const { titulo, puesto, descripcion, requisitos, tipoContrato, turnoPreferido, fechaCierre } = req.body;

    if (puesto && !PUESTOS_VALIDOS.includes(puesto)) {
      return res.status(400).json({ error: true, message: 'Puesto inválido', code: 'INVALID_PUESTO' });
    }
    if (turnoPreferido && !TURNOS_PREFERIDOS.includes(turnoPreferido)) {
      return res.status(400).json({ error: true, message: 'Turno preferido inválido', code: 'INVALID_TURNO' });
    }

    const vacante = await prisma.vacante.update({
      where: { id: req.params.id },
      data: {
        ...(titulo && { titulo }),
        ...(puesto && { puesto }),
        ...(descripcion && { descripcion }),
        ...(requisitos && { requisitos }),
        ...(tipoContrato && { tipoContrato }),
        ...(turnoPreferido && { turnoPreferido }),
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
    const vacanteId = req.params.id;
    const force = req.query.force === 'true' || req.query.force === '1';

    const conteo = await prisma.postulacion.count({ where: { vacanteId } });

    if (conteo > 0 && !force) {
      return res.status(409).json({
        error: true,
        message: `Esta vacante tiene ${conteo} postulación${conteo !== 1 ? 'es' : ''}. Confirma para eliminar todo.`,
        code: 'HAS_POSTULACIONES',
        conteo,
      });
    }

    if (conteo > 0) {
      // Cascade manual dentro de transacción — los candidatos NO se eliminan (pueden tener otras postulaciones)
      const postulaciones = await prisma.postulacion.findMany({
        where: { vacanteId },
        select: { id: true },
      });
      const ids = postulaciones.map((p) => p.id);

      await prisma.$transaction([
        prisma.entrevista.deleteMany({ where: { postulacionId: { in: ids } } }),
        prisma.respuestaFormulario.deleteMany({ where: { postulacionId: { in: ids } } }),
        prisma.scoreDetalle.deleteMany({ where: { postulacionId: { in: ids } } }),
        prisma.disponibilidad.deleteMany({ where: { postulacionId: { in: ids } } }),
        prisma.postulacion.deleteMany({ where: { vacanteId } }),
        prisma.vacante.delete({ where: { id: vacanteId } }),
      ]);
    } else {
      await prisma.vacante.delete({ where: { id: vacanteId } });
    }

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
