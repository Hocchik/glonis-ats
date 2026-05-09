const PREGUNTAS_INVERTIDAS = new Set([4, 7, 9, 14]);

function calcularScoreCuestionario(respuestas) {
  if (!respuestas || respuestas.length === 0) return 0;

  const suma = respuestas.reduce((acc, r) => {
    const valor = PREGUNTAS_INVERTIDAS.has(r.preguntaId)
      ? 6 - r.valorLikert
      : r.valorLikert;
    return acc + valor;
  }, 0);

  return (suma / (18 * 5)) * 100;
}

function calcularScoreDisponibilidad(disponibilidad) {
  if (!disponibilidad) return 0;

  let score = 0;

  // Turnos: hasta 75 puntos (25 por turno)
  if (disponibilidad.turnoManana) score += 25;
  if (disponibilidad.turnoTarde) score += 25;
  if (disponibilidad.turnoNoche) score += 25;

  // Fines de semana: 15 puntos
  if (disponibilidad.finesDeSemanaDispo) score += 15;

  // Horas semanales: proporcional a 10 puntos (asumiendo 48h como máximo)
  const horasMax = 48;
  const horas = Math.min(disponibilidad.horasSemanales || 0, horasMax);
  score += (horas / horasMax) * 10;

  return Math.min(100, score);
}

function calcularScoreTotal(scoreCV, scoreDisponibilidad, scoreCuestionario, scoreCoherencia = 0) {
  return (
    scoreCV * 0.35 +
    scoreDisponibilidad * 0.25 +
    scoreCuestionario * 0.25 +
    scoreCoherencia * 0.15
  );
}

module.exports = { calcularScoreCuestionario, calcularScoreDisponibilidad, calcularScoreTotal };
