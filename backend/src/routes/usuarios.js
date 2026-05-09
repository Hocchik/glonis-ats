const express = require('express');
const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');

const router = express.Router();

// Solo ADMIN puede acceder a estas rutas
function soloAdmin(req, res, next) {
  if (req.usuario.rol !== 'ADMIN') {
    return res.status(403).json({ error: true, message: 'Solo administradores pueden gestionar usuarios', code: 'FORBIDDEN' });
  }
  next();
}

router.get('/', auth, soloAdmin, async (req, res, next) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: { id: true, nombre: true, email: true, rol: true, creadoEn: true },
      orderBy: { creadoEn: 'asc' },
    });
    res.json(usuarios);
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, soloAdmin, async (req, res, next) => {
  try {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: true, message: 'Nombre, email y contraseña son requeridos', code: 'MISSING_FIELDS' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: true, message: 'Formato de email inválido', code: 'INVALID_EMAIL' });
    }

    // RECLUTADOR es el rol por defecto; solo ADMIN puede crear otro ADMIN
    const rolFinal = rol === 'ADMIN' ? 'ADMIN' : 'RECLUTADOR';

    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (existe) {
      return res.status(409).json({ error: true, message: 'Ya existe un usuario con ese email', code: 'EMAIL_TAKEN' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const usuario = await prisma.usuario.create({
      data: { nombre, email, passwordHash, rol: rolFinal },
      select: { id: true, nombre: true, email: true, rol: true, creadoEn: true },
    });

    res.status(201).json(usuario);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth, soloAdmin, async (req, res, next) => {
  try {
    const { nombre, email, password, rol } = req.body;

    if (email) {
      const existe = await prisma.usuario.findFirst({
        where: { email, NOT: { id: req.params.id } },
      });
      if (existe) {
        return res.status(409).json({ error: true, message: 'Ya existe un usuario con ese email', code: 'EMAIL_TAKEN' });
      }
    }

    // No se puede degradar al último admin — verificado dentro de una transacción para evitar race condition
    if (rol === 'RECLUTADOR') {
      const [admins, esAdmin] = await prisma.$transaction([
        prisma.usuario.count({ where: { rol: 'ADMIN' } }),
        prisma.usuario.findUnique({ where: { id: req.params.id }, select: { rol: true } }),
      ]);
      if (esAdmin?.rol === 'ADMIN' && admins <= 1) {
        return res.status(400).json({ error: true, message: 'No puedes degradar al único administrador', code: 'LAST_ADMIN' });
      }
    }

    const data = {};
    if (nombre) data.nombre = nombre;
    if (email) data.email = email;
    if (rol) data.rol = rol === 'ADMIN' ? 'ADMIN' : 'RECLUTADOR';
    if (password) data.passwordHash = await bcrypt.hash(password, 10);

    const usuario = await prisma.usuario.update({
      where: { id: req.params.id },
      data,
      select: { id: true, nombre: true, email: true, rol: true, creadoEn: true },
    });

    res.json(usuario);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: true, message: 'Usuario no encontrado', code: 'NOT_FOUND' });
    }
    next(err);
  }
});

router.delete('/:id', auth, soloAdmin, async (req, res, next) => {
  try {
    if (req.params.id === req.usuario.id) {
      return res.status(400).json({ error: true, message: 'No puedes eliminarte a ti mismo', code: 'SELF_DELETE' });
    }

    const [admins, objetivo] = await prisma.$transaction([
      prisma.usuario.count({ where: { rol: 'ADMIN' } }),
      prisma.usuario.findUnique({ where: { id: req.params.id }, select: { rol: true } }),
    ]);
    if (objetivo?.rol === 'ADMIN' && admins <= 1) {
      return res.status(400).json({ error: true, message: 'No puedes eliminar al único administrador', code: 'LAST_ADMIN' });
    }

    await prisma.usuario.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: true, message: 'Usuario no encontrado', code: 'NOT_FOUND' });
    }
    next(err);
  }
});

module.exports = router;
