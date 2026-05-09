require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, message: 'Demasiados intentos, intenta en 15 minutos', code: 'RATE_LIMITED' },
});

const postularLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, message: 'Demasiadas postulaciones desde esta dirección', code: 'RATE_LIMITED' },
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/vacantes', require('./routes/vacantes'));
app.use('/api/postulaciones', require('./routes/postulaciones'));
app.use('/api/candidatos', require('./routes/candidatos'));
app.use('/api/entrevistas', require('./routes/entrevistas'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/public/postular', postularLimiter);
app.use('/public', require('./routes/public'));

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Glonis ATS API en puerto ${PORT}`);
});
