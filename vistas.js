'use strict';
/* =====================================================================
   vistas.js: acceso, pantalla principal, paneles (pacientes, FRAPs, expediente, acceso y control) y arranque
   ===================================================================== */
let PANEL = null;                          // panel abierto: 'pac' | 'fraps' | 'exp' | 'acc'
const EXP = { per: '30', persona: '', q: '', chip: '' };
const ECG = '<svg class="ecg" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 32 H110 L120 30 L128 8 L140 54 L150 16 L158 32 H260 L268 30 L276 12 L286 50 L294 22 L300 32 H400"/></svg>';
let FICHA_ABIERTA = true;
let _instalar = null;

/* ---------- ventanas ---------- */
function modal({ titulo, html, botones = [], ancho = 520, alAbrir, alCerrar, clase = '' }) {
  const bg = document.createElement('div'); bg.className = 'mbg';
  bg.innerHTML = `<div class="mdl ${clase}" style="max-width:${ancho}px"><header><h3>${titulo}</h3><button type="button" class="mx" data-x>✕</button></header><div class="mbody">${html}</div>${botones.length ? `<footer>${botones.map(([t, c], i) => `<button type="button" class="btn ${c}" data-b="${i}">${t}</button>`).join('')}</footer>` : ''}</div>`;
  $('#modales').appendChild(bg);
  const cerrar = () => { if (bg.isConnected) { bg.remove(); alCerrar && alCerrar(); } };
  bg.addEventListener('mousedown', e => { if (e.target === bg) cerrar(); });
  bg.addEventListener('click', async e => {
    if (e.target.closest('[data-x]')) return cerrar();
    const b = e.target.closest('[data-b]');
    if (b) { const f = botones[+b.dataset.b][2]; const r = f ? await f(bg) : true; if (r !== false) { if (bg.isConnected) bg.remove(); } }
  });
  alAbrir && alAbrir(bg);
  return cerrar;
}
function confirmar(html, ok = 'Aceptar', cancel = 'Cancelar', titulo = 'Confirmar') {
  return new Promise(res => {
    let hecho = false; const fin = v => { if (!hecho) { hecho = true; res(v); } };
    modal({ titulo, html: `<p class="msg">${html}</p>`, ancho: 440, alCerrar: () => fin(false), botones: [[cancel, 'gris', () => { fin(false); }], [ok, 'azul', () => { fin(true); }]] });
  });
}

/* ---------- identidad: SIRAP (escudo + montaña + pulso + hoja de cafeto) ---------- */
const logoVec = () => `<svg viewBox="0 0 64 64" class="estrella" aria-hidden="true"><defs><linearGradient id="lgA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1d4aa8"/><stop offset="1" stop-color="#0b2a63"/></linearGradient><linearGradient id="lgB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb15a"/><stop offset="1" stop-color="#e8650d"/></linearGradient></defs><path d="M32 3 L57 17 V44 L32 61 L7 44 V17 Z" fill="url(#lgA)" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 43 L25 25 L32 34 L40 22 L52 43 Z" fill="url(#lgB)"/><path d="M9 47 H22 L27 38 L33 54 L38 43 L42 47 H55" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" class="pulso-l"/><path d="M32 8 C39 8 43 15 39 21 C33 20 29 14 32 8 Z" fill="#37b36f"/><path d="M33 10 Q35 15 36 19" stroke="#0f6a3b" stroke-width="1" fill="none"/></svg>`;
/* logos: imagenes/logo-app.png (celular) y imagenes/logo-escritorio.png (computadora); si faltan, el logo vectorial de respaldo */
const logoSVG = () => `<img class="estrella logo-app" src="imagenes/logo-app.png" alt="" onerror="this.outerHTML=logoVec()">`;
const marca = () => `<div class="marca"><div class="m-app">${logoSVG()}<div class="mtxt"><b>SIRAP</b><span>IXHUATLÁN DEL CAFÉ</span></div></div><div class="m-esc"><img class="logo-esc" src="imagenes/logo-escritorio.png" alt="SIRAP · Protección Civil · Ixhuatlán del Café" onerror="this.parentNode.previousElementSibling.classList.add('solo');this.parentNode.remove()"></div></div>`;

/* ---------- acceso (modo nube) ---------- */
function pintarLogin(aviso, modo = 'entrar') {
  $('#app').innerHTML = `<div class="login"><div class="login-izq">${marca()}<h1>Cada atención,<br><span>bien registrada.</span></h1><p>Sistema Integral de Registro de Atención Prehospitalaria de Protección Civil Municipal.</p>
    <ul><li><b>📋 Del llamado a la entrega</b><small>Cronología, valoración, signos vitales, lesiones y firmas en un solo expediente.</small></li><li><b>🧭 Cada quien, lo suyo</b><small>La coordinación define quién entra y qué puede ver o corregir.</small></li><li><b>📶 También en la sierra</b><small>Si no hay señal se guarda en el equipo y se envía al volver.</small></li></ul>
    <em>H. Ayuntamiento de Ixhuatlán del Café, Veracruz · Protección Civil</em></div>
    <form class="login-der" id="frmLogin" autocomplete="on"><h2>${modo === 'entrar' ? 'ENTRAR A SIRAP' : modo === 'activar' ? 'ACTIVAR MI CUENTA' : 'RECUPERAR CONTRASEÑA'}</h2>
    <p class="sub">${modo === 'entrar' ? 'Entre con la cuenta que le asignó su institución.' : modo === 'activar' ? 'Use el mismo correo con el que lo invitó el administrador y elija su contraseña. (El primer registro del sistema queda como administrador principal.)' : 'Le enviaremos un enlace para elegir una contraseña nueva.'}</p>
    ${aviso ? `<div class="aviso-l">${esc(aviso)}</div>` : ''}
    ${modo === 'activar' ? `<label class="fld"><span>Nombre completo</span><div class="in"><input id="lgN" required autocomplete="name"></div></label>` : ''}
    <label class="fld"><span>Correo electrónico</span><div class="in"><input id="lgC" type="email" required autocomplete="username" inputmode="email"></div></label>
    ${modo !== 'recuperar' ? `<label class="fld"><span>Contraseña</span><div class="in"><input id="lgP" type="password" required minlength="6" autocomplete="${modo === 'entrar' ? 'current-password' : 'new-password'}"><button type="button" class="ojo-b" id="lgV">👁</button></div></label>` : ''}
    ${modo === 'activar' ? `<label class="fld"><span>Repita la contraseña</span><div class="in"><input id="lgP2" type="password" required minlength="6" autocomplete="new-password"></div></label>` : ''}
    <button class="btn rojo grande" type="submit">${modo === 'entrar' ? 'Entrar' : modo === 'activar' ? '✔ ACTIVAR CUENTA' : 'ENVIAR ENLACE'}</button>
    <div class="login-links">${modo === 'entrar' ? `<a href="#" data-lg="recuperar">¿Olvidó su contraseña?</a><a href="#" data-lg="activar">¿Lo invitaron? Activar mi cuenta</a>` : `<a href="#" data-lg="entrar">← Volver a iniciar sesión</a>`}</div></form></div>`;
  const frm = $('#frmLogin');
  frm.addEventListener('click', e => { const a = e.target.closest('[data-lg]'); if (a) { e.preventDefault(); pintarLogin('', a.dataset.lg); } if (e.target.id === 'lgV') { const p = $('#lgP'); p.type = p.type === 'password' ? 'text' : 'password'; } });
  frm.addEventListener('submit', async e => {
    e.preventDefault(); const btn = frm.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      const c = $('#lgC').value;
      if (modo === 'entrar') { await Auth.entrar(c, $('#lgP').value); await entrarConSesion(); }
      else if (modo === 'recuperar') { await Auth.recuperar(c); pintarLogin('Listo: si el correo existe, recibirá un enlace.', 'entrar'); }
      else {
        if ($('#lgP').value !== $('#lgP2').value) throw new Error('Las contraseñas no coinciden');
        const hayRed = await Auth.registrar(c, $('#lgP').value, $('#lgN').value.trim());
        if (hayRed) await entrarConSesion(); else pintarLogin('Cuenta creada. Revise su correo y confirme la cuenta; después inicie sesión.', 'entrar');
      }
    } catch (err) { pintarLogin(err.status === 0 ? 'Sin conexión con el servidor. Revise su internet.' : err.message, modo); }
  });
}
async function entrarConSesion() {
  try { await cargarPerfil(); await arrancar(); }
  catch (e) {
    if (e.sinPerfil) { Auth.salir(); pintarLogin('Esta cuenta aún no tiene una invitación. Pida al administrador que lo invite con este correo.'); }
    else if (e.suspendido) { Auth.salir(); pintarLogin('Su acceso está ' + e.suspendido + '. Consulte al administrador.'); }
    else { pintarLogin(e.message); }
  }
}
async function cargarPerfil() {
  try {
    const r = await api(`/rest/v1/frap_perfiles?id=eq.${S.ses.uid}&select=*`);
    if (!r || !r[0]) throw Object.assign(new Error('sin perfil'), { sinPerfil: true });
    if (r[0].estado !== 'activo') throw Object.assign(new Error('acceso'), { suspendido: r[0].estado });
    S.user = r[0]; LS.set('perfil:' + S.ses.uid, r[0]);
    api(`/rest/v1/frap_perfiles?id=eq.${S.ses.uid}`, { m: 'PATCH', body: { ultimo_acceso: new Date().toISOString() }, h: { Prefer: 'return=minimal' } }).catch(() => { });
  } catch (e) {
    if (e.status === 0) { const p = LS.get('perfil:' + S.ses.uid, null); if (p) { S.user = p; return; } }
    throw e;
  }
}

