// Etiquetas y agrupación de puestos (frontend).
// Las claves coinciden con el enum PuestoTipo del backend.

export const PUESTO_LABEL = {
  GERENTE_TIENDA: 'Gerente de tienda',
  ASESOR_VENTAS: 'Asesor de ventas',
  AUXILIAR_TIENDA: 'Auxiliar de tienda',
  JEFE_ALMACEN: 'Jefe de almacén',
  COORDINADOR_COMPRAS: 'Coordinador de compras',
  COMMUNITY_MANAGER: 'Community manager',
  PRACTICANTE_MARKETING: 'Practicante de marketing',
  ANALISTA_RRHH: 'Analista de RRHH',
  CONTADOR: 'Contador',
  PRACTICANTE_CONTABILIDAD: 'Practicante de contabilidad',
  AGENTE_SEGURIDAD_TIENDA: 'Agente de seguridad — tienda',
  SUPERVISOR_SEGURIDAD: 'Supervisor de seguridad',
  AGENTE_SEGURIDAD_ALMACEN: 'Agente de seguridad — almacén',
  OPERADOR_SERVICIO_CLIENTE: 'Operador de servicio al cliente',
};

export const PUESTOS_AGRUPADOS = [
  {
    grupo: 'Tienda y Ventas',
    puestos: ['GERENTE_TIENDA', 'ASESOR_VENTAS', 'AUXILIAR_TIENDA'],
  },
  {
    grupo: 'Logística y Compras',
    puestos: ['JEFE_ALMACEN', 'COORDINADOR_COMPRAS'],
  },
  {
    grupo: 'Marketing',
    puestos: ['COMMUNITY_MANAGER', 'PRACTICANTE_MARKETING'],
  },
  {
    grupo: 'Administración y Finanzas',
    puestos: ['ANALISTA_RRHH', 'CONTADOR', 'PRACTICANTE_CONTABILIDAD'],
  },
  {
    grupo: 'Seguridad',
    puestos: ['AGENTE_SEGURIDAD_TIENDA', 'SUPERVISOR_SEGURIDAD', 'AGENTE_SEGURIDAD_ALMACEN'],
  },
  {
    grupo: 'Atención al Cliente',
    puestos: ['OPERADOR_SERVICIO_CLIENTE'],
  },
];

export const TURNO_PREFERIDO_LABEL = {
  MANANA: 'Mañana',
  TARDE: 'Tarde',
  AMBOS: 'Ambos turnos',
};

export const PUESTOS_PRACTICANTE = ['PRACTICANTE_MARKETING', 'PRACTICANTE_CONTABILIDAD'];

export const CONTRATOS_OPCIONES = ['Indefinido', 'Plazo fijo', 'Prácticas'];

export function esPuestoPracticante(puesto) {
  return PUESTOS_PRACTICANTE.includes(puesto);
}

// Calcula los contratos válidos para un puesto: practicante → solo "Prácticas"; resto → todos menos "Prácticas"
export function contratosPermitidos(puesto) {
  return esPuestoPracticante(puesto)
    ? ['Prácticas']
    : ['Indefinido', 'Plazo fijo'];
}
