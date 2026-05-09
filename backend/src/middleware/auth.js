const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: true, message: 'Token requerido', code: 'NO_TOKEN' });
  }

  const token = header.slice(7);

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: true, message: 'Token inválido o expirado', code: 'INVALID_TOKEN' });
  }
}

module.exports = auth;
