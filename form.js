'use strict';
/* =====================================================================
   form.js: el formulario del FRAP (10 secciones), cálculos clínicos y edición
   ===================================================================== */
let F = null;            // datos del FRAP en pantalla
let REC = null;          // {id, folio, estatus, autor, creado_por, creado_en, guardado}
let SUCIO = false;       // hay cambios sin guardar en el servidor/registro
let ACTIVA = 'servicio';
let GPS_BUSCANDO = false;

/* ambulancia propia (vista lateral, mira a la derecha): barra de luces que alterna, ruedas que giran y haz de luz */
const AMB_VEC = `<svg class="amb-svg" viewBox="0 0 72 40" aria-hidden="true"><defs><linearGradient id="ambC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dfe8f5"/></linearGradient><linearGradient id="ambH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".85"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></linearGradient></defs>
  <polygon class="haz" points="66,25 96,15 96,35" fill="url(#ambH)"/>
  <rect x="26" y="3.5" width="5" height="4" rx="1" class="luz-a"/><rect x="31" y="3.5" width="5" height="4" rx="1" class="luz-b"/>
  <path d="M4 10 Q4 8 6 8 H44 V29 H4 Z" fill="url(#ambC)" stroke="#9fb3d1" stroke-width=".8"/>
  <path d="M44 10 H56 L67 21 V29 H44 Z" fill="url(#ambC)" stroke="#9fb3d1" stroke-width=".8"/>
  <path d="M47.5 12.5 H55 L62 20 H47.5 Z" fill="#7fb6f0" stroke="#5f93cf" stroke-width=".6"/>
  <rect x="4" y="19" width="63" height="3.2" fill="#e8650d"/><rect x="4" y="22.2" width="63" height="1.6" fill="#1d4aa8"/>
  <path d="M21 11.5 h4 v3.4 h3.4 v4 h-3.4 v3.4 h-4 v-3.4 h-3.4 v-4 h3.4z" fill="#1d4aa8" transform="translate(0,-1.4)"/>
  <rect x="62.5" y="22" width="4" height="2.6" rx="1" fill="#ffd166"/><rect x="3" y="25" width="2.4" height="4" fill="#b8c4d9"/>
  <g class="rueda" style="transform-origin:16px 31px"><circle cx="16" cy="31" r="5.6" fill="#1e293b"/><circle cx="16" cy="31" r="2.4" fill="#cbd5e1"/><path d="M16 26.6v8.8M11.6 31h8.8" stroke="#64748b" stroke-width=".8"/></g>
  <g class="rueda" style="transform-origin:54px 31px"><circle cx="54" cy="31" r="5.6" fill="#1e293b"/><circle cx="54" cy="31" r="2.4" fill="#cbd5e1"/><path d="M54 26.6v8.8M49.6 31h8.8" stroke="#64748b" stroke-width=".8"/></g>
</svg>`;
/* ambulancia con imagen (generada con IA, recortada con imagenes/recortar_ambulancia.py) + luces, ruedas y faro animados encima */
const AMB_SVG = `<svg class="amb-svg foto" viewBox="0 0 720 355" aria-hidden="true"><defs><linearGradient id="ambH2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff0b8" stop-opacity=".9"/><stop offset="1" stop-color="#fff0b8" stop-opacity="0"/></linearGradient></defs>
  <polygon class="haz" points="694,208 1010,120 1010,300" fill="url(#ambH2)"/>
  <image href="imagenes/ambulancia.png" x="0" y="0" width="720" height="355"/>
  <rect class="luz-a" x="222" y="0" width="58" height="12" rx="4"/><rect class="luz-b" x="305" y="0" width="58" height="12" rx="4"/>
  <rect class="luz-a" x="46" y="43" width="26" height="16" rx="3"/><rect class="luz-b" x="441" y="43" width="26" height="16" rx="3"/>
  <g class="rueda" style="transform-origin:153px 305px"><circle cx="153" cy="305" r="29" fill="#a3aab3"/><circle cx="153" cy="305" r="9" fill="#4b5563"/><g fill="#3b4350"><circle cx="153" cy="286" r="4.2"/><circle cx="171" cy="299" r="4.2"/><circle cx="164" cy="320" r="4.2"/><circle cx="142" cy="320" r="4.2"/><circle cx="135" cy="299" r="4.2"/></g></g>
  <g class="rueda" style="transform-origin:600px 305px"><circle cx="600" cy="305" r="29" fill="#a3aab3"/><circle cx="600" cy="305" r="9" fill="#4b5563"/><g fill="#3b4350"><circle cx="600" cy="286" r="4.2"/><circle cx="618" cy="299" r="4.2"/><circle cx="611" cy="320" r="4.2"/><circle cx="589" cy="320" r="4.2"/><circle cx="582" cy="299" r="4.2"/></g></g>
</svg>`;
const T_MOMENTOS = [['t_llamada', 'Llamada', '📞', 'r'], ['t_salida', 'Salida', '🚑', 'b'], ['t_llegada', 'Llegada', '📍', 'r'], ['t_traslado', 'Traslado', '🛏️', 'b'], ['t_hospital', 'Hospital', '🏥', 'r'], ['t_base', 'Base', '🏠', 'b']];
const LESIONES = [['Deformidades', 'D', '🦴'], ['Contusiones', 'C', '🟣'], ['Abrasiones', 'A', '🩹'], ['Penetraciones', 'P', '📌'], ['Movimiento paradójico', 'MP', '🫁'],
['Crepitación', 'Cr', '🦵'], ['Heridas', 'H', '🩸'], ['Fracturas', 'F', '💥'], ['Enfisema subcutáneo', 'E', '🫧'], ['Quemaduras', 'Q', '🔥'],
['Laceraciones', 'L', '✂️'], ['Edema', 'Ed', '💧'], ['Alteración de sensibilidad', 'AS', '✋'], ['Alteración de movilidad', 'AM', '🦽'], ['Dolor', 'Do', '⚡']];
const LES_IMG = ['les-deformidades', 'les-contusiones', 'les-abrasiones', 'les-penetraciones', 'les-paradojico', 'les-crepitacion', 'les-heridas', 'les-fracturas', 'les-enfisema', 'les-quemaduras', 'les-laceraciones', 'les-edema', 'les-sensibilidad', 'les-movilidad', 'les-dolor'];
const LES_COL = ['#7c3aed', '#9333ea', '#ea580c', '#dc2626', '#0891b2', '#ca8a04', '#be123c', '#4338ca', '#0d9488', '#f97316', '#e11d48', '#2563eb', '#a21caf', '#475569', '#eab308'];
const VISTAS = ['frente', 'espalda', 'lateral derecho', 'lateral izquierdo'];
const TRIAGE = [['rojo', 'ROJO', 'Inmediato', 'Vida en riesgo, atención ya'], ['amarillo', 'AMARILLO', 'Urgente', 'Grave, puede esperar poco'], ['verde', 'VERDE', 'Menor', 'Camina, lesiones leves'], ['negro', 'NEGRO', 'Expectante', 'Sin signos de vida']];
const CATETERES = [['14G', '≈ 270 ml/min', '#ea8a2f'], ['16G', '≈ 210 ml/min', '#8b8f98'], ['18G', '≈ 100 ml/min', '#22a455'], ['20G', '≈ 60 ml/min', '#ec6fa6'], ['22G', '≈ 35 ml/min', '#3b82f6'], ['24G', '≈ 22 ml/min', '#eab308']];
const VIT = [['fr', 'FR', 'rpm'], ['fc', 'FC', 'lpm'], ['tas', 'TAS', 'mmHg'], ['tad', 'TAD', 'mmHg'], ['sao2', 'SaO₂', '%'], ['temp', 'Temp', '°C'], ['gluc', 'Gluc', 'mg/dl']];

