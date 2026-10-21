'use strict';
/* =====================================================================
   pdf.js: FRAP en PDF (jsPDF local), resumen para compartir y exportación a Excel
   ===================================================================== */
const otrosTxt = (f, k) => { const v = f[k]; return v === '__otros' ? (f[k + '_x'] || 'Otros') : (v || ''); };
const listaTxt = (f, k) => (f[k] || []).map(x => x === '__otros' ? (f[k + '_x'] || 'Otros') : x).join(', ');
const DERIV = { hospital: 'Traslado a hospital', hogar: 'Se queda en su hogar', alta: 'Alta en el sitio', negativa: 'Negativa de traslado' };

/* marca SIRAP dibujada con vectores (escudo, montaña, pulso) */
function marcaPDF(doc, x, y, t) {
  if (window.LOGO_APP) { try { doc.addImage(window.LOGO_APP, 'PNG', x, y, t, t); return; } catch (e) { } }
  const k = t / 64, P = (a, b) => [x + a * k, y + b * k];
  const poli = (pts, estilo) => { const q = pts.map(p => P(...p)); doc.lines(q.slice(1).map((p, i) => [p[0] - q[i][0], p[1] - q[i][1]]), q[0][0], q[0][1], [1, 1], estilo, true); };
  doc.setLineWidth(1.2); doc.setDrawColor(255, 255, 255); doc.setFillColor(29, 74, 168);
  poli([[32, 3], [57, 17], [57, 44], [32, 61], [7, 44], [7, 17]], 'FD');
  doc.setFillColor(232, 101, 13); poli([[12, 43], [25, 25], [32, 34], [40, 22], [52, 43]], 'F');
  doc.setLineWidth(1.5); doc.setLineCap('round'); doc.setLineJoin('round');
  const l = [[9, 47], [22, 47], [27, 38], [33, 54], [38, 43], [42, 47], [55, 47]].map(p => P(...p));
  for (let i = 1; i < l.length; i++) doc.line(l[i - 1][0], l[i - 1][1], l[i][0], l[i][1]);
  doc.setFillColor(55, 179, 111); doc.setLineWidth(0); const c = P(35, 14); doc.ellipse(c[0], c[1], 4.2 * k, 6.5 * k, 'F');
}
function construirPDF(f, rec) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const W = 612, H = 792, M = 34, CW = W - 2 * M;
  let y = 0, pag = 1;
  const u = S.unidad || unidadVacia();
  const azul = [20, 58, 143], rojo = [232, 101, 13], gris = [100, 116, 139];
  const folio = rec?.folio || 'SIN FOLIO';

  const cabecera = () => {
    doc.setFillColor(...azul); doc.rect(0, 0, W, 62, 'F'); doc.setFillColor(...rojo); doc.rect(0, 62, W, 4, 'F');
    marcaPDF(doc, M, 12, 40);
    doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text('REGISTRO DE ATENCION PREHOSPITALARIA (FRAP)', M + 50, 28);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.text(`${u.institucion || ''}${u.unidad ? ' · Unidad ' + u.unidad : ''}`, M + 50, 43);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text(folio, W - M, 26, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(`Fecha del servicio: ${fFechaL(f.fecha)}`, W - M, 42, { align: 'right' });
    y = 82;
  };
  const pie = () => {
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(...gris); doc.setFont('helvetica', 'normal');
      doc.text('Generado con SIRAP · H. Ayuntamiento de Ixhuatlán del Café, Veracruz · Protección Civil', M, H - 18);
      doc.text(`${folio} · Página ${i} de ${n}`, W - M, H - 18, { align: 'right' });
    }
  };
  const salto = h => { if (y + h > H - 36) { doc.addPage(); pag++; cabecera(); } };
  const seccion = t => { salto(40); doc.setFillColor(...azul); doc.roundedRect(M, y, CW, 17, 3, 3, 'F'); doc.setFillColor(...rojo); doc.rect(M, y, 4, 17, 'F'); doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text(t.toUpperCase(), M + 10, y + 12); y += 24; };
  const filas = (pares, cols = 3) => {
    const lista = pares.filter(p => p && p[1] !== '' && p[1] != null && p[1] !== false);
    if (!lista.length) return;
    const cw = CW / cols;
    for (let i = 0; i < lista.length; i += cols) {
      const grupo = lista.slice(i, i + cols);
      const lns = grupo.map(([, v]) => doc.setFont('helvetica', 'bold').setFontSize(9) && doc.splitTextToSize(String(v === true ? 'Sí' : v), cw - 10));
      const h = Math.max(...lns.map(l => l.length)) * 11 + 14;
      salto(h);
      grupo.forEach(([l], j) => {
        const x = M + j * cw;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8); doc.setTextColor(...gris); doc.text(String(l).toUpperCase(), x + 2, y + 7);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(20, 24, 38); doc.text(lns[j], x + 2, y + 18);
      });
      doc.setDrawColor(226, 232, 240); doc.line(M, y + h - 1, M + CW, y + h - 1);
      y += h;
    }
    y += 4;
  };
  const parrafo = (l, v) => { if (!v) return; filas([[l, v]], 1); };

  cabecera();
  // ---- Servicio
  seccion('1 · Datos del servicio');
  const r = resumenFRAP(f);
  filas([['Folio', folio], ['Fecha', fFechaL(f.fecha) + (f.fecha ? ' (' + diaSemana(f.fecha) + ')' : '')], ['Sede / Subsede', [f.sede, f.subsede].filter(Boolean).join(' / ')],
  ['Llamada', f.t_llamada], ['Salida', f.t_salida], ['Llegada', f.t_llegada], ['Traslado', f.t_traslado], ['Hospital', f.t_hospital], ['Base', f.t_base],
  ['Tiempo de respuesta', r.respuesta != null ? r.respuesta + ' min' : ''], ['Tiempo en el sitio', difMin(f.t_llegada, f.t_traslado) != null ? difMin(f.t_llegada, f.t_traslado) + ' min' : ''], ['Motivo de la atención', f.motivo]], 3);
  filas([['Calle', f.calle], ['Esquina con', f.esquina], ['Entre', f.entre], ['Colonia / Localidad', f.colonia], ['Municipio', f.municipio], ['Lugar de ocurrencia', otrosTxt(f, 'lugar')], ['Coordenadas GPS', f.lat ? `${f.lat}, ${f.lon} (±${f.gps_prec || '?'} m)` : '']], 3);
  parrafo('Observaciones del servicio', f.obs_servicio);
  // ---- Unidad
  seccion('2 · Unidad');
  filas([['Ambulancia', f.ambulancia], ['Base', f.base], ['Otro tipo de unidad', [f.otra_unidad, f.otra_unidad_n].filter(Boolean).join(' ')], ['Operador', f.operador], ['Prestadores del servicio', f.prestadores], ['Matrícula helicóptero', f.helicoptero]], 3);
  parrafo('Observaciones', f.obs_unidad);
  // ---- Paciente
  seccion('3 · Paciente');
  filas([['Nombre / media filiación', f.pac_nombre], ['Sexo', f.sexo], ['Edad', f.edad ? f.edad + ' años' + (f.meses ? ' ' + f.meses + ' meses' : '') : (f.meses ? f.meses + ' meses' : '')], ['Teléfono', f.pac_tel], ['Ocupación', f.ocupacion], ['Derechohabiente a', otrosTxt(f, 'derechohab')],
  ['Domicilio', f.domicilio], ['Colonia / Población', f.pac_colonia], ['Municipio', f.pac_municipio], ['Detenido', f.detenido], ['Víctima', f.victima], ['Gastos médicos mayores', f.gmm], ['Contacto de emergencia', [f.contacto, f.contacto_tel].filter(Boolean).join(' · ')]], 3);
  parrafo('Observaciones', f.obs_paciente);
  // ---- Trauma / clínica / parto
  const hayTCP = ['agente', 'proteccion', 'aparato', 'sintomas'].some(k => (f[k] || []).length) || f.padecimiento || f.cinematica || f.gestas || f.semanas || f.nacimiento_h || f.altura || f.nac_estado || f.apgar || f.silv;
  if (hayTCP) {
    seccion('4 · Trauma · Clínica · Parto');
    parrafo('Agente causal / mecanismo', listaTxt(f, 'agente')); filas([['Equipo de protección', listaTxt(f, 'proteccion')], ['Altura de caída', f.altura ? f.altura + ' m' : ''], ['Cinemática', f.cinematica]], 3);
    parrafo('Aparato o sistema', listaTxt(f, 'aparato')); parrafo('Síntomas principales', listaTxt(f, 'sintomas')); parrafo('Padecimiento actual', f.padecimiento);
    filas([['Gestas', f.gestas], ['Partos', f.partos], ['Cesáreas', f.cesareas], ['Abortos', f.abortos], ['FUM', f.fum], ['Semanas', f.semanas], ['Contracciones', f.contracciones], ['Ruptura de membranas', f.ruptura], ['Producto', f.nac_estado], ['Hora de nacimiento', f.nacimiento_h], ['Sexo del RN', f.rn_sexo], ['Peso estimado', f.rn_peso ? f.rn_peso + ' g' : ''], ['Sangrado', f.sangrado], ['Placenta', f.placenta]], 3);
    const ap = ['1', '5', '10'].map(m => [m, apgarTot(f, m)]).filter(x => x[1] != null), sv = ['1', '2'].map(m => [m, silvTot(f, m)]).filter(x => x[1] != null);
    filas([['Apgar', ap.map(([m, t]) => `${m} min: ${t} (${apgarTxt(t)[0]})`).join(' · ')], ['Silverman-Anderson', sv.map(([m, t]) => `Valoración ${m}: ${t} (${silvTxt(t)[0]})`).join(' · ')]], 2);
    parrafo('Observaciones', f.obs_tcp);
  }
  // ---- Evaluación primaria
  seccion('5 · Evaluación primaria');
  filas([['Conciencia (AVDI)', f.avdi], ['Vía aérea', f.via_aerea], ['Ventilación', f.respiracion], ['Ruidos respiratorios', listaTxt(f, 'ruidos')], ['Pulso', [f.pulso, f.pulso_cal].filter(Boolean).join(' · ')], ['Piel', [f.piel_color, f.piel_temp].filter(Boolean).join(' · ')], ['Llenado capilar', f.llenado], ['Diaforesis', f.diaforesis], ['Hemorragia mayor', f.hemorragia_mayor], ['Cianosis', f.cianosis]], 3);
  parrafo('Observaciones', f.obs_prim);
  // ---- Evaluación secundaria
  seccion('6 · Evaluación secundaria');
  const g = {}; (f.lesiones || []).forEach(m => { const k = m.t + ' (' + VISTAS[m.v] + ')'; g[k] = (g[k] || 0) + 1; });
  parrafo('Lesiones marcadas', Object.keys(g).map(k => k + (g[k] > 1 ? ' x' + g[k] : '')).join(' · '));
  dibujarCuerpoPDF(doc, f, M, () => y, v => { y = v; }, salto, CW);
  filas([['Pupila derecha', [f.pup_od_t, f.pup_od_r].filter(Boolean).join(' · ')], ['Pupila izquierda', [f.pup_oi_t, f.pup_oi_r].filter(Boolean).join(' · ')]], 2);
  // signos vitales: tabla
  const tomas = (f.tomas || []).filter(t => Object.keys(t).some(k => k !== 'hora' && t[k]));
  if (tomas.length) {
    const cols = ['Hora', 'FR', 'FC', 'TAS', 'TAD', 'SaO2', 'Temp', 'Gluc', 'EKG', 'Neuro']; const keys = ['hora', 'fr', 'fc', 'tas', 'tad', 'sao2', 'temp', 'gluc', 'ekg', 'neuro'];
    const cw = CW / cols.length; salto(16 + tomas.length * 15);
    doc.setFillColor(226, 232, 240); doc.rect(M, y, CW, 14, 'F'); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...azul);
    cols.forEach((c, i) => doc.text(c, M + i * cw + 4, y + 10)); y += 14;
    tomas.forEach(t => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
      keys.forEach((k, i) => { const a = ['fr', 'fc', 'tas', 'tad', 'sao2', 'temp', 'gluc'].includes(k) ? alertaVit(k, t[k], f) : ''; doc.setTextColor(...(a === 'hi' ? rojo : a === 'lo' ? [29, 78, 216] : [20, 24, 38])); doc.setFont('helvetica', a ? 'bold' : 'normal'); doc.text(String(t[k] ?? ''), M + i * cw + 4, y + 10); });
      doc.setDrawColor(226, 232, 240); doc.line(M, y + 14, M + CW, y + 14); y += 15;
    });
    doc.setFontSize(7); doc.setTextColor(...gris); doc.setFont('helvetica', 'normal'); doc.text('Rojo: arriba de lo normal · Azul: abajo de lo normal (valores de referencia orientativos).', M, y + 8); y += 14;
  }
  filas([['Alergias', f.alergias], ['Medicamentos que toma', f.medicamentos], ['Enfermedades y cirugías previas', f.enfermedades], ['Última comida', f.ultima_comida]], 2);
  parrafo('Eventos previos', f.eventos);
  const tg = TRIAGE.find(t => t[0] === f.prioridad);
  filas([['Condición', f.condicion], ['Estado', f.estado], ['Prioridad (triage)', tg ? tg[1] + ' · ' + tg[2] : '']], 3);
  if (tg) { const col = { rojo: [220, 38, 38], amarillo: [234, 179, 8], verde: [34, 163, 90], negro: [30, 30, 30] }[tg[0]]; doc.setFillColor(...col); doc.rect(M, y - 4, CW, 5, 'F'); y += 6; }
  parrafo('Observaciones', f.obs_sec);
  // ---- Glasgow / Trauma score
  const gt = glasgowTot(f), rr = rts(f);
  if (gt != null || rr.total != null) {
    seccion('7 · Glasgow · Trauma score');
    filas([['Escala de Glasgow', gt != null ? `${gt}/15  (O${f.gl_o} V${f.gl_v} M${f.gl_m}) - ${glClase(gt)[0]}` : ''], ['Trauma score revisado', rr.total != null ? `${rr.total}/12 - ${rtsTxt(rr.total)[0]}` : ''], ['Componentes RTS', rr.total != null ? `Glasgow ${rr.g} · TAS ${rr.s} · FR ${rr.r}` : '']], 3);
    parrafo('Observaciones', f.obs_gcs);
  }
  // ---- Tratamiento
  seccion('8 · Tratamiento');
  filas([['Vía aérea', listaTxt(f, 'tr_via')], ['Control cervical', listaTxt(f, 'tr_cervical')], ['Ventilación', listaTxt(f, 'tr_vent')],
  ['Oxigenoterapia', f.tr_o2 ? otrosTxt(f, 'tr_o2') + ' a ' + (f.tr_o2_flujo ?? '') + ' L/min' : ''], ['Control de hemorragias', listaTxt(f, 'tr_hemo')], ['Reanimación', listaTxt(f, 'tr_rcp')],
  ['Vías IV', f.iv_n ? `${f.iv_n} vía(s)${f.iv_cal ? ' · ' + f.iv_cal : ''}${f.iv_sitio ? ' · ' + f.iv_sitio : ''}` : ''], ['Solución', [f.iv_sol, f.iv_ml_otra ? f.iv_ml_otra + ' ml' : (f.iv_ml ? f.iv_ml + ' ml' : ''), f.iv_inf].filter(Boolean).join(' · ')], ['Detalle de reanimación', f.rcp_detalle],
  ['Inmovilización / otros', listaTxt(f, 'tr_inmov')]], 3);
  const meds = (f.meds || []).filter(m => m.med);
  if (meds.length) filas(meds.map((m, i) => ['Medicamento ' + (i + 1), `${m.hora || ''} · ${m.med}${m.dosis ? ' · ' + m.dosis : ''}${m.via ? ' · vía ' + m.via : ''}${m.resp ? ' · resp: ' + m.resp : ''}`]), 1);
  parrafo('Observaciones', f.obs_trat);
  // ---- Traslado y entrega
  seccion('9 · Traslado y entrega');
  filas([['Derivación', DERIV[f.derivacion] || ''], ['Hospital / destino', f.hospital], ['Paciente', f.tr_paciente], ['Acompañante', f.tr_acomp], ['Parentesco / cargo', f.tr_parentesco], ['Teléfono', f.tr_tel], ['Entrega paciente', f.entrega_nombre], ['Médico que recibe', f.recibe_medico], ['Hora de entrega', f.entrega_hora]], 3);
  parrafo('Observaciones', f.obs_tras);
  firmasPDF(doc, [[f.firma_pac, 'Firma del paciente'], [f.firma_acomp, 'Firma del acompañante'], [f.firma_entrega, 'Firma de quien entrega'], [f.firma_medico, 'Firma del médico que recibe']], M, CW, () => y, v => { y = v; }, salto);
  // ---- Datos legales
  seccion('10 · Datos legales');
  parrafo('Posición y orientación en que se encontró', f.posicion);
  filas([['Autoridades presentes', listaTxt(f, 'autoridades')], ['Folio de la autoridad', f.aut_folio], ['Recibe pertenencias', [f.recibe_pert, f.recibe_pert_cargo].filter(Boolean).join(' · ')], ['Seguro del automóvil', f.seguro_auto]], 2);
  parrafo('Pertenencias', f.pertenencias); parrafo('Observaciones', f.obs_leg);
  firmasPDF(doc, [[f.firma_pert, 'Firma de quien recibe pertenencias'], [f.firma_testigo, 'Firma de testigo']], M, CW, () => y, v => { y = v; }, salto);
  // pie con quién lo capturó
  salto(30); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...gris); doc.text(`Capturó: ${rec?.autor || S.user?.nombre || ''} · Estatus: ${rec?.estatus || 'borrador'} · Impreso: ${fDT(new Date().toISOString())}`, M, y + 8);
  pie();
  return doc;
}
function firmasPDF(doc, lista, M, CW, getY, setY, salto) {
  const con = lista.filter(x => x[0]); if (!con.length) return;
  const bw = 150, bh = 50; salto(bh + 22); let y = getY() + 4; const cw = CW / Math.min(con.length, 4);
  con.forEach(([img, tit], i) => {
    const x = M + (i % 4) * cw;
    try { doc.addImage(img, 'PNG', x + 2, y, bw, bh); } catch (e) { }
    doc.setDrawColor(148, 163, 184); doc.line(x + 2, y + bh + 2, x + bw, y + bh + 2);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 116, 139); doc.text(tit.toUpperCase(), x + 2, y + bh + 11);
  });
  setY(y + bh + 20);
}
/* siluetas con las marcas de lesión (si hay): mismas trayectorias que la pantalla */
function trazarOps(doc, ops, fx, fy, estilo) {
  let cx = 0, cy = 0, x0 = 0, y0 = 0; const segs = [];
  ops.forEach(o => {
    const q = o.p.map((v, i) => i % 2 ? fy(v) : fx(v));
    if (o.c === 'M') { x0 = q[0]; y0 = q[1]; cx = x0; cy = y0; }
    else if (o.c === 'L') { segs.push([q[0] - cx, q[1] - cy]); cx = q[0]; cy = q[1]; }
    else { segs.push([q[0] - cx, q[1] - cy, q[2] - cx, q[3] - cy, q[4] - cx, q[5] - cy]); cx = q[4]; cy = q[5]; }
  });
  doc.lines(segs, x0, y0, [1, 1], estilo, true);
}
function dibujarCuerpoPDF(doc, f, M, getY, setY, salto, CW) {
  if (!(f.lesiones || []).length) return;
  const vc = varCuerpo(f), S2 = silDe(vc), alto = 150, s = alto / 450; salto(alto + 24); const y = getY();
  doc.setFillColor(238, 243, 252); doc.rect(M, y, CW, alto + 14, 'F');
  const ancho = CW / 4, col = v => M + v * ancho + (ancho - 220 * s) / 2;
  const fotos = IMG_CUERPO[vc] && IMG_CUERPO[vc].ok ? IMG_CUERPO[vc].datos : null;
  doc.setFillColor(205, 222, 250); doc.setDrawColor(120, 150, 205); doc.setLineWidth(0.6);
  for (let v = 0; v < 4; v++) {
    const ox = col(v), oy = y + 4;
    const X = x => ox + x * s, Xm = x => ox + (220 - x) * s, Y = yy => oy + yy * s;
    if (fotos) { try { doc.addImage(fotos[v], 'JPEG', ox, oy, 220 * s, 450 * s); } catch (e) { } }
    else {
      const cb = v < 2 ? S2.cab.f : S2.cab.p;
      doc.ellipse(X(cb[0]), Y(cb[1]), cb[2] * s, cb[3] * s, 'FD');
      if (v < 2) { trazarOps(doc, S2.of, X, Y, 'FD'); trazarOps(doc, S2.of, Xm, Y, 'FD'); }
      else trazarOps(doc, S2.op, v === 2 ? X : Xm, Y, 'FD');
    }
    doc.setFontSize(6.5); doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'bold'); doc.text(VISTAS[v].toUpperCase(), ox + 110 * s, y + alto + 11, { align: 'center' });
  }
  (f.lesiones || []).forEach(m => {
    const ti = LESIONES.findIndex(l => l[0] === m.t); const hex = LES_COL[ti] || '#dc2626';
    const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    const px = col(m.v) + m.x * s, py = y + 4 + m.y * s;
    const ico = window.ICO_LES && window.ICO_LES[ti];
    doc.setFillColor(255, 255, 255); doc.setDrawColor(...rgb); doc.setLineWidth(1); doc.circle(px, py, 5.6, 'FD');
    if (ico) { try { doc.addImage(ico, 'PNG', px - 4.2, py - 4.2, 8.4, 8.4); } catch (e) { } }
    else { doc.setTextColor(...rgb); doc.setFontSize(4.5); doc.setFont('helvetica', 'bold'); doc.text(LESIONES[ti][1], px, py + 1.6, { align: 'center' }); }
  });
  setY(y + alto + 22);
}

