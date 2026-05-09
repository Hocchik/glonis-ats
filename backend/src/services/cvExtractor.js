const pdfParse = require('pdf-parse');
const fs = require('fs');

const KEYWORDS_RETAIL = [
  'ventas', 'vendedor', 'vendedora', 'atencion al cliente', 'servicio al cliente',
  'tienda', 'retail', 'comercio', 'boutique', 'moda', 'indumentaria', 'ropa',
  'caja', 'cajero', 'cajera', 'cobro', 'pos', 'punto de venta', 'efectivo',
  'vuelto', 'facturacion', 'boleta', 'factura',
  'almacen', 'almacenero', 'inventario', 'stock', 'mercaderia', 'picking',
  'despacho', 'recepcion de mercaderia', 'control de stock',
  'visual merchandising', 'vitrina', 'exhibicion', 'planograma', 'escaparate',
  'trabajo en equipo', 'proactivo', 'proactiva', 'responsable', 'puntual',
  'comunicacion', 'orientado al cliente', 'orientada al cliente',
  'administracion', 'marketing', 'negocios', 'textil', 'diseno de modas',
];

function normalizar(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

async function extractCV(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    const texto = normalizar(data.text);

    const keywordsEncontradas = KEYWORDS_RETAIL.filter((kw) => texto.includes(kw));

    const scoreCV = Math.min(100, (keywordsEncontradas.length / KEYWORDS_RETAIL.length) * 100);

    return { scoreCV, keywordsEncontradas };
  } catch {
    return { scoreCV: 0, keywordsEncontradas: [] };
  }
}

module.exports = { extractCV };