/* ---------- definición de las secciones ---------- */
const SECCIONES = [
  {
    id: 'servicio', n: 'Servicio', titulo: 'Datos del servicio', sub: 'Folio, fecha, cronología, motivo y lugar de la urgencia', ico: '🚑',
    clave: ['fecha', 't_llamada', 't_llegada', 'motivo', 'calle'], campos: [
      { t: 'x', fn: 'folio' },
      { t: 'text', k: 'sede', l: 'Sede', w: 4, ph: 'Sede' }, { t: 'text', k: 'subsede', l: 'Subsede', w: 4, ph: 'Subsede' },
      { t: 'date', k: 'fecha', l: 'Fecha del servicio', w: 4, fn: 'dia' },
      { t: 'sub', l: '⏱ Cronología del servicio', s: 'Toque «Ahora» en cada momento' },
      { t: 'x', fn: 'cronologia' },
      { t: 'sub', l: '🩺 Motivo de la atención' },
      { t: 'one', k: 'motivo', op: ['Enfermedad', 'Traumatismo', 'Ginecoobstétrico'] },
      { t: 'sub', l: '📍 Ubicación del servicio', s: 'Se llena sola con el GPS; puede corregir cualquier dato' },
      { t: 'x', fn: 'gps' },
      { t: 'text', k: 'calle', l: 'Calle', w: 6 }, { t: 'text', k: 'esquina', l: 'Esquina con (Y)', w: 6, ph: 'Calle que cruza' },
      { t: 'text', k: 'entre', l: 'Entre', w: 4, ph: 'Entre calles' }, { t: 'text', k: 'colonia', l: 'Colonia / Localidad', w: 4 }, { t: 'text', k: 'municipio', l: 'Municipio', w: 4, ph: 'Ixhuatlán del Café, Veracruz' },
      { t: 'sub', l: '📌 Lugar de ocurrencia' },
      { t: 'one', k: 'lugar', op: ['Hogar', 'Vía pública', 'Trabajo', 'Escuela', 'Recreación', 'Transporte'], otros: true }
    ]
  },
  {
    id: 'unidad', n: 'Unidad', titulo: 'Unidad', sub: 'Ambulancia, base y personal que presta el servicio', ico: '🚒',
    clave: ['ambulancia', 'operador', 'prestadores'], campos: [
      { t: 'x', fn: 'tomarUnidad' },
      { t: 'text', k: 'ambulancia', l: 'Ambulancia (No. económico)', w: 3 }, { t: 'text', k: 'base', l: 'Base', w: 3 },
      { t: 'text', k: 'otra_unidad', l: 'Otro tipo de unidad', w: 3, ph: 'Ej. Moto, rescate' }, { t: 'text', k: 'otra_unidad_n', l: 'Número', w: 3 },
      { t: 'text', k: 'operador', l: 'Operador', w: 6 }, { t: 'text', k: 'prestadores', l: 'Prestadores del servicio', w: 6, ph: 'Paramédicos que atienden' },
      { t: 'text', k: 'helicoptero', l: 'Matrícula del helicóptero', w: 6, ph: 'Sólo si aplica' }
    ]
  },
  {
    id: 'paciente', n: 'Paciente', titulo: 'Paciente', sub: 'Identificación y datos de contacto', ico: '🧑',
    clave: ['pac_nombre', 'sexo', 'edad'], campos: [
      { t: 'text', k: 'pac_nombre', l: 'Nombre o media filiación', w: 8 }, { t: 'one', k: 'sexo', l: 'Sexo', w: 4, op: [['Masculino', '♂ Masculino'], ['Femenino', '♀ Femenino']] },
      { t: 'number', k: 'edad', l: 'Edad', w: 3, suf: 'años' }, { t: 'number', k: 'meses', l: 'Meses', w: 3, suf: 'meses' },
      { t: 'tel', k: 'pac_tel', l: 'Teléfono', w: 3 }, { t: 'text', k: 'ocupacion', l: 'Cargo / Ocupación', w: 3, ph: 'Puesto u ocupación' },
      { t: 'text', k: 'domicilio', l: 'Domicilio', w: 4 }, { t: 'text', k: 'pac_colonia', l: 'Colonia / Población', w: 4 }, { t: 'text', k: 'pac_municipio', l: 'Municipio', w: 4 },
      { t: 'sw', k: 'detenido', l: 'Detenido', w: 4 }, { t: 'sw', k: 'victima', l: 'Víctima', w: 4 }, { t: 'sw', k: 'gmm', l: 'Gastos médicos mayores', w: 4 },
      { t: 'sub', l: '🪪 Derechohabiente a' },
      { t: 'one', k: 'derechohab', op: ['IMSS', 'ISSSTE', 'IMSS-Bienestar', 'Pemex', 'Sedena', 'Marina', 'Seguro privado', 'Ninguno'], otros: true },
      { t: 'text', k: 'contacto', l: 'Contacto de emergencia', w: 6 }, { t: 'tel', k: 'contacto_tel', l: 'Teléfono del contacto', w: 6 }
    ]
  },
  {
    id: 'tcp', n: 'Trauma · Clínica · Parto', titulo: 'Trauma · Clínica · Parto', sub: 'Mecanismo de lesión, padecimiento actual y atención del parto / recién nacido', ico: '🩺',
    clave: ['agente|padecimiento|nac_estado'], campos: [
      { t: 'x', fn: 'tcpTabs' },
      { t: 'sub', l: '💥 Agente causal', when: f => tcpTab(f) === 'Trauma' },
      { t: 'multi', k: 'agente', when: f => tcpTab(f) === 'Trauma', op: [['Arma', 'Arma', 'ag-arma', '🔫'], ['Juguete', 'Juguete', 'ag-juguete', '🧸'], ['Automóvil', 'Automóvil', 'ag-automovil', '🚗'], ['Bicicleta', 'Bicicleta', 'ag-bicicleta', '🚲'], ['Motocicleta', 'Motocicleta', 'ag-motocicleta', '🏍️'], ['Atropellamiento', 'Atropellamiento', 'ag-atropellamiento', '🚶'], ['Caída', 'Caída', 'ag-caida', '🪜'], ['Maquinaria', 'Maquinaria', 'ag-maquinaria', '⚙️'], ['Herramienta', 'Herramienta', 'ag-herramienta', '🔧'], ['Fuego', 'Fuego', 'ag-fuego', '🔥'], ['Sustancia caliente', 'Sustancia caliente', 'ag-sust-caliente', '♨️'], ['Sustancia tóxica', 'Sustancia tóxica', 'ag-sust-toxica', '☠️'], ['Electricidad', 'Electricidad', 'ag-electricidad', '⚡'], ['Explosión', 'Explosión', 'ag-explosion', '💥'], ['Ser humano', 'Agresión (ser humano)', 'ag-humano', '🧍'], ['Animal', 'Animal', 'ag-animal', '🐍'], ['Ahogamiento', 'Ahogamiento', 'ag-ahogamiento', '🌊'], ['Producto biológico', 'Producto biológico', 'ag-biologico', '🧪']], otros: true },
      { t: 'multi', k: 'proteccion', l: 'Equipo de protección', when: f => tcpTab(f) === 'Trauma', op: ['Cinturón', 'Casco', 'Bolsa de aire', 'Sillita infantil', 'Ninguno'] },
      { t: 'number', k: 'altura', l: 'Altura de la caída', w: 4, suf: 'm', when: f => tcpTab(f) === 'Trauma' }, { t: 'text', k: 'cinematica', l: 'Cinemática / mecanismo', w: 8, ph: 'Describa cómo ocurrió', when: f => tcpTab(f) === 'Trauma' },
      { t: 'sub', l: '🫀 Clínica (enfermedad)', when: f => tcpTab(f) === 'Clínica' },
      { t: 'multi', k: 'aparato', l: 'Aparato o sistema', when: f => tcpTab(f) === 'Clínica', op: ['Cardiovascular', 'Respiratorio', 'Neurológico', 'Digestivo', 'Genitourinario', 'Endocrino / Metabólico', 'Músculo-esquelético', 'Psiquiátrico', 'Infeccioso', 'Toxicológico'], otros: true },
      { t: 'multi', k: 'sintomas', l: 'Síntomas principales', when: f => tcpTab(f) === 'Clínica', op: ['Dolor torácico', 'Disnea', 'Convulsiones', 'Síncope', 'Cefalea', 'Vómito', 'Fiebre', 'Dolor abdominal', 'Palpitaciones', 'Mareo', 'Hemorragia', 'Alteración del estado de alerta'] },
      { t: 'area', k: 'padecimiento', l: 'Padecimiento actual', ph: 'Inicio, evolución y características', when: f => tcpTab(f) !== 'Parto' },
      { t: 'sub', l: '🤰 Datos obstétricos', when: f => tcpTab(f) === 'Parto' },
      { t: 'number', k: 'gestas', l: 'Gestas', w: 2, when: f => tcpTab(f) === 'Parto' }, { t: 'number', k: 'partos', l: 'Partos', w: 2, when: f => tcpTab(f) === 'Parto' }, { t: 'number', k: 'cesareas', l: 'Cesáreas', w: 2, when: f => tcpTab(f) === 'Parto' }, { t: 'number', k: 'abortos', l: 'Abortos', w: 2, when: f => tcpTab(f) === 'Parto' },
      { t: 'date', k: 'fum', l: 'FUM', w: 2, when: f => tcpTab(f) === 'Parto' }, { t: 'number', k: 'semanas', l: 'Semanas de gestación', w: 2, when: f => tcpTab(f) === 'Parto' },
      { t: 'text', k: 'contracciones', l: 'Contracciones (frecuencia / duración)', w: 6, when: f => tcpTab(f) === 'Parto' }, { t: 'one', k: 'ruptura', l: 'Ruptura de membranas', w: 6, op: ['Sí', 'No'], when: f => tcpTab(f) === 'Parto' },
      { t: 'one', k: 'sangrado', l: 'Sangrado vaginal', w: 6, op: ['Ausente', 'Escaso', 'Moderado', 'Abundante'], when: f => tcpTab(f) === 'Parto' }, { t: 'one', k: 'placenta', l: 'Placenta', w: 6, op: ['No expulsada', 'Expulsada completa', 'Expulsada incompleta'], when: f => tcpTab(f) === 'Parto' },
      { t: 'sub', l: '👶 Recién nacido', when: f => tcpTab(f) === 'Parto' },
      { t: 'one', k: 'nac_estado', l: 'Producto', w: 4, op: [['Vivo', '🟢 Vivo'], ['Muerto', '⚫ Muerto']], when: f => tcpTab(f) === 'Parto' },
      { t: 'one', k: 'rn_sexo', l: 'Sexo', w: 4, op: ['Masculino', 'Femenino'], when: f => tcpTab(f) === 'Parto' },
      { t: 'time', k: 'nacimiento_h', l: 'Hora de nacimiento', w: 4, ahora: true, when: f => tcpTab(f) === 'Parto' },
      { t: 'number', k: 'rn_peso', l: 'Peso estimado', w: 4, suf: 'g', when: f => tcpTab(f) === 'Parto' },
      { t: 'sub', l: '📊 Apgar', s: 'Elija el puntaje de cada fila en cada minuto', when: f => tcpTab(f) === 'Parto' },
      { t: 'x', fn: 'apgar', when: f => tcpTab(f) === 'Parto' },
      { t: 'sub', l: '🫁 Silverman-Anderson', s: 'Dificultad respiratoria del recién nacido', when: f => tcpTab(f) === 'Parto' },
      { t: 'x', fn: 'silverman', when: f => tcpTab(f) === 'Parto' }
    ]
  },
  {
    id: 'prim', n: 'Ev. primaria', titulo: 'Evaluación primaria', sub: 'Conciencia, vía aérea, respiración y circulación (ABCDE)', ico: '🫁',
    clave: ['avdi', 'via_aerea', 'respiracion', 'pulso'], campos: [
      { t: 'one', k: 'avdi', l: 'Nivel de conciencia (AVDI)', op: [['Alerta', 'Alerta'], ['Verbal', 'Responde a la voz'], ['Dolor', 'Responde al dolor'], ['Inconsciente', 'Inconsciente']] },
      { t: 'one', k: 'via_aerea', l: 'A · Vía aérea', op: ['Permeable', 'Comprometida', 'Obstruida'] },
      { t: 'one', k: 'respiracion', l: 'B · Ventilación', op: ['Normal', 'Rápida', 'Superficial', 'Bradipnea', 'Apnea'] },
      { t: 'multi', k: 'ruidos', l: 'Ruidos respiratorios', op: ['Normales', 'Sibilancias', 'Estertores', 'Estridor', 'Disminuidos', 'Ausentes'] },
      { t: 'one', k: 'pulso', l: 'C · Pulso', op: ['Presente', 'Ausente'] },
      { t: 'one', k: 'pulso_cal', l: 'Calidad del pulso', op: ['Fuerte', 'Débil', 'Filiforme'] },
      { t: 'one', k: 'piel_color', l: 'Piel · coloración', op: ['Normal', 'Pálida', 'Cianótica', 'Rubicunda', 'Ictérica'] },
      { t: 'one', k: 'piel_temp', l: 'Piel · temperatura', op: ['Normal', 'Caliente', 'Fría'] },
      { t: 'one', k: 'llenado', l: 'Llenado capilar', op: ['< 2 segundos', '> 2 segundos'] },
      { t: 'sw', k: 'diaforesis', l: 'Diaforesis', w: 4 }, { t: 'sw', k: 'hemorragia_mayor', l: 'Hemorragia externa mayor', w: 4 }, { t: 'sw', k: 'cianosis', l: 'Cianosis', w: 4 }
    ]
  },
  {
    id: 'sec', n: 'Ev. secundaria', titulo: 'Evaluación secundaria', sub: 'Lesiones, pupilas, signos vitales, SAMPLE y prioridad', ico: '🧍',
    clave: ['tomas', 'prioridad'], campos: [
      { t: 'sub', l: '🧍 Zonas de lesión', s: '1. Elija el tipo de lesión · 2. Toque el cuerpo donde está · Toque una marca para quitarla' },
      { t: 'x', fn: 'cuerpo' },
      { t: 'sub', l: '👁 Pupilas' }, { t: 'x', fn: 'pupilas' },
      { t: 'sub', l: '📈 Signos vitales y monitoreo' }, { t: 'x', fn: 'signos' },
      { t: 'sub', l: '📋 Signos y síntomas (SAMPLE)' },
      { t: 'text', k: 'alergias', l: 'Alergias', w: 6, qb: 'Negadas' }, { t: 'text', k: 'medicamentos', l: 'Medicamentos que está tomando', w: 6, qb: 'Niega' },
      { t: 'text', k: 'enfermedades', l: 'Enfermedades y cirugías previas', w: 6 }, { t: 'time', k: 'ultima_comida', l: 'Hora de última comida', w: 6, ahora: true },
      { t: 'area', k: 'eventos', l: 'Eventos previos relacionados', ph: '¿Qué estaba haciendo? ¿Qué pasó antes del evento?' },
      { t: 'sub', l: '🚦 Condición y prioridad' }, { t: 'x', fn: 'condicion' }
    ]
  },
  {
    id: 'gcs', n: 'Glasgow · Trauma score', titulo: 'Glasgow · Trauma score', sub: 'Se calculan solos con lo que va marcando', ico: '🧠',
    clave: ['glasgow'], campos: [{ t: 'x', fn: 'glasgow' }]
  },
  {
    id: 'trat', n: 'Tratamiento', titulo: 'Tratamiento', sub: 'Vía aérea, ventilación, oxígeno, hemorragias, accesos y fármacos', ico: '💉',
    clave: ['trat_alguno'], campos: [
      { t: 'sub', l: '🫁 Vía aérea', s: 'Puede elegir varios' },
      { t: 'multi', k: 'tr_via', op: ['Aspiración', 'Cánula orofaríngea', 'Cánula nasofaríngea', 'Intubación orotraqueal', 'Intubación nasotraqueal', 'Combitubo', 'Mascarilla laríngea', 'Cricotiroidotomía por punción'], otros: true },
      { t: 'multi', k: 'tr_cervical', l: 'Control cervical', op: ['Manual', 'Collarín rígido', 'Collarín blando'], otros: true },
      { t: 'sub', l: '💨 Ventilación' },
      { t: 'multi', k: 'tr_vent', op: ['Balón-válvula-mascarilla', 'Válvula de demanda', 'Ventilador automático', 'Hiperventilación', 'Descompresión pleural con aguja'], otros: true },
      { t: 'sub', l: '🫧 Oxigenoterapia' },
      { t: 'one', k: 'tr_o2', op: ['Puntas nasales', 'Mascarilla simple', 'Mascarilla con reservorio', 'Mascarilla Venturi'], otros: true },
      { t: 'x', fn: 'flujo' },
      { t: 'sub', l: '🩸 Control de hemorragias' },
      { t: 'multi', k: 'tr_hemo', op: ['Presión directa', 'Presión indirecta', 'Gravedad', 'Vendaje compresivo', 'Crioterapia', 'Torniquete', 'Agentes hemostáticos'], otros: true },
      { t: 'sub', l: '💧 Vías venosas y soluciones' }, { t: 'x', fn: 'iv' },
      { t: 'sub', l: '💊 Medicamentos administrados' }, { t: 'x', fn: 'meds' },
      { t: 'sub', l: '❤️ Reanimación' },
      { t: 'multi', k: 'tr_rcp', op: ['RCP básica', 'RCP avanzada', 'Desfibrilación (DEA)', 'Cardioversión', 'Marcapasos transcutáneo'], otros: true },
      { t: 'text', k: 'rcp_detalle', l: 'Detalle de reanimación', w: 12, ph: 'Hora de inicio, ciclos, descargas (J), retorno de circulación…' },
      { t: 'sub', l: '🦴 Inmovilización y otros procedimientos' },
      { t: 'multi', k: 'tr_inmov', op: ['Férula', 'Tabla larga', 'Camilla rígida', 'Colchón de vacío', 'Chaleco de extricación', 'Inmovilizadores laterales', 'Vendaje', 'Curación', 'Cubrir quemaduras', 'Monitoreo ECG', 'Glucometría', 'Nebulización', 'Atención de parto'], otros: true }
    ]
  },
  {
    id: 'tras', n: 'Traslado y entrega', titulo: 'Traslado y entrega', sub: 'Destino del paciente, firmas y entrega en el hospital', ico: '🏥',
    clave: ['derivacion'], campos: [
      { t: 'sub', l: '🛏️ Derivación del paciente' },
      { t: 'one', k: 'derivacion', op: [['hospital', 'Traslado a hospital'], ['hogar', 'Se queda en su hogar'], ['alta', 'Alta en el sitio'], ['negativa', 'Negativa de traslado']] },
      { t: 'x', fn: 'hospital' },
      { t: 'sub', l: '👤 Datos de traslado' },
      { t: 'text', k: 'tr_paciente', l: 'Nombre del/la paciente', w: 6 }, { t: 'text', k: 'tr_acomp', l: 'Nombre del acompañante', w: 6 },
      { t: 'text', k: 'tr_parentesco', l: 'Parentesco / cargo', w: 6 }, { t: 'tel', k: 'tr_tel', l: 'Teléfono', w: 6 },
      { t: 'x', fn: 'firmas1' },
      { t: 'sub', l: '🏥 Entrega en el hospital' },
      { t: 'text', k: 'entrega_nombre', l: 'Entrega paciente (nombre)', w: 6 }, { t: 'text', k: 'recibe_medico', l: 'Médico que recibe (nombre)', w: 6 },
      { t: 'time', k: 'entrega_hora', l: 'Hora de entrega', w: 4, ahora: true },
      { t: 'x', fn: 'firmas2' }
    ]
  },
  {
    id: 'leg', n: 'Datos legales', titulo: 'Datos legales', sub: 'Posición en que se encontró, pertenencias y autoridades', ico: '⚖️',
    clave: [], campos: [
      { t: 'area', k: 'posicion', l: 'Posición y orientación en que se encontró al paciente', ph: 'Dónde y cómo se encontró' },
      { t: 'multi', k: 'autoridades', l: 'Autoridades presentes', op: ['Policía municipal', 'Tránsito', 'Bomberos', 'Ministerio Público', 'Guardia Nacional'], otros: true },
      { t: 'text', k: 'aut_folio', l: 'Folio / oficio de la autoridad', w: 12 },
      { t: 'sub', l: '🎒 Pertenencias' },
      { t: 'area', k: 'pertenencias', l: 'Pertenencias', ph: 'Lista de pertenencias que se entregan' },
      { t: 'text', k: 'recibe_pert', l: 'Recibe pertenencias (nombre)', w: 4 }, { t: 'text', k: 'recibe_pert_cargo', l: 'Cargo', w: 4 }, { t: 'text', k: 'seguro_auto', l: 'Compañía de seguro del automóvil', w: 4 },
      { t: 'x', fn: 'firmaPert' }
    ]
  }
];