function nombreArchivo(rec) { return (rec?.folio || 'FRAP') + (F?.pac_nombre ? '_' + F.pac_nombre.replace(/[^\w\-]+/g, '_').slice(0, 24) : '') + '.pdf'; }
function generarPDF() {
  if (!window.jspdf) { toast('No cargó el generador de PDF'); return; }
  try {
    const doc = construirPDF(F, REC); doc.save(nombreArchivo(REC)); Datos.log('Generó PDF', REC?.folio || '');
  } catch (e) { console.error(e); toast('No se pudo generar el PDF: ' + e.message, 6000); }
}
function resumenTexto(f, rec) {
  const tg = TRIAGE.find(t => t[0] === f.prioridad); const r = resumenFRAP(f);
  const l = [`🚑 FRAP ${rec?.folio || '(sin folio)'}`, `📅 ${fFechaL(f.fecha)}${f.t_llamada ? ' · llamada ' + f.t_llamada : ''}`];
  if (f.ambulancia) l.push(`Unidad: ${f.ambulancia}`);
  if (f.motivo) l.push(`Motivo: ${f.motivo}`);
  const pac = [f.pac_nombre, f.edad ? f.edad + ' años' : '', f.sexo].filter(Boolean).join(', '); if (pac) l.push(`👤 Paciente: ${pac}`);
  const ub = [f.calle, f.colonia, f.municipio].filter(Boolean).join(', '); if (ub) l.push(`📍 ${ub}`);
  if (tg) l.push(`🚦 Prioridad: ${tg[1]} (${tg[2]})`);
  const gt = glasgowTot(f); if (gt != null) l.push(`🧠 Glasgow ${gt}/15`);
  const t = (f.tomas || [])[0] || {}; const sv = [t.fr && 'FR ' + t.fr, t.fc && 'FC ' + t.fc, t.tas && t.tad ? `TA ${t.tas}/${t.tad}` : t.tas && 'TAS ' + t.tas, t.sao2 && 'SaO2 ' + t.sao2 + '%'].filter(Boolean).join(' · '); if (sv) l.push(`📈 ${sv}`);
  if (f.derivacion) l.push(`🏥 ${DERIV[f.derivacion]}${f.hospital ? ': ' + f.hospital : ''}`);
  if (r.respuesta != null) l.push(`⏱ Respuesta: ${r.respuesta} min`);
  l.push(`Atendió: ${rec?.autor || S.user?.nombre || ''}`);
  return l.join('\n');
}
async function compartirTexto(texto, titulo) {
  try { if (navigator.share) { await navigator.share({ title: titulo || 'FRAP', text: texto }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(texto); toast('Resumen copiado: péguelo donde quiera compartirlo'); } catch (e) { window.open('https://wa.me/?text=' + enc(texto), '_blank', 'noopener'); }
}
async function compartirFRAP() {
  const txt = resumenTexto(F, REC);
  Datos.log('Compartió resumen', REC?.folio || '');
  if (can('pdf') && window.jspdf && navigator.canShare) {
    try {
      const doc = construirPDF(F, REC); const blob = doc.output('blob'); const file = new File([blob], nombreArchivo(REC), { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'FRAP ' + (REC?.folio || ''), text: txt }); return; }
    } catch (e) { if (e.name === 'AbortError') return; }
  }
  compartirTexto(txt, 'FRAP ' + (REC?.folio || ''));
}

/* ---------- Excel (HTML que Excel abre con formato) ---------- */
function exportarExcel(filas, nombre) {
  const cab = ['Folio', 'Fecha', 'Hora llamada', 'Unidad', 'Paramédico', 'Motivo', 'Paciente', 'Edad', 'Sexo', 'Prioridad', 'Derivación', 'Hospital', 'Respuesta (min)', 'Alertas', 'Estatus'];
  const tr = r => `<tr>${[r.folio, r.fecha, r.hora_llamada, r.unidad, r.autor, r.motivo, r.paciente, r.edad, r.sexo, r.prioridad, DERIV[r.derivacion] || '', r.hospital, r.resp_min, r.alertas, r.estatus].map(v => `<td>${esc(v ?? '')}</td>`).join('')}</tr>`;
  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1"><tr>${cab.map(c => `<th style="background:#0b1f4d;color:#fff">${c}</th>`).join('')}</tr>${filas.map(tr).join('')}</table></body></html>`;
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8' })); a.download = nombre; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
