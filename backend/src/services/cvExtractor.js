const pdfParse = require('pdf-parse');
const fs = require('fs');

// Banco de keywords por puesto. Todas pre-normalizadas (lowercase, sin tildes).
// `alta` pondera x2, `comp` pondera x1.
const KEYWORDS_POR_PUESTO = {
  GERENTE_TIENDA: {
    alta: ['gerente de tienda', 'store manager', 'gestion de personal', 'kpis', 'control de inventario', 'visual merchandising', 'p&l', 'presupuesto'],
    comp: ['liderazgo', 'retail', 'ventas', 'moda', 'atencion al cliente', 'excel', 'rotacion de personal'],
  },
  ASESOR_VENTAS: {
    alta: ['ventas al detalle', 'atencion al cliente', 'retail', 'moda', 'fidelizacion', 'cross-selling', 'upselling'],
    comp: ['pos', 'caja registradora', 'trabajo en equipo', 'comunicacion', 'actitud de servicio', 'textiles'],
  },
  COORDINADOR_COMPRAS: {
    alta: ['compras', 'buyer', 'negociacion con proveedores', 'gestion de inventario', 'moda', 'open to buy', 'otb'],
    comp: ['tendencias', 'presupuesto', 'excel', 'sap', 'importacion', 'cadena de suministro', 'erp'],
  },
  JEFE_ALMACEN: {
    alta: ['almacen', 'logistica', 'gestion de inventario', 'despacho', 'recepcion de mercaderia', 'wms', 'control de stock'],
    comp: ['excel', 'liderazgo', 'erp', 'picking', 'packing', 'kardex', 'rotacion de inventario'],
  },
  COMMUNITY_MANAGER: {
    alta: ['redes sociales', 'community manager', 'instagram', 'tiktok', 'contenido', 'moda', 'campanas digitales', 'meta ads'],
    comp: ['canva', 'fotografia', 'copywriting', 'seo', 'email marketing', 'analytics', 'influencer marketing'],
  },
  PRACTICANTE_MARKETING: {
    alta: ['marketing', 'redes sociales', 'contenido', 'campanas'],
    comp: ['canva', 'diseno', 'copywriting', 'instagram', 'entusiasmo'],
  },
  ANALISTA_RRHH: {
    alta: ['seleccion de personal', 'reclutamiento', 'onboarding', 'nomina', 'planilla', 'rrhh', 'evaluacion de desempeno'],
    comp: ['ats', 'hris', 'excel', 'legislacion laboral', 'entrevistas por competencias', 'clima laboral', 'capacitacion'],
  },
  CONTADOR: {
    alta: ['contabilidad', 'niif', 'pcge', 'balance', 'estados financieros', 'costo de ventas', 'erp', 'sap'],
    comp: ['excel', 'flujo de caja', 'presupuesto', 'auditoria', 'sunat', 'tesoreria', 'conciliacion bancaria'],
  },
  PRACTICANTE_CONTABILIDAD: {
    alta: ['contabilidad', 'pcge', 'facturas', 'asientos contables'],
    comp: ['excel', 'sunat', 'facturacion', 'entusiasmo'],
  },
  OPERADOR_SERVICIO_CLIENTE: {
    alta: ['servicio al cliente', 'atencion al cliente', 'reclamaciones', 'crm', 'omnicanal'],
    comp: ['empatia', 'tolerancia', 'excel', 'chat', 'whatsapp business', 'retail'],
  },
  AUXILIAR_TIENDA: {
    alta: ['reposicion', 'inventario', 'organizacion', 'etiquetado', 'caja', 'atencion al cliente'],
    comp: ['retail', 'trabajo en equipo', 'responsabilidad', 'puntualidad', 'disponibilidad'],
  },
  AGENTE_SEGURIDAD_TIENDA: {
    alta: ['seguridad', 'vigilancia', 'control de acceso', 'prevencion de robos', 'cctv', 'rondas', 'deteccion de hurto', 'sucamec'],
    comp: ['licencia de arma', 'atencion al cliente', 'uniforme', 'reporte de incidencias', 'turno rotativo'],
  },
  SUPERVISOR_SEGURIDAD: {
    alta: ['supervisor de seguridad', 'jefe de seguridad', 'gestion de equipos', 'prevencion de perdidas', 'control de merma', 'cctv', 'sucamec'],
    comp: ['licencia de arma', 'excel', 'reportes', 'auditoria de inventario', 'normas basc'],
  },
  AGENTE_SEGURIDAD_ALMACEN: {
    alta: ['seguridad de almacen', 'control de ingreso', 'registro de visitas', 'vigilancia de carga', 'custodia de mercaderia', 'sucamec'],
    comp: ['turno nocturno', 'cctv', 'rondas', 'reporte', 'logistica'],
  },
};

function normalizar(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

async function extractCV(filePath, puesto) {
  try {
    const banco = KEYWORDS_POR_PUESTO[puesto];
    if (!banco) {
      return { scoreCV: 0, keywordsEncontradas: [] };
    }

    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    const texto = normalizar(data.text);

    const altaEncontradas = banco.alta.filter((kw) => texto.includes(kw));
    const compEncontradas = banco.comp.filter((kw) => texto.includes(kw));

    const obtenido = altaEncontradas.length * 2 + compEncontradas.length * 1;
    const total = banco.alta.length * 2 + banco.comp.length * 1;
    const scoreCV = total > 0 ? Math.min(100, (obtenido / total) * 100) : 0;

    return {
      scoreCV,
      keywordsEncontradas: [...altaEncontradas, ...compEncontradas],
    };
  } catch {
    return { scoreCV: 0, keywordsEncontradas: [] };
  }
}

module.exports = { extractCV, KEYWORDS_POR_PUESTO };