/* ---------- estado inicial y cálculos ---------- */
function nuevoForm() {
  const u = S.unidad || unidadVacia();
  const f = { fecha: hoy(), ambulancia: u.unidad || '', base: u.base || '', operador: u.operador || '', prestadores: u.tamp || '', municipio: 'Ixhuatlán del Café, Veracruz', tomas: [{ hora: horaAhora() }], lesiones: [], meds: [], iv_n: 0, tr_o2_flujo: 10, entrega_nombre: '' };
  return f;
}
const edadAnios = f => { const a = parseFloat(f.edad), m = parseFloat(f.meses); if (!isNaN(a)) return a + (isNaN(m) ? 0 : m / 12); if (!isNaN(m)) return m / 12; return null; };
function rangoVit(k, f) {
  const e = edadAnios(f);
  const ped = e != null && e < 1 ? 'l' : e != null && e < 12 ? 'n' : 'a';
  const R = {
    fr: { a: [12, 20], n: [18, 30], l: [30, 60] }, fc: { a: [60, 100], n: [70, 120], l: [100, 160] },
    tas: { a: [90, 140], n: [80, 120], l: [70, 100] }, tad: { a: [60, 90], n: [50, 80], l: [40, 65] },
    sao2: { a: [95, 100], n: [95, 100], l: [95, 100] }, temp: { a: [36, 37.5], n: [36, 37.5], l: [36.5, 37.5] }, gluc: { a: [70, 140], n: [70, 140], l: [60, 140] }
  };
  return R[k]?.[ped];
}
function alertaVit(k, v, f) {
  const x = parseFloat(String(v).replace(',', '.')); if (isNaN(x) || v === '') return '';
  const r = rangoVit(k, f); if (!r) return '';
  return x > r[1] ? 'hi' : x < r[0] ? 'lo' : '';
}
const glasgowTot = f => (f.gl_o && f.gl_v && f.gl_m) ? f.gl_o + f.gl_v + f.gl_m : null;
const glClase = g => g == null ? '' : g >= 13 ? ['Leve (13-15)', 'ok'] : g >= 9 ? ['Moderado (9-12)', 'mid'] : ['Grave (3-8)', 'bad'];
const codG = g => g == null ? null : g >= 13 ? 4 : g >= 9 ? 3 : g >= 6 ? 2 : g >= 4 ? 1 : 0;
const codS = s => s == null || isNaN(s) ? null : s > 89 ? 4 : s >= 76 ? 3 : s >= 50 ? 2 : s >= 1 ? 1 : 0;
const codR = r => r == null || isNaN(r) ? null : r > 29 ? 3 : r >= 10 ? 4 : r >= 6 ? 2 : r >= 1 ? 1 : 0;
function rts(f) {
  const t = (f.tomas || [])[0] || {};
  const num = v => { const x = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(x) ? null : x; };
  const g = f.rts_g ?? codG(glasgowTot(f)), s = f.rts_s ?? codS(num(t.tas)), r = f.rts_r ?? codR(num(t.fr));
  const total = (g != null && s != null && r != null) ? g + s + r : null;
  return { g, s, r, total };
}
const rtsTxt = t => t == null ? ['Sin calcular', ''] : t === 12 ? ['Pronóstico favorable', 'ok'] : t >= 10 ? ['Riesgo moderado', 'mid'] : ['Riesgo alto · valorar centro de trauma', 'bad'];

const CLAVES_TXT = { fecha: 'Fecha del servicio', t_llamada: 'Hora de llamada', t_llegada: 'Hora de llegada', motivo: 'Motivo de la atención', pac_nombre: 'Nombre del paciente', sexo: 'Sexo', edad: 'Edad', tomas: 'Signos vitales (toma 1)', glasgow: 'Escala de Glasgow', prioridad: 'Prioridad (triage)', derivacion: 'Derivación del paciente' };
function llenoClave(f, k) {
  if (k.includes('|')) return k.split('|').some(x => llenoClave(f, x));
  if (k === 'tomas') { const t = (f.tomas || [])[0] || {}; return !!(t.fr || t.fc || t.tas); }
  if (k === 'glasgow') return glasgowTot(f) != null;
  if (k === 'trat_alguno') return ['tr_via', 'tr_cervical', 'tr_vent', 'tr_hemo', 'tr_rcp', 'tr_inmov'].some(x => (f[x] || []).length) || !!f.tr_o2 || (f.meds || []).length > 0 || f.iv_n > 0;
  const v = f[k]; return Array.isArray(v) ? v.length > 0 : v != null && v !== '' && v !== false;
}
function resumenFRAP(f) {
  const faltan = Object.keys(CLAVES_TXT).filter(k => !llenoClave(f, k)).map(k => CLAVES_TXT[k]);
  const respuesta = difMin(f.t_llamada, f.t_llegada), sitio = difMin(f.t_llegada, f.t_traslado), revisar = [];
  const g = glasgowTot(f), t = (f.tomas || [])[0] || {};
  if (faltan.length) revisar.push(`Faltan ${faltan.length} dato${faltan.length === 1 ? '' : 's'} clave`);
  if (f.derivacion === 'negativa' && !f.firma_pac) revisar.push('Negativa de traslado sin firma del paciente');
  if (f.derivacion === 'hospital' && !f.hospital) revisar.push('Traslado sin hospital de destino');
  if (f.derivacion === 'hospital' && !f.firma_medico) revisar.push('Entrega sin firma del médico que recibe');
  if ((f.prioridad === 'rojo' || (g != null && g < 9)) && f.derivacion && f.derivacion !== 'hospital') revisar.push('Prioridad crítica sin traslado a hospital');
  if (respuesta != null && respuesta > 30) revisar.push('Tiempo de respuesta mayor a 30 min');
  const sao = parseFloat(String(t.sao2 || '').replace(',', '.')); if (!isNaN(sao) && sao < 90 && !f.tr_o2) revisar.push('SaO₂ baja sin oxigenoterapia registrada');
  return { respuesta, sitio, faltan, revisar };
}
function tcpTab(f) { if (f._tcp) return f._tcp; return f.motivo === 'Traumatismo' ? 'Trauma' : f.motivo === 'Ginecoobstétrico' ? 'Parto' : 'Clínica'; }
const APGAR_F = [['fc', 'Frecuencia cardiaca', ['Ausente', 'Menor de 100', 'Mayor de 100']], ['re', 'Esfuerzo respiratorio', ['Ausente', 'Débil, irregular', 'Llanto fuerte']], ['to', 'Tono muscular', ['Flacidez total', 'Cierta flexión de extremidades', 'Movimientos activos']], ['ir', 'Irritabilidad refleja', ['Sin respuesta', 'Mueca o llanto débil', 'Llanto']], ['co', 'Color', ['Cianosis o palidez', 'Cuerpo rosado, extremidades cianóticas', 'Completamente rosado']]];
const SILV_F = [['mt', 'Movimientos tóraco-abdominales', ['Rítmicos y regulares', 'Tórax inmóvil, abdomen en movimiento', 'Disociación tóraco-abdominal']], ['ti', 'Tiraje intercostal', ['No', 'Leve', 'Intenso y constante']], ['rx', 'Retracción xifoidea', ['No', 'Leve', 'Intensa']], ['an', 'Aleteo nasal', ['No', 'Leve', 'Intenso']], ['qe', 'Quejido espiratorio', ['No', 'Audible con estetoscopio', 'Audible sin estetoscopio']]];
function totalEsc(obj, def) { const o = obj || {}; return def.every(d => o[d[0]] != null) ? def.reduce((a, d) => a + o[d[0]], 0) : null; }
const apgarTot = (f, m) => totalEsc((f.apgar || {})[m], APGAR_F);
const silvTot = (f, m) => totalEsc((f.silv || {})[m], SILV_F);
const apgarTxt = t => t == null ? null : t >= 7 ? ['Normal', 'ok'] : t >= 4 ? ['Depresión moderada', 'mid'] : ['Depresión grave', 'bad'];
const silvTxt = t => t == null ? null : t === 0 ? ['Sin dificultad', 'ok'] : t <= 3 ? ['Dificultad leve', 'ok'] : t <= 6 ? ['Dificultad moderada', 'mid'] : ['Dificultad grave', 'bad'];
function progresoSec(s, f) {
  const cl = s.clave || []; if (!cl.length) return null;
  const ok = cl.filter(k => llenoClave(f, k)).length; return ok / cl.length;
}