/* ---------- pantalla principal ---------- */
const mismoMes = (iso, ref) => String(iso || '').slice(0, 7) === ref;
function pacientesUnicos() {
  const m = new Map();
  S.regs.filter(r => r.paciente).forEach(r => {
    const k = sinAcentos(r.paciente) + '|' + (r.edad || '') + '|' + (r.sexo || '');
    const x = m.get(k) || { nombre: r.paciente, edad: r.edad, sexo: r.sexo, n: 0, ultimo: r };
    x.n++; if ((r.fecha || '') >= (x.ultimo.fecha || '')) x.ultimo = r; m.set(k, x);
  });
  return [...m.values()].sort((a, b) => (b.ultimo.fecha || '').localeCompare(a.ultimo.fecha || ''));
}
function htmlFicha() {
  const u = S.unidad || unidadVacia();
  const logo = u.logo ? `<img src="${u.logo}" alt="">` : `<span class="lg-s">${esc(u.siglas || 'PC')}</span>`;
  const dato = (l, v) => v ? `<span><small>${l}</small> ${esc(v)}</span>` : '';
  return `<div class="ficha"><div class="f-top">${logo}<div class="f-n"><b>${esc(u.institucion)}</b><span>${dato('UNIDAD', u.unidad)} ${dato('TIPO', u.tipo)}</span></div><div class="f-b">${can('editar_unidad') ? `<button type="button" class="btn blanco ch" data-act="fichaEditar">✎ Editar</button>` : ''}<button type="button" class="btn azul ch" data-act="fichaVer">${FICHA_ABIERTA ? '⌃ Ocultar ficha' : '⌄ Ver ficha'}</button></div></div>
  ${FICHA_ABIERTA ? `<div class="f-d"><div>${dato('PLACAS', u.placas)}${dato('TURNO', u.turno)}${dato('CABINA', u.cabina)}${dato('RADIO', u.radio)}</div><div>${dato('TAMP', u.tamp)}${dato('OPERADOR', u.operador)}${dato('COPILOTO', u.copiloto)}${dato('BASE', u.base)}</div></div>` : ''}</div>`;
}
function htmlTiles() {
  const mes = hoy().slice(0, 7), hoyS = hoy();
  const pac = pacientesUnicos().length, total = S.regs.length, delMes = S.regs.filter(r => mismoMes(r.fecha, mes)).length, hoyN = S.regs.filter(r => r.fecha === hoyS).length;
  const activos = S.integrantes.filter(i => i.estado === 'activo').length;
  const t = [];
  if (can('ver_pacientes')) t.push(`<button type="button" class="tile-h azul" data-panel="pac"><i class="ti"><img src="imagenes/iconos/sec-paciente.png" alt="" onerror="this.replaceWith(document.createTextNode('🧑'))"></i><span><small>PACIENTES REGISTRADOS</small><em>${pac} paciente${pac === 1 ? '' : 's'}</em></span><b>${pac}</b></button>`);
  t.push(`<button type="button" class="tile-h rojo" data-panel="fraps"><i class="ti"><img src="imagenes/iconos/ini-fraps.png" alt="" onerror="this.replaceWith(document.createTextNode('📄'))"></i><span><small>FRAPS REALIZADOS</small><em>${delMes} este mes</em></span><b>${total}</b></button>`);
  if (can('ver_expediente')) t.push(`<button type="button" class="tile-h morado" data-panel="exp"><i class="ti"><img src="imagenes/iconos/ini-expediente.png" alt="" onerror="this.replaceWith(document.createTextNode('📊'))"></i><span><small>EXPEDIENTE CENTRAL</small><em>${hoyN} hoy · todo el personal</em></span><b>${total}</b></button>`);
  if (can('ver_integrantes') || can('invitar')) t.push(`<button type="button" class="tile-h gris" data-panel="acc"><i class="ti"><img src="imagenes/iconos/ini-acceso.png" alt="" onerror="this.replaceWith(document.createTextNode('🔐'))"></i><span><small>ACCESO Y CONTROL</small><em>${esc(S.user.nombre.split(' ')[0])} · ${ROLES[S.user.rol].n}${S.user.principal ? ' principal' : ''}</em></span><b>${activos}</b></button>`);
  return t.join('');
}
function htmlReloj() { const d = new Date(); return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES_L[d.getMonth()]} de ${d.getFullYear()} <i>|</i> <b>${p2(d.getHours())}:${p2(d.getMinutes())}</b>`; }
function pintarApp() {
  $('#app').innerHTML = `<div class="banner"><div class="b-izq">${marca()}<p class="lema">Sistema Integral de Registro de Atención Prehospitalaria</p><div class="b-pie"><span class="en-serv" id="enServ" hidden>SERVICIO EN CURSO</span><div class="sync" id="sync"></div><div class="reloj-g" id="relojG">${htmlReloj()}</div></div></div><div class="b-der"><button type="button" id="btnSinc" class="btn-sinc" data-act="sincronizar" title="Traer lo que se guardó desde los teléfonos"><i>⟳</i><span>SINCRONIZAR<br>CON TELÉFONO</span></button><button type="button" class="btn blanco ch" id="btnInst" ${_instalar ? '' : 'hidden'}>⬇ Instalar app</button><button type="button" class="usr" data-act="cuenta"><span class="av" style="background:${colorDe(S.user.nombre)}">${esc(iniciales(S.user.nombre))}</span><span><b>${esc(S.user.nombre)}</b><small>${ROLES[S.user.rol].n}</small></span></button></div></div>
    <div class="tiles-h" id="tilesH">${htmlTiles()}</div><div id="fichaU">${htmlFicha()}</div><main id="form"></main>
    <div id="panel" class="panel" hidden></div>
    <div class="flot-g">    <button type="button" id="flot" class="flot" data-act="avance" title="Guardar avance"><svg viewBox="0 0 60 60" aria-hidden="true"><g fill="#2f6fe4" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"><rect x="25" y="3" width="10" height="54" rx="3"/><rect x="25" y="3" width="10" height="54" rx="3" transform="rotate(60 30 30)"/><rect x="25" y="3" width="10" height="54" rx="3" transform="rotate(120 30 30)"/></g></svg><b>0%</b><span>GUARDAR<br>AVANCE</span></button></div>`;
  pintarSync(); animarNumeros(); if (typeof pintarProgreso === 'function' && F) pintarProgreso(); sirena();
}
/* Sirena del encabezado: se enciende (azul y naranja) mientras hay un servicio en curso, o sea, con la llamada registrada y sin llegar a base */
function sirena() {
  const b = $('.banner'); if (!b) return;
  const activo = !!(typeof F !== 'undefined' && F && F.t_llamada && !F.t_base);
  b.classList.toggle('sirena', activo);
  const t = $('#enServ'); if (t) t.hidden = !activo;
}
let _prevTiles = [];
function animarNumeros() {
  $$('#tilesH .tile-h b').forEach((b, i) => {
    const n = +b.textContent; if (isNaN(n)) return; const desde = _prevTiles[i] ?? 0; _prevTiles[i] = n; if (desde === n) return;
    const t0 = performance.now(); const paso = t => { const k = Math.min(1, (t - t0) / 800); b.textContent = Math.round(desde + (n - desde) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(paso); }; b.textContent = desde; requestAnimationFrame(paso);
  });
}
function actualizarInicio() {
  const a = $('#tilesH'); if (a) { a.innerHTML = htmlTiles(); animarNumeros(); }
  const f = $('#fichaU'); if (f) f.innerHTML = htmlFicha();
  const r = $('#relojG'); if (r) r.innerHTML = htmlReloj();
  pintarSync(); sirena();
}
/* Botón «Sincronizar con teléfono» (escritorio): trae al instante lo que el personal registró desde los celulares */
async function sincronizarAhora() {
  if (!NUBE) { toast('Sin la nube no hay teléfonos con quién sincronizar'); return; }
  if (!navigator.onLine) { toast('Sin internet por ahora'); return; }
  const b = $('#btnSinc'); if (b) b.classList.add('sincronizando');
  try {
    await Datos.sincronizar(true); refrescarVistas(); await vigilarOtroDispositivo();
    toast(`☁ Sincronizado con los teléfonos · ${horaAhora()}`);
  } catch (e) { toast('No se pudo sincronizar: ' + e.message, 5000); }
  finally { if (b) b.classList.remove('sincronizando'); }
}
function refrescarVistas() { actualizarInicio(); if (PANEL) pintarPanel(); }

/* ---------- paneles ---------- */
const PANELES = {
  pac: { t: 'Pacientes registrados', ico: '🧑', cls: 'azul' }, fraps: { t: 'FRAPs realizados', ico: '📄', cls: 'rojo' },
  exp: { t: 'Expediente central', ico: '📈', cls: 'morado' }, acc: { t: 'Acceso y control', ico: '👥', cls: 'azulm' }
};
function abrirPanel(id) { PANEL = id; const p = $('#panel'); p.hidden = false; document.body.classList.add('con-panel'); if (id === 'acc') cargarAcceso(); pintarPanel(); }
function cerrarPaneles() { PANEL = null; const p = $('#panel'); if (p) { p.hidden = true; p.innerHTML = ''; } document.body.classList.remove('con-panel'); }
async function cargarAcceso() { try { if (NUBE && navigator.onLine) { await Datos.sincronizar(false); } } catch (e) { } if (PANEL === 'acc') pintarPanel(); }
function pintarPanel() {
  const p = $('#panel'); if (!p || !PANEL) return; const d = PANELES[PANEL];
  const scroll = p.querySelector('.p-cuerpo')?.scrollTop || 0;
  let sub = '', cuerpo = '', ex = '';
  if (PANEL === 'pac') { const n = pacientesUnicos().length; sub = `${n} paciente${n === 1 ? '' : 's'} · ${can('ver_otros') ? 'todo el personal' : 'sus FRAPs'}`; cuerpo = htmlPacientes(); }
  if (PANEL === 'fraps') { const l = filtrarFRAPs(); sub = `${l.length} FRAP${l.length === 1 ? '' : 's'}`; cuerpo = htmlListaFRAPs(); }
  if (PANEL === 'exp') { const l = filtrarExp(); sub = `${l.length} FRAPs en el periodo · ${EXP.persona ? esc((S.regs.find(r => r.creado_por === EXP.persona) || {}).autor || '') : 'todo el personal'}`; cuerpo = htmlExpediente(l); if (can('exportar')) ex = `<button type="button" class="btn blanco ch" data-act="exportar">📊 Exportar</button>`; }
  if (PANEL === 'acc') { sub = 'Quién puede ingresar y qué puede hacer cada integrante'; cuerpo = htmlAcceso(); }
  p.innerHTML = `<div class="p-wrap ${d.cls}"><header class="p-h"><span class="p-i">${d.ico}</span><div><h2>${d.t.toUpperCase()}</h2><p>${sub}</p></div>${ex}<button type="button" class="btn blanco ch" data-act="cerrarPanel">✕</button></header><div class="p-cuerpo">${cuerpo}</div></div>`;
  const c = p.querySelector('.p-cuerpo'); if (c) c.scrollTop = scroll;
}
const claseMotivo = m => ({ Enfermedad: 'Clínica', Traumatismo: 'Trauma', Ginecoobstétrico: 'Ginecoobstétrico' }[m] || m || '');
const icoMotivo = m => ({ Enfermedad: '🩺', Traumatismo: '🚑', Ginecoobstétrico: '🤰' }[m] || '•');
function tarjetaFRAP(r) {
  const der = { hospital: r.hospital ? '🏥 ' + r.hospital : '🏥 Traslado', hogar: '🏠 Se queda en su hogar', alta: '🚶 Alta en el sitio', negativa: '✋ Negativa de traslado' }[r.derivacion] || '';
  return `<div class="fcard ${r.prioridad || ''}" data-frap="${esc(r.id)}"><div class="fc-top"><b>${esc(r.paciente || 'Sin nombre')}</b><span class="resp"><b>${r.resp_min != null ? r.resp_min + ' min' : '—'}</b><small>respuesta</small></span></div>
    <div class="fc-tags"><span class="tg m">${icoMotivo(r.motivo)} ${esc(claseMotivo(r.motivo) || 'Sin motivo')}</span>${der ? `<span class="tg d">${esc(der)}</span>` : ''}${r.alertas ? `<span class="tg w">⚠ ${r.alertas}</span>` : ''}<span class="tg e ${r.estatus}">${{ borrador: 'Borrador', cerrado: 'Por revisar', revisado: 'Revisado' }[r.estatus] || r.estatus}</span></div>
    <div class="fc-meta">${esc(r.folio || 'sin folio')} · ${fFecha(r.fecha)}${r.hora_llamada ? ' · ' + r.hora_llamada : ''}${r.unidad ? ' · ' + esc(r.unidad) : ''}</div><div class="fc-au">👤 ${esc(r.autor || '')}</div></div>`;
}
const ordenarFRAPs = l => l.sort((a, b) => ((b.fecha || '') + (b.hora_llamada || '')).localeCompare((a.fecha || '') + (a.hora_llamada || '')) || (b.creado_en || '').localeCompare(a.creado_en || ''));
function filtrarFRAPs() {
  const q = sinAcentos(EXP.q || '');
  return ordenarFRAPs(S.regs.filter(r => !q || sinAcentos([r.paciente, r.folio, r.autor, r.motivo, r.hospital].join(' ')).includes(q)));
}
function htmlListaFRAPs() {
  const l = filtrarFRAPs();
  return `<div class="p-bus"><input type="search" id="busq" placeholder="Buscar por paciente, folio, paramédico…" value="${esc(EXP.q)}"></div><div class="fgrid">${l.map(tarjetaFRAP).join('') || '<p class="vacio">Aún no hay FRAPs.</p>'}</div>`;
}
function htmlPacientes() {
  const q = sinAcentos(EXP.q || ''); const l = pacientesUnicos().filter(p => !q || sinAcentos(p.nombre).includes(q));
  return `<div class="p-bus"><input type="search" id="busq" placeholder="Buscar paciente…" value="${esc(EXP.q)}"></div><div class="tabla-w"><table class="tbl"><thead><tr><th>Paciente</th><th>Edad</th><th>Sexo</th><th>Atenciones</th><th>Último servicio</th><th>Motivo</th></tr></thead><tbody>${l.map(p => `<tr data-frap="${esc(p.ultimo.id)}"><td><b>${esc(p.nombre)}</b></td><td>${esc(p.edad || '')}</td><td>${esc(p.sexo || '')}</td><td>${p.n}</td><td>${fFecha(p.ultimo.fecha)}</td><td>${esc(claseMotivo(p.ultimo.motivo))}</td></tr>`).join('') || '<tr><td colspan="6" class="vacio">Sin pacientes todavía.</td></tr>'}</tbody></table></div>`;
}
const diasAtras = n => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
function enPeriodo(r) { const f = r.fecha || ''; if (EXP.per === 'hoy') return f === hoy(); if (EXP.per === '7') return f >= diasAtras(6); if (EXP.per === '30') return f >= diasAtras(29); return true; }
function baseExp() { const q = sinAcentos(EXP.q || ''); return S.regs.filter(r => enPeriodo(r) && (!EXP.persona || r.creado_por === EXP.persona) && (!q || sinAcentos([r.paciente, r.folio, r.autor].join(' ')).includes(q))); }
function filtrarExp() { return ordenarFRAPs(baseExp().filter(r => !EXP.chip || r.motivo === EXP.chip || r.prioridad === EXP.chip)); }
const prom = (l, k) => { const v = l.map(r => r[k]).filter(x => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
function barras(items, color) { const mx = Math.max(1, ...items.map(i => i[1])); return items.map(([n, v, c]) => `<div class="bh"><span>${esc(n)}</span><div><i style="width:${Math.round(v / mx * 100)}%;background:${c || color}"></i></div><b>${v}</b></div>`).join(''); }
function htmlExpediente(lista) {
  const base = baseExp(), n = base.length;
  const periodoBase = S.regs.filter(enPeriodo);
  const rojos = base.filter(r => r.prioridad === 'rojo').length, resp = prom(base, 'resp_min'), sit = prom(base, 'sitio_min');
  const conDer = base.filter(r => r.derivacion), tras = conDer.filter(r => r.derivacion === 'hospital').length;
  const pTras = conDer.length ? Math.round(tras / conDer.length * 100) : null, porRev = base.filter(r => r.estatus === 'cerrado').length;
  const mot = [['Traumatismo', '#dc2626'], ['Enfermedad', '#2563eb'], ['Ginecoobstétrico', '#a855f7']].map(([m, c]) => [m, base.filter(r => r.motivo === m).length, c]);
  const totM = mot.reduce((a, x) => a + x[1], 0); let acc = 0;
  const donut = totM ? mot.map(([m, v, c]) => { const a = acc / totM * 100; acc += v; return `${c} ${a}% ${acc / totM * 100}%`; }).join(',') : '#e2e8f0 0 100%';
  const tri = TRIAGE.map(([k, nm]) => [nm[0] + nm.slice(1).toLowerCase(), base.filter(r => r.prioridad === k).length, { rojo: '#dc2626', amarillo: '#eab308', verde: '#22a35a', negro: '#1f2937' }[k]]);
  const hora = Array(24).fill(0); base.forEach(r => { const h = parseInt(String(r.hora_llamada || '').slice(0, 2)); if (!isNaN(h)) hora[h]++; }); const mxH = Math.max(1, ...hora);
  const dia = Array(7).fill(0); base.forEach(r => { if (r.fecha) { const [y, m, d] = r.fecha.split('-').map(Number); dia[(new Date(y, m - 1, d).getDay() + 6) % 7]++; } }); const mxD = Math.max(1, ...dia);
  const hosp = {}; base.filter(r => r.derivacion === 'hospital' && r.hospital).forEach(r => hosp[r.hospital] = (hosp[r.hospital] || 0) + 1);
  const hospL = Object.entries(hosp).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const cal = base.filter(r => r.revisar).slice(0, 8);
  const porP = new Map(); periodoBase.forEach(r => { const k = r.creado_por; const x = porP.get(k) || { id: k, nombre: r.autor || '—', n: 0, sum: 0, nr: 0, rojos: 0, rev: 0, ult: '' }; x.n++; if (r.resp_min != null) { x.sum += r.resp_min; x.nr++; } if (r.prioridad === 'rojo') x.rojos++; if (r.estatus === 'cerrado') x.rev++; if ((r.fecha || '') > x.ult) x.ult = r.fecha; porP.set(k, x); });
  const filas = [...porP.values()].sort((a, b) => b.n - a.n);
  const chips = [['', 'Todos'], ['Traumatismo', '🚑 Trauma'], ['Enfermedad', '🩺 Clínica'], ['Ginecoobstétrico', '🤰 Gineco'], ['rojo', '● Rojo'], ['amarillo', '● Amarillo'], ['verde', '● Verde'], ['negro', '● Negro']];
  const kp = (v, l, c) => `<div class="kp ${c}"><b>${v}</b><small>${l}</small></div>`;
  return `<div class="periodo">${[['hoy', 'Hoy'], ['7', '7 días'], ['30', '30 días'], ['todo', 'Todo']].map(([k, l]) => `<button type="button" class="${EXP.per === k ? 'on' : ''}" data-per="${k}">${l}</button>`).join('')}<input type="search" id="busq" placeholder="Buscar paciente, folio o paramédico…" value="${esc(EXP.q)}">${EXP.persona ? `<button type="button" class="btn gris ch" data-act="expQuitar">✕ Quitar filtro de paramédico</button>` : ''}</div>
  <div class="kpis">${kp(n, 'FRAPs', 'az')}${kp(rojos, 'Rojos', 'rj')}${kp(resp != null ? resp + ' min' : '—', 'Respuesta promedio', 'vi')}${kp(sit != null ? sit + ' min' : '—', 'En el sitio promedio', 'cy')}${kp(pTras != null ? pTras + '%' : '—', 'Trasladados', 'vd')}${kp(porRev, 'Por revisar', 'am')}</div>
  <div class="graf">
   <div class="gr-card"><h5>MOTIVO DE ATENCIÓN</h5><div class="donut-w"><div class="donut" style="background:conic-gradient(${donut})"><b>${totM}</b></div><ul>${mot.map(([m, v, c]) => `<li><i style="background:${c}"></i>${m === 'Enfermedad' ? 'Clínica' : m === 'Traumatismo' ? 'Trauma' : 'Gineco'} <b>${totM ? Math.round(v / totM * 100) : 0}%</b></li>`).join('')}</ul></div></div>
   <div class="gr-card"><h5>PRIORIDAD DE TRIAGE</h5>${barras(tri)}</div>
   <div class="gr-card"><h5>SERVICIOS POR HORA <small>hora de llamada</small></h5><div class="hbars">${hora.map((v, h) => `<div title="${p2(h)}:00 · ${v}"><i style="height:${Math.round(v / mxH * 100)}%"></i>${h % 6 === 0 ? `<small>${p2(h)}</small>` : ''}</div>`).join('')}</div></div>
   <div class="gr-card"><h5>POR DÍA DE LA SEMANA</h5><div class="dbars">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((l, i) => `<div title="${dia[i]}"><i style="height:${Math.round(dia[i] / mxD * 100)}%"></i><small>${l}</small></div>`).join('')}</div></div>
   <div class="gr-card"><h5>HOSPITALES DE DESTINO</h5>${hospL.length ? barras(hospL, '#1d5fd6') : '<p class="muted">Sin traslados en el periodo</p>'}</div>
   <div class="gr-card"><h5>CALIDAD DEL REGISTRO <small>${cal.length ? 'por revisar' : 'todo en orden'}</small></h5><div class="cal">${cal.map(r => `<div data-frap="${esc(r.id)}"><b>${esc(r.folio || 'sin folio')} · ${esc(r.paciente || 'Sin nombre')}</b><small>${esc(r.revisar)}</small></div>`).join('') || '<p class="muted">Ningún FRAP con avisos 👍</p>'}</div></div>
  </div>
  <h4 class="p-t">👥 DESEMPEÑO POR PARAMÉDICO <small>toque una fila para filtrar</small></h4>
  <div class="tabla-w"><table class="tbl pm"><thead><tr><th>Paramédico</th><th>FRAPs</th><th>Respuesta prom.</th><th>Rojos</th><th>Por revisar</th><th>Último</th></tr></thead><tbody>${filas.map(x => `<tr data-persona="${esc(x.id)}" class="${EXP.persona === x.id ? 'sel' : ''}"><td><span class="av s" style="background:${colorDe(x.nombre)}">${esc(iniciales(x.nombre))}</span> <b>${esc(x.nombre)}</b></td><td><b>${x.n}</b></td><td>${x.nr ? Math.round(x.sum / x.nr) + ' min' : '—'}</td><td>${x.rojos}</td><td>${x.rev}</td><td>${fFecha(x.ult)}</td></tr>`).join('') || '<tr><td colspan="6" class="vacio">Sin información.</td></tr>'}</tbody></table></div>
  <h4 class="p-t">📋 FRAPS DEL PERIODO</h4><div class="chips-f">${chips.map(([k, l]) => `<button type="button" class="${EXP.chip === k ? 'on' : ''}" data-chip="${k}">${l}</button>`).join('')}</div><div class="fgrid">${lista.map(tarjetaFRAP).join('') || '<p class="vacio">No hay FRAPs con ese filtro.</p>'}</div>`;
}
/* detalle de un FRAP (desde tarjetas) */
function htmlDetalle(d, r) {
  const dd = d || {}; const tg = TRIAGE.find(t => t[0] === r.prioridad);
  const cr = T_MOMENTOS.map(([k, l, i, c]) => dd[k] ? `<span class="cr ${c}"><small>${l}</small>${esc(dd[k])}</span>` : '').join('');
  const blk = (t, rows) => `<div class="dbk"><h6>${t}</h6>${rows.filter(x => x[1]).map(([a, b]) => `<p><small>${a}</small>${esc(b)}</p>`).join('') || '<p class="muted">—</p>'}</div>`;
  const t0 = (dd.tomas || [])[0] || {}, gt = glasgowTot(dd), rr = rts(dd);
  const les = {}; (dd.lesiones || []).forEach(m => { const k = m.t + ' · ' + VISTAS[m.v]; les[k] = (les[k] || 0) + 1; });
  const tr = [listaTxt(dd, 'tr_via'), listaTxt(dd, 'tr_cervical'), listaTxt(dd, 'tr_vent'), dd.tr_o2 ? otrosTxt(dd, 'tr_o2') + ' ' + (dd.tr_o2_flujo ?? '') + ' L/min' : '', listaTxt(dd, 'tr_hemo'), dd.iv_n ? `${dd.iv_n} vía IV ${dd.iv_cal || ''}` : '', ...(dd.meds || []).filter(m => m.med).map(m => `${m.med} ${m.dosis || ''}`)].filter(Boolean).join(' · ');
  const firmas = ['firma_pac', 'firma_acomp', 'firma_entrega', 'firma_medico', 'firma_pert'].filter(k => dd[k]);
  return `${r.revisar ? `<div class="rev">⚠ <b>Revisar:</b> ${esc(r.revisar)}</div>` : ''}${cr ? `<div class="crs">${cr}</div>` : ''}
  <div class="dgrid">${blk('🚑 Servicio', [['Motivo', claseMotivo(r.motivo)], ['Lugar', otrosTxt(dd, 'lugar')], ['Dirección', [dd.calle, dd.colonia].filter(Boolean).join(', ')], ['Unidad', r.unidad], ['Respuesta', r.resp_min != null ? r.resp_min + ' min' : ''], ['En el sitio', r.sitio_min != null ? r.sitio_min + ' min' : '']])}
  ${blk('🧑 Paciente', [['Nombre', r.paciente], ['Edad / sexo', [r.edad ? r.edad + ' años' : '', r.sexo].filter(Boolean).join(' · ')], ['Derechohabiente', otrosTxt(dd, 'derechohab')]])}
  ${blk('📈 Valoración', [['Prioridad', tg ? tg[1] + ' · ' + tg[2] : ''], ['Glasgow', gt != null ? gt + '/15' : ''], ['Trauma score', rr.total != null ? rr.total + '/12' : ''], ['Signos (toma 1)', [t0.fr && 'FR ' + t0.fr, t0.fc && 'FC ' + t0.fc, t0.tas && 'TA ' + t0.tas + '/' + (t0.tad || '?'), t0.sao2 && 'SaO₂ ' + t0.sao2 + '%'].filter(Boolean).join(' · ')]])}
  ${blk('🧍 Lesiones', Object.keys(les).map(k => [k, les[k] > 1 ? '×' + les[k] : '']).concat(Object.keys(les).length ? [] : [['', '']]))}
  ${blk('💉 Tratamiento', [['', tr]])}
  ${blk('🏥 Traslado y entrega', [['Derivación', DERIV[r.derivacion] || ''], ['Hospital', r.hospital], ['Entrega', dd.entrega_nombre], ['Recibe', dd.recibe_medico]])}</div>
  ${firmas.length ? `<div class="dfir"><h6>✍ Firmas</h6>${firmas.map(k => `<img src="${dd[k]}" alt="firma">`).join('')}</div>` : ''}`;
}
async function verDetalle(id) {
  const r = S.regs.find(x => x.id === id); if (!r) return;
  const propio = r.creado_por === S.user.id;
  const puedeAbrir = propio || can('ver_otros') || can('ver_expediente');
  let d = null; try { d = await Datos.abrir(id); } catch (e) { }
  const b = [['Cerrar', 'gris']];
  if (puedeAbrir) b.push([(propio ? can('corregir_propios') : can('corregir_otros')) ? '✎ Abrir para corregir' : '👁 Abrir (solo lectura)', 'azul', () => { abrirFRAP(id); }]);
  if (can('pdf') && d) b.push(['📄 Generar FRAP PDF', 'azul2', () => { try { guardarPDF(construirPDF(d, r), (r.folio || 'FRAP') + '.pdf').catch(e => toast('No se pudo generar el PDF: ' + e.message)); Datos.log('Generó PDF', r.folio || ''); } catch (e) { toast('No se pudo generar el PDF: ' + e.message); } return false; }]);
  if (can('compartir') && d) b.push(['📤 Compartir resumen', 'azul2', () => { compartirTexto(resumenTexto(d, r), 'FRAP ' + (r.folio || '')); return false; }]);
  if (can('corregir_otros') && r.estatus !== 'borrador') b.push([r.estatus === 'revisado' ? '↩ Quitar revisado' : '✔ Marcar revisado', 'verde', async () => { try { await Datos.marcarRevisado(id, r.estatus !== 'revisado'); Datos.log('Revisó un FRAP', r.folio || ''); pintarPanel(); actualizarInicio(); } catch (e) { toast('No se pudo: ' + e.message); } }]);
  if (can('eliminar')) b.push(['🗑 Eliminar', 'rojo', async () => { if (await confirmar('¿Eliminar este FRAP de forma definitiva?', 'Eliminar')) { try { await Datos.eliminar(id); Datos.log('Eliminó un FRAP', r.folio || ''); pintarPanel(); actualizarInicio(); } catch (e) { toast('No se pudo eliminar: ' + e.message); } } else return false; }]);
  modal({ titulo: `${esc(r.folio || 'FRAP')} <small>${fFecha(r.fecha)} · ${esc(r.autor || '')}</small>`, html: d ? htmlDetalle(d, r) : `<pre class="resumen">${esc(r.folio || '')}\n${esc(r.paciente || '')}\n(Los detalles se cargan con internet)</pre>`, botones: b, ancho: 760, clase: 'detalle' });
}

/* ---------- acceso y control ---------- */
const ESTADO_TXT = { activo: 'Activo', suspendido: 'Suspendido', cancelado: 'Cancelado' };
const ordenRol = { admin: 0, coordinador: 1, paramedico: 2, operador: 3 };
function htmlAcceso() {
  const ints = [...S.integrantes].sort((a, b) => (b.principal - a.principal) || ordenRol[a.rol] - ordenRol[b.rol] || (a.creado_en || '').localeCompare(b.creado_en || ''));
  const c = e => ints.filter(i => i.estado === e).length;
  const tarj = i => {
    const yo = i.id === S.user.id, n = S.regs.filter(r => r.creado_por === i.id).length;
    return `<div class="int ${i.estado}"><span class="av" style="background:${colorDe(i.nombre)}">${esc(iniciales(i.nombre))}</span><div class="int-d"><b>${esc(i.nombre)} ${yo ? '<span class="rol u">USTED</span>' : ''}</b><div><span class="rol ${i.rol}">${ROLES[i.rol].n.toUpperCase()}</span>${i.principal ? ' <span class="rol p">★ PRINCIPAL</span>' : ''}${personalizado(i) ? ' <span class="rol pz">PERSONALIZADO</span>' : ''}</div><small>${esc(i.cargo || '')}${i.cargo ? ' · ' : ''}Desde ${fFecha(i.incorporacion)} · último acceso ${i.ultimo_acceso ? fDT(i.ultimo_acceso) : '—'} · ${n} FRAP${n === 1 ? '' : 's'}</small></div><div class="int-r"><span class="est ${i.estado}">● ${ESTADO_TXT[i.estado]}</span><button type="button" class="lnk" data-int="${esc(i.id)}">🔑 Ver permisos</button></div></div>`;
  };
  const inv = S.invit.map(v => `<div class="inv"><div><b>${esc(v.nombre)}</b><small>${esc(v.email)} · ${ROLES[v.rol].n}</small></div>${can('invitar') ? `<button type="button" class="lnk" data-invdel="${esc(v.email)}">Cancelar</button>` : ''}</div>`).join('');
  return `${!NUBE ? `<div class="nota">Modo local: esta copia funciona con un solo usuario (administrador). Para trabajar en equipo con cuentas y permisos, conecte Supabase (vea <b>LEEME-NUBE.md</b>).</div>` : ''}
  <div class="cont4"><div class="ct v">${c('activo')}<small>Activos</small></div><div class="ct a">${S.invit.length}<small>Invitaciones pendientes</small></div><div class="ct r">${c('suspendido')}<small>Suspendidos</small></div><div class="ct g">${c('cancelado')}<small>Cancelados</small></div></div>
  <div class="acc-g"><div><div class="acc-h"><h4>👥 INTEGRANTES</h4>${can('ver_actividad') ? `<button type="button" class="btn blanco ch" data-act="actividad">🕘 Actividad</button>` : ''}${can('invitar') && NUBE ? `<button type="button" class="btn azul ch" data-act="invitar">＋ Invitar integrante</button>` : ''}</div>${ints.map(tarj).join('')}</div>
  <aside>${can('invitar') && NUBE ? `<div class="card-i"><h4>＋ INVITAR INTEGRANTE</h4><p>Prepare su rango y sus permisos antes de enviarle la indicación. Nadie recibe acceso completo por defecto.</p><button type="button" class="btn azul" data-act="invitar">→ Comenzar</button></div>` : ''}${inv ? `<div class="card-i"><h4>✉ INVITACIONES PENDIENTES</h4>${inv}</div>` : ''}
  <div class="card-i"><h4>🔑 MIS PERMISOS</h4><p>${S.user.rol === 'admin' ? `Como ${S.user.principal ? 'Administrador principal' : 'Administrador'} tiene todas las funciones del sistema.` : `Rango: ${ROLES[S.user.rol].n}. ${[...S.perms].length} funciones habilitadas.`}</p></div>
  <div class="card-i nube"><h4>☁ ${NUBE ? 'Conectado a la nube' : 'Sin nube (modo local)'}</h4><p>${NUBE ? 'Los permisos se validan en la base de datos en cada operación.' : 'Los datos se guardan solo en este equipo.'}</p></div></aside></div>`;
}
function modalIntegrante(id) {
  const i = S.integrantes.find(x => x.id === id); if (!i) return;
  const ps = permsDe(i);
  const b = [['Cerrar', 'gris']];
  if (NUBE) {
    if (can('modificar_permisos') && !(i.principal && !(i.id === S.user.id))) { b.push(['✎ Editar datos', 'gris', () => { setTimeout(() => editarDatosInt(i), 0); }]); b.push(['⚙ Editar permisos', 'azul', () => { setTimeout(() => editarPermisos(i), 0); }]); }
    if (can('suspender') && i.id !== S.user.id && !i.principal) {
      if (i.estado === 'activo') { b.push(['⏸ Suspender', 'gris', () => cambiarEstado(i, 'suspendido')]); b.push(['⛔ Cancelar acceso', 'rojo', () => cambiarEstado(i, 'cancelado')]); }
      else b.push(['▶ Reactivar', 'verde', () => cambiarEstado(i, 'activo')]);
    }
  }
  modal({
    titulo: '🪪 INTEGRANTE', ancho: 520, botones: b,
    html: `<div class="ficha-i"><span class="av g" style="background:${colorDe(i.nombre)}">${esc(iniciales(i.nombre))}</span><div><h3>${esc(i.nombre)}</h3><span class="rol ${i.rol}">${ROLES[i.rol].n.toUpperCase()}</span> <span class="est ${i.estado}">● ${ESTADO_TXT[i.estado]}</span></div></div>
    <dl class="dl"><dt>CARGO</dt><dd>${esc(i.cargo || '—')}</dd><dt>NIVEL TAMP</dt><dd>${esc(i.nivel_tamp || '—')}</dd><dt>UNIDAD</dt><dd>${esc(i.unidad || '—')}</dd><dt>TELÉFONO</dt><dd>${esc(i.telefono || '—')}</dd><dt>CORREO</dt><dd>${esc(i.email || '—')}</dd><dt>INCORPORACIÓN</dt><dd>${fFechaL(i.incorporacion) || '—'}</dd><dt>ÚLTIMO ACCESO</dt><dd>${i.ultimo_acceso ? fDT(i.ultimo_acceso) : '—'}</dd><dt>FRAPS</dt><dd>${S.regs.filter(r => r.creado_por === i.id).length} realizados</dd></dl>
    <div class="perm"><h4>🔑 PERMISOS</h4><div class="perm-g"><div><b class="si">PUEDE REALIZAR</b>${PERMISOS.filter(p => ps.has(p[0])).map(p => `<p class="si">✔ ${p[1]}</p>`).join('') || '<p class="muted">Nada</p>'}</div><div><b class="no">NO PUEDE REALIZAR</b>${PERMISOS.filter(p => !ps.has(p[0])).map(p => `<p class="no">✖ ${p[1]}</p>`).join('') || '<p class="muted">Nada</p>'}</div></div></div>`
  });
}
async function cambiarEstado(i, est) {
  const txt = { suspendido: 'suspender', cancelado: 'cancelar el acceso de', activo: 'reactivar a' }[est];
  if (!await confirmar(`¿Desea ${txt} <b>${esc(i.nombre)}</b>?`, 'Sí, continuar')) return false;
  try { await api(`/rest/v1/frap_perfiles?id=eq.${i.id}`, { m: 'PATCH', body: { estado: est }, h: { Prefer: 'return=minimal' } }); i.estado = est; Datos.log('Cambió acceso', `${i.nombre}: ${est}`); pintarPanel(); actualizarInicio(); toast('Acceso actualizado'); }
  catch (e) { toast('No se pudo: ' + e.message, 5000); }
}
const selOpts = (ops, v) => ops.map(o => `<option ${o === v ? 'selected' : ''}>${o}</option>`).join('');
function checksPermisos(set) { return `<div class="chk-l">${PERMISOS.map(([k, t]) => `<label><input type="checkbox" data-perm="${k}" ${set.has(k) ? 'checked' : ''}> ${t}</label>`).join('')}</div>`; }
function diffPermisos(rol, root) {
  const base = new Set(ROLES[rol].p), dif = {};
  $$('[data-perm]', root).forEach(c => { if (c.checked !== base.has(c.dataset.perm)) dif[c.dataset.perm] = c.checked; });
  return Object.keys(dif).length ? dif : null;
}
function invitar() {
  const rolesDisp = Object.keys(ROLES).filter(r => r !== 'admin' || S.user.rol === 'admin');
  modal({
    titulo: '＋ INVITAR INTEGRANTE', ancho: 600, botones: [['Cancelar', 'gris'], ['Crear invitación', 'azul', async root => {
      const v = id => ($('#' + id, root).value || '').trim(); const correo = v('ivC').toLowerCase(), nombre = v('ivN');
      if (!nombre || !/^\S+@\S+\.\S+$/.test(correo)) { toast('Escriba el nombre y un correo válido'); return false; }
      const rol = $('#ivR', root).value;
      try {
        await api('/rest/v1/frap_invitaciones?on_conflict=email', { m: 'POST', body: [{ email: correo, nombre, rol, cargo: v('ivCg') || null, nivel_tamp: $('#ivNv', root).value || null, unidad: v('ivU') || null, telefono: v('ivT') || null, permisos: diffPermisos(rol, root), estado: 'pendiente' }], h: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
        Datos.log('Invitó a un integrante', nombre + ' · ' + ROLES[rol].n); await Datos.sincronizar(false).catch(() => { });
        pintarPanel(); modal({ titulo: '✔ Invitación creada', ancho: 460, botones: [['Entendido', 'azul']], html: `<p class="msg">Dígale a <b>${esc(nombre)}</b> que abra la app, toque <b>«¿Lo invitaron? Activar mi cuenta»</b> y se registre con el correo <b>${esc(correo)}</b> y la contraseña que elija.</p><p class="msg">Tendrá el rango <b>${ROLES[rol].n}</b> con los permisos que dejó marcados.</p>` });
      } catch (e) { toast('No se pudo crear: ' + e.message, 6000); return false; }
    }]],
    html: `<div class="frm2"><label class="fld"><span>Nombre completo</span><div class="in"><input id="ivN"></div></label><label class="fld"><span>Correo electrónico</span><div class="in"><input id="ivC" type="email"></div></label>
      <label class="fld"><span>Rango</span><div class="in"><select id="ivR">${rolesDisp.map(r => `<option value="${r}" ${r === 'paramedico' ? 'selected' : ''}>${ROLES[r].n}</option>`).join('')}</select></div></label><label class="fld"><span>Cargo</span><div class="in"><input id="ivCg" placeholder="TAMP, operador…"></div></label>
      <label class="fld"><span>Nivel TAMP</span><div class="in"><select id="ivNv"><option value=""></option>${selOpts(['Básico', 'Intermedio', 'Avanzado'])}</select></div></label><label class="fld"><span>Unidad</span><div class="in"><input id="ivU"></div></label><label class="fld"><span>Teléfono</span><div class="in"><input id="ivT" type="tel"></div></label></div>
      <h4 class="sub">🔑 Permisos <small>Se llenan según el rango; puede ajustarlos</small></h4><div id="ivP">${checksPermisos(new Set(ROLES.paramedico.p))}</div>`,
    alAbrir: root => { $('#ivR', root).addEventListener('change', e => { $('#ivP', root).innerHTML = checksPermisos(new Set(ROLES[e.target.value].p)); }); }
  });
}
function editarPermisos(i) {
  const rolesDisp = Object.keys(ROLES).filter(r => r !== 'admin' || S.user.rol === 'admin');
  modal({
    titulo: '⚙ PERMISOS · ' + esc(i.nombre), ancho: 560, botones: [['Cancelar', 'gris'], ['Guardar', 'azul', async root => {
      const rol = $('#epR', root).value; const permisos = diffPermisos(rol, root);
      try { await api(`/rest/v1/frap_perfiles?id=eq.${i.id}`, { m: 'PATCH', body: { rol, permisos }, h: { Prefer: 'return=minimal' } }); Object.assign(i, { rol, permisos }); Datos.log('Cambió permisos', `${i.nombre}: ${ROLES[rol].n}${permisos ? ' (personalizado)' : ''}`); pintarPanel(); toast('Permisos actualizados'); }
      catch (e) { toast('No se pudo guardar: ' + e.message, 6000); return false; }
    }]],
    html: `<label class="fld"><span>Rango</span><div class="in"><select id="epR">${rolesDisp.map(r => `<option value="${r}" ${r === i.rol ? 'selected' : ''}>${ROLES[r].n}</option>`).join('')}</select></div></label><div id="epP">${checksPermisos(permsDe(i))}</div>`,
    alAbrir: root => { $('#epR', root).addEventListener('change', e => { $('#epP', root).innerHTML = checksPermisos(new Set(ROLES[e.target.value].p)); }); }
  });
}
function editarDatosInt(i) {
  modal({
    titulo: '✎ DATOS · ' + esc(i.nombre), ancho: 520, botones: [['Cancelar', 'gris'], ['Guardar', 'azul', async root => {
      const v = id => ($('#' + id, root).value || '').trim(); if (!v('edN')) { toast('El nombre es obligatorio'); return false; }
      const body = { nombre: v('edN'), cargo: v('edCg') || null, nivel_tamp: $('#edNv', root).value || null, unidad: v('edU') || null, telefono: v('edT') || null, incorporacion: v('edI') || i.incorporacion };
      try { await api(`/rest/v1/frap_perfiles?id=eq.${i.id}`, { m: 'PATCH', body, h: { Prefer: 'return=minimal' } }); Object.assign(i, body); pintarPanel(); toast('Datos actualizados'); }
      catch (e) { toast('No se pudo guardar: ' + e.message, 6000); return false; }
    }]],
    html: `<div class="frm2"><label class="fld"><span>Nombre completo</span><div class="in"><input id="edN" value="${esc(i.nombre)}"></div></label><label class="fld"><span>Cargo</span><div class="in"><input id="edCg" value="${esc(i.cargo)}"></div></label><label class="fld"><span>Nivel TAMP</span><div class="in"><select id="edNv"><option value=""></option>${selOpts(['Básico', 'Intermedio', 'Avanzado'], i.nivel_tamp)}</select></div></label><label class="fld"><span>Unidad</span><div class="in"><input id="edU" value="${esc(i.unidad)}"></div></label><label class="fld"><span>Teléfono</span><div class="in"><input id="edT" value="${esc(i.telefono)}"></div></label><label class="fld"><span>Fecha de incorporación</span><div class="in"><input id="edI" type="date" value="${esc(i.incorporacion)}"></div></label></div>`
  });
}
async function verActividad() {
  await Datos.cargarActividad().catch(() => { });
  modal({ titulo: '🕘 ACTIVIDAD DEL EQUIPO', ancho: 620, botones: [['Cerrar', 'gris']], html: `<div class="act">${S.act.map(a => `<div><small>${fDT(a.creado_en)}</small><b>${esc(a.usuario || '')}</b> ${esc(a.accion)}${a.detalle ? ' · <span>' + esc(a.detalle) + '</span>' : ''}</div>`).join('') || '<p class="muted">Sin actividad registrada.</p>'}</div>` });
}

/* ---------- ficha de la unidad y cuenta ---------- */
function editarFicha() {
  const u = { ...unidadVacia(), ...S.unidad }; let logo = u.logo || '';
  const campos = [['institucion', 'Institución'], ['siglas', 'Siglas (si no hay logotipo)'], ['unidad', 'Unidad (No. económico)'], ['tipo', 'Tipo de unidad'], ['placas', 'Placas'], ['turno', 'Turno'], ['cabina', 'Cabina (teléfono)'], ['radio', 'Radio (frecuencia y clave)'], ['tamp', 'TAMP'], ['operador', 'Operador'], ['copiloto', 'Copiloto'], ['base', 'Base']];
  modal({
    titulo: '✎ FICHA DE LA UNIDAD', ancho: 600, botones: [['Cancelar', 'gris'], ['Guardar', 'azul', async root => {
      const n = { logo }; campos.forEach(([k]) => n[k] = $('#fu_' + k, root).value.trim());
      try { await Datos.guardarUnidad(n); Datos.log('Editó la ficha de la unidad'); actualizarInicio(); toast('Ficha guardada'); } catch (e) { toast('No se pudo guardar: ' + e.message, 6000); return false; }
    }]],
    html: `<div class="logo-ed"><div id="fuLogo">${logo ? `<img src="${logo}">` : '<span>Sin logotipo</span>'}</div><label class="btn gris ch">Elegir logotipo<input type="file" accept="image/*" id="fuFile" hidden></label><button type="button" class="btn gris ch" id="fuQ">Quitar</button></div><div class="frm2">${campos.map(([k, l]) => `<label class="fld"><span>${l}</span><div class="in"><input id="fu_${k}" value="${esc(u[k])}"></div></label>`).join('')}</div>`,
    alAbrir: root => {
      $('#fuQ', root).onclick = () => { logo = ''; $('#fuLogo', root).innerHTML = '<span>Sin logotipo</span>'; };
      $('#fuFile', root).onchange = ev => {
        const f = ev.target.files[0]; if (!f) return; const img = new Image(), rd = new FileReader();
        rd.onload = () => { img.onload = () => { const m = 220, k = Math.min(1, m / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); logo = c.toDataURL('image/png'); $('#fuLogo', root).innerHTML = `<img src="${logo}">`; }; img.src = rd.result; };
        rd.readAsDataURL(f);
      };
    }
  });
}
function miCuenta() {
  const u = S.user;
  modal({
    titulo: '👤 MI CUENTA', ancho: 440, botones: [['Cerrar', 'gris'], ...(NUBE ? [['Cerrar sesión', 'rojo', async () => { if (SUCIO) guardarBorrador(); Datos.log('Cerró sesión'); Auth.salir(); location.reload(); }]] : [])],
    html: `<div class="ficha-i"><span class="av g" style="background:${colorDe(u.nombre)}">${esc(iniciales(u.nombre))}</span><div><h3>${esc(u.nombre)}</h3><span class="rol ${u.rol}">${ROLES[u.rol].n.toUpperCase()}</span><small class="blk">${esc(u.email || S.ses?.email || '')}</small></div></div>
    ${NUBE ? `<h4 class="sub">🔑 Cambiar contraseña</h4><div class="frm2"><label class="fld"><span>Nueva contraseña</span><div class="in"><input id="cpA" type="password" minlength="6"></div></label><label class="fld"><span>Repetir</span><div class="in"><input id="cpB" type="password"></div></label></div><button type="button" class="btn azul" id="cpOk">Cambiar contraseña</button>` : `<label class="fld"><span>Su nombre (aparece en los FRAP)</span><div class="in"><input id="cpN" value="${esc(u.nombre)}"></div></label><button type="button" class="btn azul" id="cpNom">Guardar nombre</button>`}`,
    alAbrir: root => {
      const ok = $('#cpOk', root); if (ok) ok.onclick = async () => { const a = $('#cpA', root).value; if (a.length < 6 || a !== $('#cpB', root).value) { toast('Mínimo 6 caracteres y deben coincidir'); return; } try { await Auth.cambiarPass(a); toast('Contraseña cambiada'); $('#cpA', root).value = $('#cpB', root).value = ''; } catch (e) { toast('No se pudo: ' + e.message, 5000); } };
      const nm = $('#cpNom', root); if (nm) nm.onclick = () => { const v = $('#cpN', root).value.trim(); if (!v) return; S.user.nombre = v; LS.set('nombre', v); if (REC && !REC.guardado) REC.autor = v; pintarApp(); pintarFormulario(); toast('Nombre guardado'); };
    }
  });
}

/* ---------- eventos globales ---------- */
function manejarGlobal(e) {
  const t = e.target;
  const pn = t.closest('[data-panel]'); if (pn) { abrirPanel(pn.dataset.panel); return; }
  const fr = t.closest('[data-frap]'); if (fr && PANEL) { verDetalle(fr.dataset.frap); return; }
  const pe = t.closest('[data-per]'); if (pe) { EXP.per = pe.dataset.per; pintarPanel(); return; }
  const ch = t.closest('[data-chip]'); if (ch) { EXP.chip = EXP.chip === ch.dataset.chip ? '' : ch.dataset.chip; pintarPanel(); return; }
  const ps = t.closest('[data-persona]'); if (ps) { EXP.persona = EXP.persona === ps.dataset.persona ? '' : ps.dataset.persona; pintarPanel(); return; }
  const it = t.closest('[data-int]'); if (it) { modalIntegrante(it.dataset.int); return; }
  const idl = t.closest('[data-invdel]'); if (idl) { (async () => { if (!await confirmar('¿Cancelar esta invitación?', 'Cancelar invitación', 'Volver')) return; try { await api(`/rest/v1/frap_invitaciones?email=eq.${enc(idl.dataset.invdel)}`, { m: 'DELETE', h: { Prefer: 'return=minimal' } }); S.invit = S.invit.filter(v => v.email !== idl.dataset.invdel); pintarPanel(); } catch (er) { toast('No se pudo: ' + er.message); } })(); return; }
  const a = t.closest('[data-act]'); if (!a || a.closest('#form')) return;
  switch (a.dataset.act) {
    case 'cerrarPanel': cerrarPaneles(); break;
    case 'avance': guardarAvance(); break;
    case 'sincronizar': sincronizarAhora(); break;
    case 'fichaVer': FICHA_ABIERTA = !FICHA_ABIERTA; actualizarInicio(); break;
    case 'fichaEditar': editarFicha(); break;
    case 'cuenta': miCuenta(); break;
    case 'invitar': invitar(); break;
    case 'actividad': verActividad(); break;
    case 'expQuitar': EXP.persona = ''; pintarPanel(); break;
    case 'exportar': exportarExcel(PANEL === 'exp' ? filtrarExp() : filtrarFRAPs(), `FRAPs_${EXP.per === 'todo' ? 'todo' : EXP.per + 'dias'}_${hoy()}.xls`); Datos.log('Exportó a Excel'); break;
  }
}
function manejarCambioGlobal(e) {
  const t = e.target;
  if (t.id === 'busq') { EXP.q = t.value; const pos = t.selectionStart; pintarPanel(); const n = $('#busq'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }
}

/* ---------- arranque ---------- */
function observarSecciones() {
  if (!('IntersectionObserver' in window)) return;
  observarSecciones.o && observarSecciones.o.disconnect();
  const o = observarSecciones.o = new IntersectionObserver(es => {
    const v = es.filter(x => x.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (v) { ACTIVA = v.target.dataset.sec; $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.go === ACTIVA)); const on = $('#tabs button.on'); if (on) { const t = $('#tabs'); t.scrollLeft = on.offsetLeft - t.clientWidth / 2 + on.clientWidth / 2; } }
  }, { rootMargin: '-120px 0px -60% 0px' });
  $$('.sec').forEach(s => o.observe(s));
}
async function arrancar() {
  await Datos.iniciarSesion();
  if (!cargarBorrador()) empezarNuevo();
  if (!F.tomas || !F.tomas.length) F.tomas = [{}]; F.lesiones = F.lesiones || []; F.meds = F.meds || [];
  pintarApp(); pintarFormulario(); observarSecciones(); guardarBorrador(); vigilarOtroDispositivo();
  if (!arrancar.hecho) {
    arrancar.hecho = true; arrancarSondeo();
    document.addEventListener('click', e => { if (e.target.closest('#form')) manejarClick(e); else manejarGlobal(e); });
    document.addEventListener('input', e => { if (e.target.closest('#form')) manejarInput(e); });
    document.addEventListener('change', e => { if (e.target.closest('#form')) manejarInput(e); else manejarCambioGlobal(e); });
    document.addEventListener('input', e => { if (e.target.id === 'busq') manejarCambioGlobal(e); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { const m = $('#modales .mbg:last-child'); if (m) m.remove(); else if (PANEL) cerrarPaneles(); } });
    window.addEventListener('beforeunload', ev => { if (SUCIO) { guardarBorrador(); } });
    setInterval(() => { const r = $('#relojG'); if (r) r.innerHTML = htmlReloj(); }, 20000);
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); _instalar = e; const b = $('#btnInst'); if (b) b.hidden = false; });
    document.addEventListener('click', async e => { if (e.target.id === 'btnInst' && _instalar) { _instalar.prompt(); await _instalar.userChoice; _instalar = null; e.target.hidden = true; } });
  }
  try { if (!sessionStorage.getItem('frap:log')) { sessionStorage.setItem('frap:log', '1'); Datos.log('Inició sesión'); } } catch (e) { }
}
async function init() {
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => { });
  if (!NUBE) { S.user = { id: 'local', nombre: LS.get('nombre', 'Administrador'), rol: 'admin', estado: 'activo', principal: true, email: '' }; await arrancar(); return; }
  S.ses = LS.get('ses', null);
  if (!S.ses) { pintarLogin(); return; }
  try { await cargarPerfil(); await arrancar(); }
  catch (e) {
    if (e.sinPerfil) { Auth.salir(); pintarLogin('Esta cuenta aún no tiene una invitación. Pida al administrador que lo invite con este correo.'); }
    else if (e.suspendido) { Auth.salir(); pintarLogin('Su acceso está ' + e.suspendido + '. Consulte al administrador.'); }
    else if (e.status === 401) { Auth.salir(); pintarLogin('Su sesión venció. Inicie sesión de nuevo.'); }
    else pintarLogin(e.status === 0 ? 'Sin conexión: necesita internet para la primera vez.' : e.message);
  }
}
document.addEventListener('DOMContentLoaded', init);
