const express = require('express');
const path = require('path');
const fs = require('fs');
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/:id', auth, async (req, res, next) => {
  try {
    const candidato = await prisma.candidato.findUnique({
      where: { id: req.params.id },
      include: {
        postulaciones: {
          orderBy: { creadoEn: 'desc' },
          include: {
            vacante: { select: { id: true, titulo: true, area: true } },
            score: true,
          },
        },
      },
    });

    if (!candidato) {
      return res.status(404).json({ error: true, message: 'Candidato no encontrado', code: 'NOT_FOUND' });
    }

    res.json(candidato);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/cv', auth, async (req, res, next) => {
  try {
    const candidato = await prisma.candidato.findUnique({
      where: { id: req.params.id },
      select: { cvUrl: true, nombre: true },
    });

    if (!candidato) {
      return res.status(404).json({ error: true, message: 'Candidato no encontrado', code: 'NOT_FOUND' });
    }

    // cvUrl es "/uploads/filename.pdf"
    const filename = path.basename(candidato.cvUrl);
    const filePath = path.join(__dirname, '../../../../uploads', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: true, message: 'CV no encontrado', code: 'CV_NOT_FOUND' });
    }

    const safeNombre = candidato.nombre.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim().replace(/\s+/g, '_') || 'candidato';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeNombre}-CV.pdf"`);
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => res.status(500).json({ error: true, message: 'Error leyendo CV', code: 'STREAM_ERROR' }));
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