/* ---------- render de campos genéricos ---------- */
const imgIc = (arch, emoji) => `<img class="ic" src="imagenes/iconos/${arch}.png" alt="" loading="lazy" onerror="this.replaceWith(document.createTextNode('${emoji || ''}'))">`;
const opIc = o => Array.isArray(o) && o[2] ? imgIc(o[2], o[3]) : '';
const opV = o => Array.isArray(o) ? o[0] : o;
const opL = o => Array.isArray(o) ? o[1] : o;
function tilesOne(c, f) {
  const v = f[c.k]; const ops = c.op.map(o => `<button type="button" class="tile ${v === opV(o) ? 'on' : ''}" data-one="${c.k}" data-v="${esc(opV(o))}">${esc(opL(o))}</button>`);
  if (c.otros) ops.push(`<button type="button" class="tile otros ${v === '__otros' ? 'on' : ''}" data-one="${c.k}" data-v="__otros">+ Otros</button>`);
  return `<div class="tiles">${ops.join('')}</div>` + (c.otros && v === '__otros' ? `<input class="otro-in" data-k="${c.k}_x" placeholder="Especifique" value="${esc(f[c.k + '_x'])}">` : '');
}
function tilesMulti(c, f) {
  const v = f[c.k] || []; const ops = c.op.map(o => `<button type="button" class="tile chk ${v.includes(opV(o)) ? 'on' : ''}" data-multi="${c.k}" data-v="${esc(opV(o))}"><i></i>${opIc(o)}${esc(opL(o))}</button>`);
  if (c.otros) ops.push(`<button type="button" class="tile otros ${v.includes('__otros') ? 'on' : ''}" data-multi="${c.k}" data-v="__otros">+ Otros</button>`);
  return `<div class="tiles">${ops.join('')}</div>` + (c.otros && v.includes('__otros') ? `<input class="otro-in" data-k="${c.k}_x" placeholder="Especifique" value="${esc(f[c.k + '_x'])}">` : '');
}
function campo(c, f) {
  const w = 'c' + (c.w || 12);
  switch (c.t) {
    case 'sub': return `<h4 class="sub c12">${c.l}${c.s ? `<small>${esc(c.s)}</small>` : ''}</h4>`;
    case 'x': return `<div class="c12 x-${c.fn}">${CUSTOM[c.fn](f)}</div>`;
    case 'area': return `<label class="fld ${w}"><span>${c.l || ''}</span><textarea data-k="${c.k}" rows="3" placeholder="${esc(c.ph || '')}">${esc(f[c.k])}</textarea></label>`;
    case 'sw': return `<div class="${w}"><button type="button" class="sw ${f[c.k] ? 'on' : ''}" data-sw="${c.k}"><i></i>${c.l}</button></div>`;
    case 'one': return `<div class="fld ${w}">${c.l ? `<span>${c.l}</span>` : ''}${tilesOne(c, f)}</div>`;
    case 'multi': return `<div class="fld ${w}">${c.l ? `<span>${c.l}</span>` : ''}${tilesMulti(c, f)}</div>`;
    default: {
      const extra = c.fn === 'dia' ? `<small class="dia">${diaSemana(f[c.k])}</small>` : '';
      const qb = c.qb ? `<button type="button" class="mini" data-qb="${c.k}|${esc(c.qb)}">${esc(c.qb)}</button>` : '';
      const ah = c.ahora ? `<button type="button" class="mini" data-ahora="${c.k}">⟲ Ahora</button>` : '';
      return `<label class="fld ${w}"><span>${c.l}</span><div class="in"><input type="${c.t}" data-k="${c.k}" value="${esc(f[c.k])}" placeholder="${esc(c.ph || '')}" ${c.t === 'number' ? 'inputmode="decimal" step="any"' : ''}>${c.suf ? `<em>${c.suf}</em>` : ''}${qb}${ah}</div>${extra}</label>`;
    }
  }
}
/* ícono de la sección: imagen generada con IA (imagenes/iconos/sec-*.png); si falta, el emoji */
const iconoSec = s => `<img src="imagenes/iconos/sec-${s.id}.png" alt="" loading="lazy" onerror="this.replaceWith(document.createTextNode('${s.ico}'))">`;
function nroDe(s) { const cl = s.clave || []; if (!cl.length) return null; return [cl.filter(k => llenoClave(F, k)).length, cl.length]; }
function nroTxt(s, i) { const n = nroDe(s); return n ? `${n[0]} de ${n[1]}` : 'Opcional'; }
function nroClase(s) { const n = nroDe(s); return n && n[0] === n[1] ? 'full' : ''; }
function progresoTotal() { const l = SECCIONES.map(nroDe).filter(Boolean); const a = l.reduce((x, n) => x + n[0], 0), b = l.reduce((x, n) => x + n[1], 0); return b ? a / b : 0; }
function htmlSeccion(s, i) {
  const camp = s.campos.filter(c => !c.when || c.when(F)).map(c => campo(c, F)).join('');
  const obs = `<label class="fld c12 obs"><span>✎ Otros / Observaciones</span><textarea data-k="obs_${s.id}" rows="2" placeholder="Anote aquí lo que haga falta de «${esc(s.n)}» y no esté en las opciones">${esc(F['obs_' + s.id])}</textarea></label>`;
  return `<section class="sec" id="sec-${s.id}" data-sec="${s.id}"><header><span class="sico">${iconoSec(s)}</span><div><h3>${s.titulo}</h3><p>${s.sub}</p></div><span class="nro ${nroClase(s)}" data-nro="${s.id}">${nroTxt(s, i)}</span></header><div class="grid">${camp}${obs}</div></section>`;
}
function htmlTabs() {
  return SECCIONES.map((s, i) => {
    const p = progresoSec(s, F);
    return `<button type="button" data-go="${s.id}" class="${s.id === ACTIVA ? 'on' : ''}"><b>${p2(i + 1)}</b> ${s.n}<i style="--p:${p == null ? 0 : Math.round(p * 100)}%"></i></button>`;
  }).join('');
}
function repintar(id) {
  const s = SECCIONES.find(x => x.id === id); if (!s) return;
  const el = $('#sec-' + id); if (!el) return;
  el.querySelector('.grid').innerHTML = s.campos.filter(c => !c.when || c.when(F)).map(c => campo(c, F)).join('') + `<label class="fld c12 obs"><span>✎ Otros / Observaciones</span><textarea data-k="obs_${s.id}" rows="2" placeholder="Anote aquí lo que haga falta de «${esc(s.n)}» y no esté en las opciones">${esc(F['obs_' + s.id])}</textarea></label>`;
  pintarProgreso();
}
function pintarProgreso() {
  const t = $('#tabs'); if (t) t.innerHTML = htmlTabs();
  SECCIONES.forEach((s, i) => { const e = $(`[data-nro="${s.id}"]`); if (e) { e.textContent = nroTxt(s, i); e.classList.toggle('full', nroClase(s) === 'full'); } });
  const fl = $('#flot'); if (fl) { const p = Math.round(progresoTotal() * 100); fl.style.setProperty('--p', p + '%'); $('b', fl).textContent = p + '%'; fl.classList.toggle('sucio', !!SUCIO); fl.hidden = !puedeEditar(); }
  const g = $('#gcs-out'); if (g) g.innerHTML = htmlGlasgowResumen();
}
function pintarFormulario() {
  setTimeout(pintarProgreso, 0);
  const root = $('#form'); if (!root) return;
  root.innerHTML = `<nav class="tabs" id="tabs">${htmlTabs()}</nav>` + SECCIONES.map(htmlSeccion).join('') + htmlBarra();
  aplicarSoloLectura();
}
function puedeEditar() {
  if (!REC || !REC.guardado) return can('crear');
  return REC.creado_por === S.user.id ? can('corregir_propios') : can('corregir_otros');
}
function aplicarSoloLectura() {
  const root = $('#form'); if (!root) return;
  const ro = !puedeEditar();
  root.classList.toggle('ro', ro);
  $$('.sec', root).forEach(e => { e.inert = ro; });
}
function htmlBarra() {
  const ed = puedeEditar();
  return `<div class="barra">
    <div class="borr" id="borr">${esc(_txtBorr)}</div>
    ${ed ? `<button type="button" class="btn rojo" data-act="guardar">💾 GUARDAR SESIÓN</button><button type="button" class="btn verde" data-act="cerrar">✔ CERRAR FRAP</button>` : `<div class="aviso">Solo lectura: no tienes permiso para corregir este FRAP.</div>`}
    ${can('pdf') ? `<button type="button" class="btn azul" data-act="pdf">📄 GENERAR FRAP PDF</button>` : ''}
    ${can('compartir') ? `<button type="button" class="btn azul2" data-act="compartir">📤 COMPARTIR</button>` : ''}
    <button type="button" class="btn gris" data-act="nuevo">🆕 NUEVO</button>
    <div class="autor">${REC?.autor ? '👤 ' + esc(REC.autor) : ''}</div></div>`;
}

