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

function calcularScoreDisponibilidad(disponibilidad, turnoPreferido) {
  if (!disponibilidad) return 0;

  // FULLTIME cubre cualquier turno
  if (disponibilidad.modalidad === 'FULLTIME') return 100;

  // PARTTIME — depende de si el candidato cubre el turno preferido de la vacante
  const ambosCandidato = disponibilidad.turnoManana && disponibilidad.turnoTarde;

  if (turnoPreferido === 'AMBOS' || ambosCandidato) return 75;
  if (turnoPreferido === 'MANANA' && disponibilidad.turnoManana) return 75;
  if (turnoPreferido === 'TARDE' && disponibilidad.turnoTarde) return 75;

  return 25;
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
