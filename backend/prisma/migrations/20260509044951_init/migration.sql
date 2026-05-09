-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'RECLUTADOR');

-- CreateEnum
CREATE TYPE "AreaVacante" AS ENUM ('VENTAS', 'CAJA', 'ALMACEN', 'VISUAL', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoVacante" AS ENUM ('ACTIVA', 'PAUSADA', 'CERRADA');

-- CreateEnum
CREATE TYPE "EtapaPipeline" AS ENUM ('POSTULADO', 'EN_REVISION', 'ENTREVISTA', 'OFERTA', 'DESCARTADO');

-- CreateEnum
CREATE TYPE "ModalidadEntrevista" AS ENUM ('PRESENCIAL', 'VIDEOLLAMADA');

-- CreateEnum
CREATE TYPE "EstadoEntrevista" AS ENUM ('PROGRAMADA', 'REALIZADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'RECLUTADOR',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vacante" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "area" "AreaVacante" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "requisitos" TEXT NOT NULL,
    "tipoContrato" TEXT NOT NULL,
    "turno" TEXT NOT NULL,
    "estado" "EstadoVacante" NOT NULL DEFAULT 'ACTIVA',
    "slug" TEXT NOT NULL,
    "fechaCierre" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "Vacante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidato" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "dni" TEXT,
    "distrito" TEXT,
    "cvUrl" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Candidato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Postulacion" (
    "id" TEXT NOT NULL,
    "etapa" "EtapaPipeline" NOT NULL DEFAULT 'POSTULADO',
    "scoreTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "candidatoId" TEXT NOT NULL,
    "vacanteId" TEXT NOT NULL,

    CONSTRAINT "Postulacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreDetalle" (
    "id" TEXT NOT NULL,
    "scoreCV" DOUBLE PRECISION NOT NULL,
    "scoreDisponibilidad" DOUBLE PRECISION NOT NULL,
    "scoreCuestionario" DOUBLE PRECISION NOT NULL,
    "scoreCoherencia" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "keywordsEncontradas" TEXT[],
    "postulacionId" TEXT NOT NULL,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoreDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disponibilidad" (
    "id" TEXT NOT NULL,
    "turnoManana" BOOLEAN NOT NULL,
    "turnoTarde" BOOLEAN NOT NULL,
    "turnoNoche" BOOLEAN NOT NULL,
    "finesDeSemanaDispo" BOOLEAN NOT NULL,
    "horasSemanales" INTEGER NOT NULL,
    "postulacionId" TEXT NOT NULL,

    CONSTRAINT "Disponibilidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RespuestaFormulario" (
    "id" TEXT NOT NULL,
    "preguntaId" INTEGER NOT NULL,
    "valorLikert" INTEGER NOT NULL,
    "postulacionId" TEXT NOT NULL,

    CONSTRAINT "RespuestaFormulario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entrevista" (
    "id" TEXT NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL,
    "modalidad" "ModalidadEntrevista" NOT NULL,
    "notas" TEXT,
    "estado" "EstadoEntrevista" NOT NULL DEFAULT 'PROGRAMADA',
    "postulacionId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entrevista_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Vacante_slug_key" ON "Vacante"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Candidato_email_key" ON "Candidato"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreDetalle_postulacionId_key" ON "ScoreDetalle"("postulacionId");

-- CreateIndex
CREATE UNIQUE INDEX "Disponibilidad_postulacionId_key" ON "Disponibilidad"("postulacionId");

-- AddForeignKey
ALTER TABLE "Vacante" ADD CONSTRAINT "Vacante_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Postulacion" ADD CONSTRAINT "Postulacion_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "Candidato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Postulacion" ADD CONSTRAINT "Postulacion_vacanteId_fkey" FOREIGN KEY ("vacanteId") REFERENCES "Vacante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreDetalle" ADD CONSTRAINT "ScoreDetalle_postulacionId_fkey" FOREIGN KEY ("postulacionId") REFERENCES "Postulacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disponibilidad" ADD CONSTRAINT "Disponibilidad_postulacionId_fkey" FOREIGN KEY ("postulacionId") REFERENCES "Postulacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespuestaFormulario" ADD CONSTRAINT "RespuestaFormulario_postulacionId_fkey" FOREIGN KEY ("postulacionId") REFERENCES "Postulacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrevista" ADD CONSTRAINT "Entrevista_postulacionId_fkey" FOREIGN KEY ("postulacionId") REFERENCES "Postulacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