/* ---------- bloques especiales ---------- */
function htmlTiempos(f) {
  const seg = [['Despacho', 't_llamada', 't_salida'], ['Trayecto', 't_salida', 't_llegada'], ['En el sitio', 't_llegada', 't_traslado'], ['Traslado', 't_traslado', 't_hospital'], ['Regreso', 't_hospital', 't_base']];
  let ult = -1; T_MOMENTOS.forEach(([k], i) => { if (f[k]) ult = i; });
  const pct = ult < 0 ? 0 : Math.round(ult / (T_MOMENTOS.length - 1) * 100);
  const resp = difMin(f.t_llamada, f.t_llegada), sit = difMin(f.t_llegada, f.t_traslado);
  const hitos = T_MOMENTOS.map(([k, l], i) => `<span class="hito ${i % 2 ? 'b' : 'r'} ${f[k] ? 'on' : ''}" style="left:${i / (T_MOMENTOS.length - 1) * 100}%"><i></i></span>`).join('');
  return `<div class="ruta ${ult >= 0 && ult < T_MOMENTOS.length - 1 ? 'enruta' : ''}"><div class="camino"><i class="rec" style="width:${pct}%"></i>${hitos}<span class="amb" style="left:${pct}%">${AMB_SVG}</span></div>
    <div class="segs">${seg.map(([l, a, b]) => { const d = difMin(f[a], f[b]); return `<div class="seg ${d != null ? 'on' : ''}"><small>${l.toUpperCase()}</small><b>${d != null ? d + ' min' : '—'}</b></div>`; }).join('')}</div>
    <div class="chips-t">${resp != null ? `<span class="chip rj">⏱ Respuesta ${resp} min</span>` : ''}${sit != null ? `<span class="chip az">👤 En el sitio ${sit} min</span>` : ''}</div></div>`;
}
function htmlGlasgowResumen() {
  const g = glasgowTot(F), cl = glClase(g), r = rts(F), rt = rtsTxt(r.total);
  return `<div class="rd azul"><b>${g ?? '—'}</b><small>de 15</small><em>GLASGOW</em>${cl ? `<span class="pill ${cl[1]}">${cl[0]}</span>` : ''}</div><div class="rd azul"><b>${r.total ?? '—'}</b><small>de 12</small><em>TRAUMA SCORE</em>${r.total != null ? `<span class="pill ${rt[1]}">${rt[0]}</span>` : ''}</div>`;
}
function firmaBox(k, titulo) {
  return `<div class="firma-c"><button type="button" class="firma ${F[k] ? 'hay' : ''}" data-firma="${k}" data-tit="${esc(titulo)}">${F[k] ? `<img src="${F[k]}" alt="firma">` : '<span>✍ Toque para firmar</span>'}</button><small>${esc(titulo)}</small>${F[k] ? `<button type="button" class="mini x" data-firma-del="${k}">Quitar</button>` : ''}</div>`;
}
const CUSTOM = {
  tcpTabs: f => { const t = tcpTab(f); const tiene = { Trauma: (f.agente || []).length || f.cinematica, 'Clínica': (f.aparato || []).length || (f.sintomas || []).length || f.padecimiento, Parto: f.nac_estado || f.gestas || f.semanas }; return `<div class="subtabs">${[['Trauma', '🚑'], ['Clínica', '🫀'], ['Parto', '🤰']].map(([n, i]) => `<button type="button" data-tcp="${n}" class="${t === n ? 'on' : ''}">${i} ${n}${tiene[n] ? '<em></em>' : ''}</button>`).join('')}</div>`; },
  apgar: f => { const M = ['1', '5', '10']; return `<div class="esc"><div class="esc-h"><span></span>${M.map(m => `<b>${m} min</b>`).join('')}</div>${APGAR_F.map(([k, l, d]) => `<div class="esc-r"><span>${l}</span>${M.map(m => `<div class="esc-b">${[0, 1, 2].map(v => `<button type="button" class="${((f.apgar || {})[m] || {})[k] === v ? 'on' : ''}" data-ap="${m}|${k}|${v}" title="${esc(d[v])}">${v}</button>`).join('')}</div>`).join('')}<small>${d.map((x, v) => `${v} ${x}`).join(' · ')}</small></div>`).join('')}<div class="esc-t"><span>TOTAL</span>${M.map(m => { const t = apgarTot(f, m), c = apgarTxt(t); return `<div><b>${t ?? '—'}</b>${c ? `<em class="pill ${c[1]}">${c[0]}</em>` : ''}</div>`; }).join('')}</div></div>`; },
  silverman: f => { const M = ['1', '2']; return `<div class="esc s2"><div class="esc-h"><span></span>${M.map(m => `<b>Valoración ${m}</b>`).join('')}</div>${SILV_F.map(([k, l, d]) => `<div class="esc-r"><span>${l}</span>${M.map(m => `<div class="esc-b">${[0, 1, 2].map(v => `<button type="button" class="${((f.silv || {})[m] || {})[k] === v ? 'on' : ''}" data-sv="${m}|${k}|${v}" title="${esc(d[v])}">${v}</button>`).join('')}</div>`).join('')}<small>${d.map((x, v) => `${v} ${x}`).join(' · ')}</small></div>`).join('')}<div class="esc-t"><span>TOTAL</span>${M.map(m => { const t = silvTot(f, m), c = silvTxt(t); return `<div><b>${t ?? '—'}</b>${c ? `<em class="pill ${c[1]}">${c[0]}</em>` : ''}</div>`; }).join('')}</div></div>`; },
  folio: f => `<div class="folio"><small>FOLIO</small><b>${REC?.folio ? esc(REC.folio) : 'Se numera solo'}</b><em>${REC?.guardado ? 'Corrigiendo un FRAP guardado' : 'FRAP nuevo'}</em></div>`,
  cronologia: f => `<div class="crono">${T_MOMENTOS.map(([k, l, i, c]) => `<div class="reloj ${c}"><div class="rl"><span>${i} ${l}</span>${f[k] ? `<button type="button" data-clr="${k}" title="Borrar">✕</button>` : ''}</div><div class="dig"><input type="time" data-k="${k}" value="${esc(f[k])}"></div><button type="button" class="mini" data-ahora="${k}">⟲ Ahora</button></div>`).join('')}</div><div id="tl">${htmlTiempos(f)}</div>`,
  gps: f => {
    const tiene = f.lat && f.lon;
    if (GPS_BUSCANDO) return `<div class="gps-sat"><div class="sat"><i></i><i></i><i></i><span>🛰️</span></div><div><b>LLAMANDO AL SATÉLITE…</b><small>Buscando señal GPS. Si tarda, salga a un lugar abierto.</small></div></div>`;
    if (!tiene) return `<button type="button" class="gps-b" data-act="gps"><span>◎</span><div><b>Tomar la ubicación del servicio</b><small>Usa el GPS del aparato: pone las coordenadas y llena la dirección sola</small></div><i>›</i></button>`;
    const la = parseFloat(f.lat), lo = parseFloat(f.lon);
    const mapa = navigator.onLine ? `<iframe loading="lazy" title="mapa" src="https://www.openstreetmap.org/export/embed.html?bbox=${lo - 0.004}%2C${la - 0.002}%2C${lo + 0.004}%2C${la + 0.002}&layer=mapnik&marker=${la}%2C${lo}"></iframe>` : `<div class="sinmapa">Mapa no disponible sin internet</div>`;
    return `<div class="gps-p"><div class="gps-d"><div class="gps-h">📡 COORDENADAS DEL SERVICIO <em>± ${f.gps_prec ?? '?'} m</em></div><div class="gps-c"><div><small>LATITUD</small><b>${f.lat}</b></div><div><small>LONGITUD</small><b>${f.lon}</b></div></div><p>Tomada a las ${esc(f.gps_hora || '')}${(f.gps_prec || 0) > 50 ? ' · precisión baja: intente al aire libre' : ''}</p>
      <div class="gps-bt"><button type="button" class="btn rojo ch" data-act="gpsShare">Compartir ficha de ubicación</button><button type="button" class="btn gris ch" data-act="gpsCopy">Copiar</button><button type="button" class="btn gris ch" data-act="gpsMapa">Abrir mapa</button><button type="button" class="btn gris ch" data-act="gps">Actualizar</button><button type="button" class="btn gris ch" data-act="gpsDel">Quitar</button></div></div><div class="gps-m">${mapa}</div></div>`;
  },
  tomarUnidad: f => `<div class="c12"><button type="button" class="mini big" data-act="tomarUnidad">⟳ Tomar de la ficha de la unidad</button></div>`,
  cuerpo: f => {
    const sel = f.les_tipo;
    const tipos = LESIONES.map(([n, ab, ic], i) => `<button type="button" class="tile les ${sel === n ? 'on' : ''}" data-les="${n}"><b>${imgIc(LES_IMG[i], ic)}</b>${n}</button>`).join('');
    return `${chipsVar(f)}<div class="tiles les-g">${tipos}</div><div class="cuerpo"><svg viewBox="0 0 880 450" id="svgCuerpo">${figuras(f)}${(f.lesiones || []).map((m, i) => { const ti = LESIONES.findIndex(l => l[0] === m.t); return `<g class="mk" data-mk="${i}" transform="translate(${m.v * 220 + m.x},${m.y})"><circle r="17" fill="#fff" fill-opacity=".95" stroke="${LES_COL[ti]}" stroke-width="3"/><image href="imagenes/iconos/${LES_IMG[ti]}.png" x="-13.5" y="-13.5" width="27" height="27"/><text y="4" text-anchor="middle" class="mk-ab">${LESIONES[ti][1]}</text></g>`; }).join('')}</svg><div class="vlabels">${VISTAS.map(v => `<span>${v.toUpperCase()}</span>`).join('')}</div></div>${chipsLesion(f)}`;
  },
  pupilas: f => {
    const ojo = (id, tit) => `<div class="ojo"><b>${tit}</b>${ojoSVG(f['pup_' + id + '_t'], f['pup_' + id + '_r'])}<div class="tiles s">${['Miosis', 'Normal', 'Midriasis'].map(o => `<button type="button" class="tile ${f['pup_' + id + '_t'] === o ? 'on' : ''}" data-one="pup_${id}_t" data-v="${o}">${o}</button>`).join('')}</div><div class="tiles s">${['Reactiva', 'Lenta', 'Arreactiva'].map(o => `<button type="button" class="tile ${f['pup_' + id + '_r'] === o ? 'on' : ''}" data-one="pup_${id}_r" data-v="${o}">${o}</button>`).join('')}</div></div>`;
    const sin = !(f.pup_od_t || f.pup_od_r || f.pup_oi_t || f.pup_oi_r);
    return `<div class="pupilas">${ojo('od', 'OJO DERECHO')}${ojo('oi', 'OJO IZQUIERDO')}<div class="pup-r"><b>VALORACIÓN PUPILAR</b>${sin ? '<h5>Sin valorar</h5><p>Marque el tamaño y la reacción a la luz de cada ojo.</p>' : `<p>OD: ${esc(f.pup_od_t || '—')} · ${esc(f.pup_od_r || '—')}</p><p>OI: ${esc(f.pup_oi_t || '—')} · ${esc(f.pup_oi_r || '—')}</p>${(f.pup_od_t && f.pup_oi_t && f.pup_od_t !== f.pup_oi_t) ? '<p class="warn">⚠ Anisocoria</p>' : ''}`}<small>Orientativo · no sustituye el criterio clínico</small></div></div>`;
  },
  signos: f => {
    const tomas = (f.tomas || []).map((t, i) => `<div class="toma"><div class="toma-h"><b>TOMA ${i + 1}</b><input type="time" data-t="${i}.hora" value="${esc(t.hora)}"><button type="button" class="mini" data-act="tomaAhora" data-i="${i}">⟲ Ahora</button>${i > 0 ? `<button type="button" class="mini x" data-act="tomaDel" data-i="${i}">✕ Quitar</button>` : ''}</div>
      <div class="vgrid">${VIT.map(([k, l, u]) => `<label class="fld v ${alertaVit(k, t[k], f)}"><span>${l}</span><div class="in"><input inputmode="decimal" data-t="${i}.${k}" value="${esc(t[k])}"><em>${u}</em></div></label>`).join('')}<label class="fld v"><span>EKG</span><div class="in"><input data-t="${i}.ekg" value="${esc(t.ekg)}" placeholder="Ritmo"></div></label></div>
      <div class="neuro"><span>Mini examen neurológico</span>${['A', 'V', 'D', 'I'].map(x => `<button type="button" class="tile s ${t.neuro === x ? 'on' : ''}" data-act="neuro" data-i="${i}" data-v="${x}">${x}</button>`).join('')}</div></div>`).join('');
    return `<div class="leyenda"><span class="hi">■ Arriba de lo normal</span><span class="lo">■ Abajo de lo normal</span></div>${tomas}<button type="button" class="btn rojo" data-act="tomaAdd">＋ AGREGAR TOMA</button>`;
  },
  condicion: f => `<div class="cond"><div><span>Condición</span><div class="tiles"><button type="button" class="tile ${f.condicion === 'Crítico' ? 'on bad' : ''}" data-one="condicion" data-v="Crítico">Crítico</button><button type="button" class="tile ${f.condicion === 'No crítico' ? 'on ok' : ''}" data-one="condicion" data-v="No crítico">No crítico</button></div><span>Estado</span><div class="tiles"><button type="button" class="tile ${f.estado === 'Inestable' ? 'on bad' : ''}" data-one="estado" data-v="Inestable">Inestable</button><button type="button" class="tile ${f.estado === 'Estable' ? 'on ok' : ''}" data-one="estado" data-v="Estable">Estable</button></div></div>
    <div><span>Prioridad (triage START)</span><div class="triage">${TRIAGE.map(([k, n, s, d]) => `<button type="button" class="tag ${k} ${f.prioridad === k ? 'on' : ''}" data-one="prioridad" data-v="${k}"><b>${n}</b><em>${s}</em><small>${d}</small></button>`).join('')}</div></div></div><div class="gcs-out" id="gcs-out">${htmlGlasgowResumen()}</div>`,
  glasgow: f => {
    const col = (tit, k, ops) => `<div class="gl-c"><h5>${tit}</h5>${ops.map(([n, t]) => `<button type="button" class="gl ${f[k] === n ? 'on' : ''}" data-gl="${k}" data-v="${n}"><b>${n}</b>${t}</button>`).join('')}</div>`;
    const r = rts(f), tbl = [[4, '13 - 15', '> 89', '10 - 29'], [3, '9 - 12', '76 - 89', '> 29'], [2, '6 - 8', '50 - 75', '6 - 9'], [1, '4 - 5', '1 - 49', '1 - 5'], [0, '3', '0', '0']];
    const cel = (p, col, txt, val) => `<td class="${val === p ? 'sel' : ''}" data-rts="${col}" data-v="${p}">${txt}</td>`;
    const g = glasgowTot(f), cl = glClase(g), rt = rtsTxt(r.total);
    return `<h4 class="sub">🧠 Escala de coma de Glasgow<small>Puntuación máxima 15 · mínima 3</small></h4><div class="gl-g">${col('APERTURA OCULAR', 'gl_o', [[4, 'Espontánea'], [3, 'A la orden verbal'], [2, 'Al estímulo doloroso'], [1, 'Ausente']])}${col('RESPUESTA VERBAL', 'gl_v', [[5, 'Orientado'], [4, 'Confuso'], [3, 'Palabras inapropiadas'], [2, 'Palabras incomprensibles'], [1, 'Ausente']])}${col('RESPUESTA MOTORA', 'gl_m', [[6, 'Obedece órdenes'], [5, 'Localiza el dolor'], [4, 'Retira al dolor'], [3, 'Flexión al dolor'], [2, 'Extensión al dolor'], [1, 'Ausente']])}</div>
      <div class="gl-tot"><b>${g ?? '—'}</b><div><small>Glasgow</small><em>${g != null ? `O${f.gl_o} V${f.gl_v} M${f.gl_m}` : 'Marque los tres componentes'}</em></div>${cl ? `<span class="pill ${cl[1]}">${cl[0]}</span>` : ''}</div>
      <h4 class="sub">📊 Trauma score revisado<small>Se calcula con el Glasgow y la primera toma de signos vitales (TAS y FR). Puede tocar una celda para corregir.</small></h4>
      <table class="rts"><thead><tr><th>PUNTAJE</th><th>GLASGOW</th><th>TA SISTÓLICA</th><th>F. RESPIRATORIA</th></tr></thead><tbody>${tbl.map(([p, a, b, c]) => `<tr><th>${p}</th>${cel(p, 'g', a, r.g)}${cel(p, 's', b, r.s)}${cel(p, 'r', c, r.r)}</tr>`).join('')}</tbody></table>
      <div class="gl-tot"><b>${r.total ?? '—'}</b><div><small>Trauma score</small><em>de 12 puntos</em></div>${r.total != null ? `<span class="pill ${rt[1]}">${rt[0]}</span>` : ''}</div>`;
  },
  flujo: f => `<div class="flujo"><span>FLUJO</span><input type="range" min="1" max="15" step="1" data-k="tr_o2_flujo" value="${f.tr_o2_flujo ?? 10}" id="rng"><b id="rngv">${f.tr_o2_flujo ?? 10} L/min</b></div>`,
  iv: f => `<div class="iv"><div class="iv-n"><small>LÍNEA IV</small><div><button type="button" data-act="ivMenos">−</button><b>${f.iv_n || 0}</b><button type="button" data-act="ivMas">＋</button></div><small>vías instaladas</small></div>
    <div class="iv-cat"><span>Catéter · calibre <em>color estándar y flujo aproximado</em></span><div class="cats">${CATETERES.map(([g, fl, c]) => `<button type="button" class="cat ${f.iv_cal === g ? 'on' : ''}" data-one="iv_cal" data-v="${g}"><i style="background:${c}"></i><b>${g}</b><small>${fl}</small></button>`).join('')}</div></div></div>
    <span class="fl">Sitio de aplicación</span><div class="tiles">${['Mano', 'Pliegue antecubital', 'Antebrazo', 'Yugular externa', 'Intraósea'].map(o => `<button type="button" class="tile ${f.iv_sitio === o ? 'on' : ''}" data-one="iv_sitio" data-v="${o}">${o}</button>`).join('')}</div>
    <span class="fl">Solución</span><div class="tiles">${['Hartmann', 'NaCl 0.9 %', 'Mixta', 'Glucosa 5 %'].map(o => `<button type="button" class="tile ${f.iv_sol === o ? 'on' : ''}" data-one="iv_sol" data-v="${o}">💧 ${o}</button>`).join('')}</div>
    <div class="iv-f"><div><span class="fl">Cantidad</span><div class="tiles">${['250', '500', '1000'].map(o => `<button type="button" class="tile ${f.iv_ml === o ? 'on' : ''}" data-one="iv_ml" data-v="${o}">${o}</button>`).join('')}<input class="otro-in ml" data-k="iv_ml_otra" placeholder="Otra (ml)" value="${esc(f.iv_ml_otra)}"></div></div><label class="fld"><span>Infusión</span><div class="in"><input data-k="iv_inf" value="${esc(f.iv_inf)}" placeholder="Ej. 60 gotas/min, a chorro"></div></label></div>`,
  meds: f => `${(f.meds || []).map((m, i) => `<div class="med"><label class="fld"><span>Hora</span><div class="in"><input type="time" data-m="${i}.hora" value="${esc(m.hora)}"></div></label><label class="fld grow"><span>Medicamento</span><div class="in"><input data-m="${i}.med" value="${esc(m.med)}" placeholder="Nombre"></div></label><label class="fld"><span>Dosis</span><div class="in"><input data-m="${i}.dosis" value="${esc(m.dosis)}"></div></label><label class="fld"><span>Vía</span><div class="in"><select data-m="${i}.via">${['', 'IV', 'IM', 'SC', 'VO', 'SL', 'IO', 'Nebulizada', 'Inhalada', 'Rectal', 'Tópica'].map(v => `<option ${m.via === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div></label><label class="fld grow"><span>Respuesta</span><div class="in"><input data-m="${i}.resp" value="${esc(m.resp)}"></div></label><button type="button" class="mini x" data-act="medDel" data-i="${i}">✕</button></div>`).join('')}<button type="button" class="btn gris" data-act="medAdd">＋ Agregar medicamento</button>`,
  hospital: f => f.derivacion === 'hospital' ? `<div class="c12"><label class="fld"><span>Hospital o unidad de destino</span><div class="in"><input data-k="hospital" list="hosp" value="${esc(f.hospital)}" placeholder="Nombre del hospital"></div></label><datalist id="hosp">${hospitalesUsados().map(h => `<option value="${esc(h)}">`).join('')}</datalist></div>` : f.derivacion === 'negativa' ? `<div class="aviso c12">Negativa de traslado: recabe la firma del paciente o responsable y, si es posible, de un testigo (use las firmas de abajo y las observaciones).</div>` : '',
  firmas1: f => `<div class="firmas">${firmaBox('firma_pac', 'FIRMA DEL / LA PACIENTE')}${firmaBox('firma_acomp', 'FIRMA DEL ACOMPAÑANTE')}</div>`,
  firmas2: f => `<div class="firmas">${firmaBox('firma_entrega', 'FIRMA DE QUIEN ENTREGA')}${firmaBox('firma_medico', 'FIRMA DEL MÉDICO QUE RECIBE')}</div>`,
  firmaPert: f => `<div class="firmas">${firmaBox('firma_pert', 'FIRMA DE QUIEN RECIBE PERTENENCIAS')}${firmaBox('firma_testigo', 'FIRMA DE TESTIGO (OPCIONAL)')}</div>`
};
function hospitalesUsados() {
  const s = new Set(['Cruz Roja', 'IMSS', 'ISSSTE', 'Hospital General']); S.regs.forEach(r => r.hospital && s.add(r.hospital)); return [...s];
}
function chipsLesion(f) {
  const g = {}; (f.lesiones || []).forEach(m => { const k = m.t + '|' + m.v; g[k] = (g[k] || 0) + 1; });
  const ks = Object.keys(g);
  if (!ks.length) return `<p class="muted">Sin lesiones marcadas</p>`;
  return `<div class="chips-l">${ks.map(k => { const [t, v] = k.split('|'); const li = LESIONES.findIndex(l => l[0] === t), ic = imgIc(LES_IMG[li], LESIONES[li][2]); return `<span class="chip">${ic} ${t} · ${VISTAS[v]}${g[k] > 1 ? ' ×' + g[k] : ''} <button type="button" data-lesdel="${k}">✕</button></span>`; }).join('')}<button type="button" class="chip rj" data-act="lesClear">🧹 Borrar todas</button></div>`;
}
/* ---- siluetas: adulto neutro, niño y embarazada (mitad izquierda; la derecha en espejo). Marco por figura: 220 x 450 ---- */
const SIL = {
  frente: 'M110 62 L102 63 C101 72 100 78 98 82 C86 85 70 88 62 96 C54 104 52 118 50 134 C48 150 47 162 46 174 C44 192 42 212 40 232 C38 244 36 252 37 260 C36 268 36 278 40 284 C44 288 48 286 49 282 C50 276 51 270 53 264 C55 256 56 244 57 232 C59 214 61 196 63 180 C65 164 66 150 67 138 C68 128 69 120 71 114 C73 140 74 160 76 178 C78 196 79 208 76 222 C73 236 72 252 73 268 C74 292 76 312 78 330 C79 346 80 360 80 374 C80 392 82 408 83 420 C84 430 72 436 68 444 L98 444 C100 436 100 428 100 420 C100 400 100 380 101 360 C102 340 104 320 106 300 C108 280 109 266 110 252 L110 62',
  perfil: 'M100 62 C98 72 96 80 92 86 C84 94 82 112 84 132 C86 152 88 168 88 184 C86 198 84 210 88 224 C94 238 94 252 92 268 C90 292 90 312 92 332 C92 352 92 372 92 392 C92 402 92 412 93 422 C94 432 94 440 98 444 L140 444 C142 438 136 432 124 430 C118 428 118 424 118 418 C118 400 118 380 119 362 C120 344 122 326 124 308 C126 286 130 262 132 244 C134 228 134 212 132 198 C134 186 136 170 136 156 C136 140 134 126 130 114 C128 104 128 96 122 90 C120 84 118 76 118 66 L100 62',
  brazo: 'M104 92 C92 98 90 120 92 140 C94 170 96 200 98 228 C99 244 100 256 102 266 L106 276 C110 280 116 278 116 272 L114 268 C116 254 114 240 112 226 C110 200 108 170 108 140 C108 120 114 100 104 92'
};
const DET = {
  frente: ['M98 84 Q104 90 110 90 M122 84 Q116 90 110 90', 'M82 112 Q96 126 110 118 M138 112 Q124 126 110 118', 'M110 128 L110 226 M95 150 L125 150 M96 170 L124 170 M98 190 L122 190', 'M64 98 Q58 112 60 128 M156 98 Q162 112 160 128', 'M88 252 Q86 300 88 326 M132 252 Q134 300 132 326'],
  espalda: ['M110 66 L110 232', 'M82 102 Q92 128 106 124 M138 102 Q128 128 114 124', 'M80 236 Q110 252 140 236', 'M88 252 Q86 300 88 326 M132 252 Q134 300 132 326'],
  perfil: ['M96 70 Q90 110 96 150 Q94 190 100 214']
};
function opsDe(d) {
  const t = d.match(/[MLCQ]|-?\d+(?:\.\d+)?/g) || [], ops = [], N = { M: 2, L: 2, C: 6, Q: 4 }; let k = 0;
  while (k < t.length) { const c = t[k++]; const n = N[c]; ops.push({ c, p: t.slice(k, k + n).map(Number) }); k += n; }
  return ops;
}
const serOps = ops => ops.map(o => o.c + o.p.map(v => +v.toFixed(1)).join(' ')).join(' ');
const mapOps = (ops, fn) => ops.map(o => { const p = []; for (let i = 0; i < o.p.length; i += 2) p.push(...fn(o.p[i], o.p[i + 1])); return { c: o.c, p }; });
function varCuerpo(f) {
  if (f.cuerpo_var && f.cuerpo_var !== 'auto') return f.cuerpo_var;
  const e = edadAnios(f); if (e != null && e < 12) return 'nino';
  if (f.sexo === 'Femenino' && (parseFloat(f.semanas) > 0 || f.motivo === 'Ginecoobstétrico')) return 'emb';
  return 'adulto';
}
function silDe(v) {
  silDe.c = silDe.c || {}; if (silDe.c[v]) return silDe.c[v];
  let mf = (x, y) => [x, y], mp = mf, cab = { f: [110, 36, 21, 27], p: [106, 36, 20, 27], n: [124, 38, 131, 42, 124, 48] };
  let circ = { f: [[90, 332, 7], [130, 332, 7]], p: [[116, 326, 6]] };
  if (v === 'nino') {
    mf = (x, y) => [110 + (x - 110) * 0.8, 82 + (y - 62) * 0.92]; mp = (x, y) => [106 + (x - 106) * 0.8, 82 + (y - 62) * 0.92];
    cab = { f: [110, 46, 30, 36], p: [106, 46, 29, 36], n: [135, 44, 142, 48, 135, 54] };
    circ = { f: circ.f.map(([x, y, r]) => [...mf(x, y), r * 0.8]), p: circ.p.map(([x, y, r]) => [...mp(x, y), r * 0.8]) };
  }
  if (v === 'emb') {
    const g = y => y > 130 && y < 245 ? Math.sin(Math.PI * (y - 130) / 115) : 0;
    mf = (x, y) => { const dx = x - 110, gg = g(y); return Math.abs(dx) <= 42 ? [110 + dx * (1 + 0.34 * gg), y] : [x + Math.sign(dx) * 10 * gg, y]; };
    mp = (x, y) => x >= 118 ? [x + 32 * g(y), y] : [x, y];
  }
  const r = {
    of: mapOps(opsDe(SIL.frente), mf), op: mapOps(opsDe(SIL.perfil), mp), oa: mapOps(opsDe(SIL.brazo), mp), cab, circ,
    df: DET.frente.map(d => mapOps(opsDe(d), mf)), de: DET.espalda.map(d => mapOps(opsDe(d), mf)), dp: DET.perfil.map(d => mapOps(opsDe(d), mp)), v
  };
  silDe.c[v] = r; return r;
}
/* imágenes de las siluetas (generadas con IA y recortadas con imagenes/recortar_siluetas.py); si faltan, se usan las vectoriales */
const IMG_CUERPO = {};
const NOMBRE_IMG = { adulto: 'adulto', nino: 'nino', emb: 'embarazada' }, VISTA_IMG = ['frente', 'espalda', 'lat-der', 'lat-izq'];
function precargarCuerpo(v) {
  if (IMG_CUERPO[v]) return;
  const dat = window.IMG_DATOS && window.IMG_DATOS[v];
  // se usan rutas relativas directas (funciona también con doble clic en index.html); para el PDF, las versiones livianas embebidas
  IMG_CUERPO[v] = dat ? { ok: true, urls: VISTA_IMG.map(n => `imagenes/${NOMBRE_IMG[v]}-${n}.png`), datos: dat } : { ok: false };
}
function figuras(f) {
  const vc = varCuerpo(f); precargarCuerpo(vc);
  if (IMG_CUERPO[vc].ok) {
    const im = IMG_CUERPO[vc].urls; return im.map((u, i) => `<image href="${u}" x="${i * 220}" y="0" width="220" height="450" preserveAspectRatio="xMidYMax meet"/>`).join('');
  }
  const S2 = silDe(vc), emb = S2.v === 'emb';
  const defs = `<defs><linearGradient id="gcu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2edff"/><stop offset="1" stop-color="#86aee8"/></linearGradient></defs>`;
  const d1 = serOps(S2.of), mit = d => `<path d="${d}"/><path d="${d}" transform="translate(220,0) scale(-1,1)"/>`;
  const det = arr => arr.map(o => `<path d="${serOps(o)}"/>`).join('');
  const circs = (c, ox) => c.map(([x, y, r]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}"/>`).join('');
  const cb = S2.cab, oreja = (cx, cy, rx) => `<ellipse class="brz" cx="${cx - rx}" cy="${cy + 4}" rx="3.2" ry="6"/><ellipse class="brz" cx="${cx + rx}" cy="${cy + 4}" rx="3.2" ry="6"/>`;
  const frente = (ox, espalda) => `<g transform="translate(${ox},0)" class="fig">${oreja(cb.f[0], cb.f[1], cb.f[2])}<ellipse cx="${cb.f[0]}" cy="${cb.f[1]}" rx="${cb.f[2]}" ry="${cb.f[3]}"/>${mit(d1)}<g class="det">${espalda ? det(S2.de) : det(S2.df)}${S2.v === 'nino' ? '' : ''}${circs(S2.circ.f)}${!espalda && emb ? '<ellipse cx="110" cy="192" rx="30" ry="34" stroke-dasharray="3 3"/>' : ''}${!espalda && S2.v !== 'emb' ? `<circle cx="${S2.v === 'nino' ? 110 : 110}" cy="${S2.v === 'nino' ? 82 + (178 - 62) * 0.92 : 178}" r="2"/>` : ''}</g></g>`;
  const dd = serOps(S2.op), da = serOps(S2.oa), nz = cb.n;
  const lado = (ox, espejo) => `<g transform="translate(${ox},0)${espejo ? ' translate(220,0) scale(-1,1)' : ''}" class="fig"><path class="brz" d="${da}" transform="translate(-8,0)"/><ellipse cx="${cb.p[0]}" cy="${cb.p[1]}" rx="${cb.p[2]}" ry="${cb.p[3]}"/><path d="M${nz[0]} ${nz[1]} Q${nz[2]} ${nz[3]} ${nz[4]} ${nz[5]}"/><path d="${dd}"/><path class="brz" d="${da}" transform="translate(6,2)"/><g class="det">${det(S2.dp)}${circs(S2.circ.p)}${emb ? '<ellipse cx="146" cy="196" rx="20" ry="30" stroke-dasharray="3 3"/>' : ''}</g></g>`;
  return defs + frente(0, false) + frente(220, true) + lado(440, false) + lado(660, true);
}
function chipsVar(f) {
  const v = f.cuerpo_var || 'auto', act = varCuerpo(f);
  const nm = { adulto: 'Adulto', nino: 'Niño', emb: 'Embarazada' };
  return `<div class="varc"><span>Silueta</span>${[['auto', 'Automática' + (v === 'auto' ? ' · ' + nm[act] : '')], ['adulto', 'Adulto'], ['nino', 'Niño'], ['emb', 'Embarazada']].map(([k, l]) => `<button type="button" class="${v === k ? 'on' : ''}" data-var="${k}">${l}</button>`).join('')}</div>`;
}
/* ojo con foto (generada con IA, preparada con imagenes/preparar_ojo.py): la pupila animada se superpone; si no hay foto se usa el ojo dibujado */
const OJO_FOTO = { ok: false, ini: false };
function precargarOjo() {
  if (OJO_FOTO.ini) return; OJO_FOTO.ini = true;
  if (window.OJO_CFG) Object.assign(OJO_FOTO, window.OJO_CFG, { url: 'imagenes/ojo.jpg', ok: true });
}
function ojoFoto(t, r) {
  const c = OJO_FOTO, k = { Miosis: 0.17, Normal: 0.36, Midriasis: 0.62 }[t] || 0.36, pr = c.ri * k;
  return `<svg class="ojo-svg foto" viewBox="0 0 ${c.w} ${c.h}" aria-hidden="true"><defs><clipPath id="cpO"><rect width="${c.w}" height="${c.h}" rx="${c.h * 0.07}"/></clipPath><radialGradient id="pgO"><stop offset=".78" stop-color="#050505"/><stop offset="1" stop-color="#050505" stop-opacity="0"/></radialGradient></defs>
    <g clip-path="url(#cpO)"><image href="${c.url}" width="${c.w}" height="${c.h}"/><circle class="pup ${r ? r.toLowerCase() : ''}" cx="${c.cx}" cy="${c.cy}" r="${(pr * 1.1).toFixed(1)}" fill="url(#pgO)"/>
    <ellipse cx="${(c.cx - c.ri * 0.22).toFixed(1)}" cy="${(c.cy - c.ri * 0.26).toFixed(1)}" rx="${(c.ri * 0.12).toFixed(1)}" ry="${(c.ri * 0.07).toFixed(1)}" transform="rotate(-30 ${(c.cx - c.ri * 0.22).toFixed(1)} ${(c.cy - c.ri * 0.26).toFixed(1)})" fill="#fff" fill-opacity=".8"/></g></svg>`;
}
/* ojo: iris con fibras, limbo, brillo y pupila que cambia de tamaño y reacciona a la luz */
function ojoSVG(t, r) {
  precargarOjo(); if (OJO_FOTO.ok) return ojoFoto(t, r);
  const pr = { Miosis: 6, Normal: 11, Midriasis: 19 }[t] || 11;
  let fib = ''; for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); fib += `<line x1="${(80 + c * (pr + 1.5)).toFixed(1)}" y1="${(48 + s * (pr + 1.5)).toFixed(1)}" x2="${(80 + c * 27).toFixed(1)}" y2="${(48 + s * 27).toFixed(1)}" stroke="${i % 3 ? '#d9a45a' : '#4a2a10'}" stroke-opacity="${i % 2 ? 0.55 : 0.8}" stroke-width="${i % 4 ? 1 : 1.6}"/>`; }
  const pestanas = [30, 44, 58, 72, 88, 102, 116, 130].map((x, i) => { const y = 48 - Math.sqrt(Math.max(0, 1 - Math.pow((x - 80) / 70, 2))) * 34 + 1; return `<path d="M${x} ${y.toFixed(1)} l${(x < 80 ? -3 : 3)} -6" stroke="#3a2418" stroke-width="1.4" stroke-linecap="round" fill="none"/>`; }).join('');
  return `<svg class="ojo-svg" viewBox="0 0 160 96" aria-hidden="true"><defs>
    <radialGradient id="esc" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e3e8ef"/></radialGradient>
    <radialGradient id="iri" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#c58a45"/><stop offset=".55" stop-color="#7a4a20"/><stop offset="1" stop-color="#2f1b0a"/></radialGradient>
    <linearGradient id="som" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2418" stop-opacity=".55"/><stop offset=".45" stop-color="#3a2418" stop-opacity="0"/></linearGradient>
    <clipPath id="alm"><path d="M10 48 C34 12 126 12 150 48 C126 84 34 84 10 48 Z"/></clipPath></defs>
    <path d="M4 48 C30 4 130 4 156 48 C130 92 30 92 4 48 Z" fill="#f0cfb0"/><path d="M14 38 C44 12 116 12 146 38" fill="none" stroke="#d4a784" stroke-width="1.6"/>
    <path d="M10 48 C34 12 126 12 150 48 C126 84 34 84 10 48 Z" fill="url(#esc)" stroke="#7a4a36" stroke-width="1.4"/>
    <g clip-path="url(#alm)"><path d="M16 50 C26 46 34 52 42 50 M142 52 C132 46 126 54 118 50 M24 60 C34 58 40 64 48 62" stroke="#d96a6a" stroke-opacity=".35" stroke-width=".9" fill="none"/>
      <circle cx="80" cy="48" r="28" fill="url(#iri)"/>${fib}<circle cx="80" cy="48" r="28" fill="none" stroke="#1e1208" stroke-width="3"/>
      <circle class="pup ${r ? r.toLowerCase() : ''}" cx="80" cy="48" r="${pr}" fill="#070707"/><ellipse cx="70" cy="38" rx="7" ry="4" transform="rotate(-30 70 38)" fill="#fff" fill-opacity=".85"/><circle cx="91" cy="58" r="2.4" fill="#fff" fill-opacity=".5"/>
      <path d="M10 48 C34 12 126 12 150 48 L150 0 L10 0 Z" fill="url(#som)"/></g>
    <path d="M10 48 C34 12 126 12 150 48" fill="none" stroke="#3a2418" stroke-width="2.4"/>${pestanas}</svg>`;
}

/* ---------- eventos del formulario ---------- */
let _borr = null, _txtBorr = '';
function marcarSucio() { SUCIO = true; clearTimeout(_borr); _borr = setTimeout(guardarBorrador, 700); }
function guardarBorrador() {
  if (!F || !S.user) return;
  const ok = LS.set('borrador:' + S.user.id, { rec: REC, f: F, sucio: SUCIO });
  _txtBorr = ok ? `Borrador guardado en este dispositivo · ${horaAhora()}` : 'No se pudo guardar el borrador (almacenamiento lleno)';
  const el = $('#borr'); if (el) el.textContent = _txtBorr;
}
function cargarBorrador() {
  const b = S.user && LS.get('borrador:' + S.user.id, null);
  if (b && b.f) { F = b.f; REC = b.rec; SUCIO = !!b.sucio; return true; }
  return false;
}
function empezarNuevo() {
  F = nuevoForm(); REC = { id: nuevoId(), folio: '', estatus: 'borrador', autor: S.user.nombre, creado_por: S.user.id, creado_en: new Date().toISOString(), guardado: false }; SUCIO = false;
  LS.del('borrador:' + S.user.id);
}
function actualizarTiempos() {
  const tl = $('#tl'); if (!tl) return;
  const tmp = document.createElement('div'); tmp.innerHTML = htmlTiempos(F);
  const a = tl.querySelector('.ruta'), b = tmp.querySelector('.ruta'); if (!a) { tl.innerHTML = tmp.innerHTML; return; }
  a.className = b.className; a.querySelector('.amb').style.left = b.querySelector('.amb').style.left; a.querySelector('.rec').style.width = b.querySelector('.rec').style.width;
  const bh = b.querySelectorAll('.hito'); a.querySelectorAll('.hito').forEach((h, i) => { h.className = bh[i].className; });
  const bs = b.querySelectorAll('.seg'); a.querySelectorAll('.seg').forEach((h, i) => { h.className = bs[i].className; h.querySelector('b').textContent = bs[i].querySelector('b').textContent; });
  a.querySelector('.chips-t').innerHTML = b.querySelector('.chips-t').innerHTML;
}
function setCampo(k, v) {
  F[k] = v; marcarSucio();
  if (T_MOMENTOS.some(x => x[0] === k)) { actualizarTiempos(); }
  if (k === 'fecha') { const d = $('.dia'); if (d) d.textContent = diaSemana(v); }
  if (k === 'edad' || k === 'meses') $$('.x-signos').forEach(e => e.innerHTML = CUSTOM.signos(F));
  pintarProgreso();
}
function manejarClick(e) {
  const b = e.target.closest('button,td,.mk,svg'); if (!b && !e.target.closest('svg')) return;
  const d = b ? b.dataset : {};
  const sec = e.target.closest('.sec')?.dataset.sec;
  if (d.go) { document.getElementById('sec-' + d.go)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); ACTIVA = d.go; $$('#tabs button').forEach(x => x.classList.toggle('on', x.dataset.go === d.go)); return; }
  if (d.var) { F.cuerpo_var = d.var; marcarSucio(); repintar('sec'); return; }
  if (d.tcp) { F._tcp = d.tcp; marcarSucio(); repintar('tcp'); return; }
  if (d.ap || d.sv) { const [m, k, v] = (d.ap || d.sv).split('|'); const raiz = d.ap ? 'apgar' : 'silv'; F[raiz] = F[raiz] || {}; const o = F[raiz][m] = F[raiz][m] || {}; o[k] = o[k] === +v ? undefined : +v; marcarSucio(); repintar('tcp'); return; }
  if (d.one) { const v = d.v; F[d.one] = F[d.one] === v ? '' : v; marcarSucio(); repintar(sec); if (d.one === 'motivo') { delete F._tcp; repintar('tcp'); } return; }
  if (d.multi) { const a = F[d.multi] || (F[d.multi] = []); const i = a.indexOf(d.v); i >= 0 ? a.splice(i, 1) : a.push(d.v); marcarSucio(); repintar(sec); return; }
  if (d.sw) { F[d.sw] = !F[d.sw]; marcarSucio(); repintar(sec); return; }
  if (d.ahora) { setCampo(d.ahora, horaAhora()); const i = $(`[data-k="${d.ahora}"]`); if (i) { i.value = F[d.ahora]; const r = i.closest('.reloj'); if (r) { r.classList.remove('flash'); void r.offsetWidth; r.classList.add('flash'); } } return; }
  if (d.clr) { setCampo(d.clr, ''); const i = $(`[data-k="${d.clr}"]`); if (i) i.value = ''; repintar('servicio'); return; }
  if (d.qb) { const [k, v] = d.qb.split('|'); setCampo(k, v); const i = $(`[data-k="${k}"]`); if (i) i.value = v; return; }
  if (d.les) { F.les_tipo = F.les_tipo === d.les ? '' : d.les; $$('.tile.les').forEach(x => x.classList.toggle('on', x.dataset.les === F.les_tipo)); return; }
  if (d.lesdel) { const [t, v] = d.lesdel.split('|'); F.lesiones = F.lesiones.filter(m => !(m.t === t && String(m.v) === v)); marcarSucio(); repintar('sec'); return; }
  if (d.gl) { F[d.gl] = F[d.gl] === +d.v ? null : +d.v; marcarSucio(); repintar('gcs'); repintar('sec'); return; }
  if (d.rts) { const k = 'rts_' + d.rts; F[k] = F[k] === +d.v ? undefined : +d.v; marcarSucio(); repintar('gcs'); return; }
  if (d.firma) { pedirFirma(d.firma, d.tit); return; }
  if (d.firmaDel) { F[d.firmaDel] = ''; marcarSucio(); repintar(sec); return; }
  const mk = e.target.closest('.mk');
  if (mk) { F.lesiones.splice(+mk.dataset.mk, 1); marcarSucio(); repintar('sec'); return; }
  const svg = e.target.closest('#svgCuerpo');
  if (svg) {
    if (!F.les_tipo) { toast('Primero elija el tipo de lesión'); return; }
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const v = Math.max(0, Math.min(3, Math.floor(p.x / 220)));
    F.lesiones.push({ t: F.les_tipo, v, x: Math.round(p.x - v * 220), y: Math.round(p.y) }); marcarSucio(); repintar('sec'); return;
  }
  if (d.act) accion(d.act, d, sec);
}
function accion(a, d, sec) {
  switch (a) {
    case 'tomaAdd': F.tomas.push({ hora: horaAhora() }); marcarSucio(); repintar('sec'); break;
    case 'tomaDel': F.tomas.splice(+d.i, 1); marcarSucio(); repintar('sec'); break;
    case 'tomaAhora': F.tomas[+d.i].hora = horaAhora(); marcarSucio(); repintar('sec'); break;
    case 'neuro': F.tomas[+d.i].neuro = F.tomas[+d.i].neuro === d.v ? '' : d.v; marcarSucio(); repintar('sec'); break;
    case 'medAdd': F.meds.push({ hora: horaAhora() }); marcarSucio(); repintar('trat'); break;
    case 'medDel': F.meds.splice(+d.i, 1); marcarSucio(); repintar('trat'); break;
    case 'ivMas': F.iv_n = Math.min(6, (F.iv_n || 0) + 1); marcarSucio(); repintar('trat'); break;
    case 'ivMenos': F.iv_n = Math.max(0, (F.iv_n || 0) - 1); marcarSucio(); repintar('trat'); break;
    case 'lesClear': F.lesiones = []; marcarSucio(); repintar('sec'); break;
    case 'tomarUnidad': { const u = S.unidad || {}; Object.assign(F, { ambulancia: u.unidad || F.ambulancia, base: u.base || F.base, operador: u.operador || F.operador, prestadores: [u.tamp, u.copiloto].filter(Boolean).join(', ') || F.prestadores }); marcarSucio(); repintar('unidad'); toast('Datos tomados de la ficha de la unidad'); break; }
    case 'gps': tomarGPS(); break;
    case 'gpsDel': F.lat = F.lon = F.gps_prec = F.gps_hora = ''; marcarSucio(); repintar('servicio'); break;
    case 'gpsCopy': navigator.clipboard?.writeText(`${F.lat}, ${F.lon}`).then(() => toast('Coordenadas copiadas'), () => toast('No se pudo copiar')); break;
    case 'gpsMapa': window.open(`https://www.openstreetmap.org/?mlat=${F.lat}&mlon=${F.lon}#map=18/${F.lat}/${F.lon}`, '_blank', 'noopener'); break;
    case 'gpsShare': compartirTexto(`📍 Ubicación del servicio${REC?.folio ? ' ' + REC.folio : ''}\n${[F.calle, F.colonia, F.municipio].filter(Boolean).join(', ')}\nhttps://www.openstreetmap.org/?mlat=${F.lat}&mlon=${F.lon}#map=18/${F.lat}/${F.lon}`, 'Ubicación del servicio'); break;
    case 'guardar': guardarFRAP(false); break;
    case 'cerrar': guardarFRAP(true); break;
    case 'pdf': generarPDF(); break;
    case 'compartir': compartirFRAP(); break;
    case 'nuevo': nuevoFRAP(); break;
  }
}
function manejarInput(e) {
  const el = e.target;
  if (el.dataset.k) { let v = el.type === 'range' ? +el.value : el.value; setCampo(el.dataset.k, v); if (el.id === 'rng') $('#rngv').textContent = v + ' L/min'; return; }
  if (el.dataset.t) {
    const [i, k] = el.dataset.t.split('.'); F.tomas[+i][k] = el.value; marcarSucio();
    const lab = el.closest('.fld'); if (lab && k !== 'hora' && k !== 'ekg') { lab.classList.remove('hi', 'lo'); const a = alertaVit(k, el.value, F); if (a) lab.classList.add(a); }
    pintarProgreso(); return;
  }
  if (el.dataset.m) { const [i, k] = el.dataset.m.split('.'); F.meds[+i][k] = el.value; marcarSucio(); }
}
function tomarGPS() {
  if (!navigator.geolocation) { toast('Este equipo no tiene GPS'); return; }
  GPS_BUSCANDO = true; repintar('servicio');
  navigator.geolocation.getCurrentPosition(pos => {
    GPS_BUSCANDO = false;
    F.lat = pos.coords.latitude.toFixed(6); F.lon = pos.coords.longitude.toFixed(6); F.gps_prec = Math.round(pos.coords.accuracy); F.gps_hora = horaAhora();
    marcarSucio(); repintar('servicio'); direccionInversa();
  }, err => { GPS_BUSCANDO = false; repintar('servicio'); toast('No se pudo obtener la ubicación: ' + (err.code === 1 ? 'permiso negado' : err.message)); }, { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 });
}
async function direccionInversa() {
  if (!navigator.onLine || CFG.geocodificar === false) return;
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${F.lat}&lon=${F.lon}&accept-language=es&zoom=18`);
    const a = (await r.json()).address || {};
    if (!F.calle) F.calle = [a.road, a.house_number].filter(Boolean).join(' ');
    if (!F.colonia) F.colonia = a.suburb || a.neighbourhood || a.village || a.hamlet || '';
    if (!F.municipio || F.municipio === 'Ixhuatlán del Café, Veracruz') F.municipio = [a.city || a.town || a.municipality || a.county, a.state].filter(Boolean).join(', ') || F.municipio;
    marcarSucio(); repintar('servicio');
  } catch (e) { }
}

/* ---------- firma táctil ---------- */
function pedirFirma(k, titulo) {
  const cerrar = modal({
    titulo: titulo || 'Firma', ancho: 560, html: `<canvas id="cvF" width="900" height="300"></canvas><p class="muted">Firme sobre la línea</p>`,
    botones: [['Limpiar', 'gris', () => { const c = $('#cvF'); c.getContext('2d').clearRect(0, 0, c.width, c.height); dibujarLinea(c); c._vacio = true; return false; }], ['✓ Aceptar firma', 'azul', () => {
      const c = $('#cvF'); if (c._vacio !== false) { toast('Aún no hay firma'); return false; }
      const o = document.createElement('canvas'); o.width = 450; o.height = 150; const x = o.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 450, 150); x.drawImage(c, 0, 0, 450, 150);
      F[k] = o.toDataURL('image/png'); marcarSucio(); repintar(['firma_pert', 'firma_testigo'].includes(k) ? 'leg' : 'tras'); return true;
    }]],
    alAbrir: () => {
      const c = $('#cvF'), ctx = c.getContext('2d'); dibujarLinea(c); c._vacio = true; let dib = false, ult = null;
      const pos = ev => { const r = c.getBoundingClientRect(); return [(ev.clientX - r.left) * c.width / r.width, (ev.clientY - r.top) * c.height / r.height]; };
      c.addEventListener('pointerdown', ev => { dib = true; ult = pos(ev); c.setPointerCapture(ev.pointerId); ev.preventDefault(); });
      c.addEventListener('pointermove', ev => { if (!dib) return; const p = pos(ev); ctx.strokeStyle = '#0b1f4d'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(...ult); ctx.lineTo(...p); ctx.stroke(); ult = p; c._vacio = false; });
      ['pointerup', 'pointercancel'].forEach(n => c.addEventListener(n, () => { dib = false; }));
    }
  });
}
function dibujarLinea(c) { const x = c.getContext('2d'); x.save(); x.strokeStyle = '#94a3b8'; x.lineWidth = 2; x.beginPath(); x.moveTo(40, c.height - 50); x.lineTo(c.width - 40, c.height - 50); x.stroke(); x.restore(); }

/* ---------- guardar / nuevo ---------- */
async function guardarFRAP(cerrar) {
  if (!puedeEditar()) { toast('No tienes permiso para guardar este FRAP'); return; }
  const r = resumenFRAP(F);
  if (cerrar && r.faltan.length) {
    const si = await confirmar(`<b>Faltan ${r.faltan.length} datos clave:</b><br>• ${r.faltan.map(esc).join('<br>• ')}<br><br>¿Cerrar el FRAP de todos modos?`, 'Cerrar así');
    if (!si) return;
  }
  if (cerrar) REC.estatus = 'cerrado'; else if (!REC.guardado) REC.estatus = 'borrador'; else if (REC.estatus === 'revisado') REC.estatus = 'cerrado';
  try {
    const res = await Datos.guardar(REC, F);
    REC.guardado = true; REC.folio = res.rec.folio || REC.folio; SUCIO = false; guardarBorrador();
    Datos.log(cerrar ? 'Cerró un FRAP' : 'Guardó un FRAP', (REC.folio || '') + (F.pac_nombre ? ' · ' + F.pac_nombre : ''));
    pintarFormulario(); actualizarInicio();
    const donde = NUBE ? (res.sincronizado ? 'quedó guardado en la nube' : 'quedó guardado en este equipo y se enviará al volver el internet') : 'quedó guardado en este equipo';
    const nuevo = await confirmar(`<b>${REC.folio ? esc(REC.folio) : 'El FRAP'}</b> ${donde}.<br>¿Empezar un FRAP nuevo?`, 'Nuevo FRAP', 'Seguir aquí', 'FRAP guardado');
    if (nuevo) { empezarNuevo(); pintarFormulario(); actualizarInicio(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  } catch (e) { toast('No se pudo guardar: ' + e.message, 6000); }
}
async function guardarAvance() {
  if (!puedeEditar()) { toast('No tienes permiso para guardar este FRAP'); return; }
  if (!REC.guardado) REC.estatus = 'borrador';
  const fl = $('#flot'); if (fl) fl.classList.add('guardando');
  try {
    const res = await Datos.guardar(REC, F);
    REC.guardado = true; REC.folio = res.rec.folio || REC.folio; SUCIO = false; guardarBorrador();
    const fo = $('.x-folio'); if (fo) fo.innerHTML = CUSTOM.folio(F);
    pintarProgreso(); actualizarInicio();
    Datos.log('Guardó avance', (REC.folio || '') + (F.pac_nombre ? ' · ' + F.pac_nombre : ''));
    const h = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    toast(`${NUBE ? (res.sincronizado ? '☁ Avance guardado en la nube' : '💾 Avance guardado en el equipo; se enviará con internet') : '💾 Avance guardado en este equipo'} · ${h}`);
  } catch (e) { toast('No se pudo guardar el avance: ' + e.message, 6000); }
  finally { if (fl) fl.classList.remove('guardando'); }
}
async function nuevoFRAP() {
  if (SUCIO && !(await confirmar('Hay cambios sin guardar en este FRAP. ¿Descartarlos y empezar uno nuevo?', 'Descartar y nuevo'))) return;
  empezarNuevo(); pintarFormulario(); actualizarInicio(); window.scrollTo({ top: 0, behavior: 'smooth' });
}
async function abrirFRAP(id) {
  const r = S.regs.find(x => x.id === id); if (!r) return;
  if (SUCIO && !(await confirmar('Hay cambios sin guardar en el FRAP en pantalla. ¿Descartarlos y abrir otro?', 'Abrir otro'))) return;
  let d; try { d = await Datos.abrir(id); } catch (e) { toast('No se pudo abrir: ' + e.message); return; }
  if (!d) { toast('Este FRAP necesita internet para abrirse'); return; }
  F = JSON.parse(JSON.stringify(d)); F.tomas = F.tomas?.length ? F.tomas : [{}]; F.lesiones = F.lesiones || []; F.meds = F.meds || [];
  REC = { id: r.id, folio: r.folio, estatus: r.estatus, autor: r.autor, creado_por: r.creado_por, creado_en: r.creado_en, guardado: true }; SUCIO = false;
  guardarBorrador(); cerrarPaneles(); pintarFormulario(); actualizarInicio();
  document.getElementById('form')?.scrollIntoView({ behavior: 'smooth' });
}
