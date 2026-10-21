'use strict';
/* =====================================================================
   SIRAP — Protección Civil de Ixhuatlán del Café
   core.js: utilidades, permisos, almacenamiento, nube (Supabase por REST) y cola sin conexión
   ===================================================================== */
const CFG = window.FRAP_CONFIG || {};
const NUBE = !!(CFG.url && CFG.key);
const PFX = 'frap:';

/* ---------- utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const p2 = n => String(n).padStart(2, '0');
const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
const horaAhora = () => { const d = new Date(); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
const nuevoId = () => 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const fFecha = iso => { if (!iso) return ''; const [y, m, d] = String(iso).slice(0, 10).split('-'); return `${+d} ${MESES[+m - 1] || ''}`; };
const fFechaL = iso => { if (!iso) return ''; const [y, m, d] = String(iso).slice(0, 10).split('-'); return `${+d} de ${MESES_L[+m - 1] || ''} de ${y}`; };
const fDT = iso => { if (!iso) return '—'; const d = new Date(iso); if (isNaN(d)) return '—'; return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}, ${p2(d.getHours())}:${p2(d.getMinutes())}`; };
const diaSemana = iso => { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); return DIAS[new Date(y, m - 1, d).getDay()]; };
const minDe = hm => { if (!hm || !/^\d{1,2}:\d{2}/.test(hm)) return null; const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
const difMin = (a, b) => { const x = minDe(a), y = minDe(b); if (x == null || y == null) return null; let d = y - x; if (d < 0) d += 1440; return d; };
const iniciales = n => (String(n || '?').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('') || '?').toUpperCase();
const colorDe = s => { let h = 0; for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return ['#b3121f', '#7c3aed', '#c2410c', '#0f766e', '#1d4ed8', '#a21caf', '#4d7c0f', '#be185d'][h % 8]; };
const enc = encodeURIComponent;
const sinAcentos = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const LS = {
  get(k, d) { try { const v = localStorage.getItem(PFX + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(PFX + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(PFX + k); } catch (e) { } }
};

function toast(msg, ms = 3200) {
  const t = $('#toast'); if (!t) return;
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), ms);
}

/* ---------- rangos y permisos (espejo de supabase/01_esquema.sql) ---------- */
const PERMISOS = [
  ['crear', 'Crear y cerrar FRAPs'],
  ['corregir_propios', 'Corregir sus propios FRAPs'],
  ['pdf', 'Generar FRAP PDF'],
  ['compartir', 'Compartir el resumen de un FRAP'],
  ['ver_pacientes', 'Ver Pacientes registrados'],
  ['ver_otros', 'Consultar FRAPs de otros integrantes'],
  ['corregir_otros', 'Corregir FRAPs de otros integrantes'],
  ['eliminar', 'Eliminar FRAPs'],
  ['ver_expediente', 'Ver el Expediente central'],
  ['exportar', 'Exportar a Excel'],
  ['ver_integrantes', 'Ver integrantes'],
  ['invitar', 'Invitar integrantes'],
  ['modificar_permisos', 'Modificar rangos y permisos'],
  ['suspender', 'Suspender, reactivar y cancelar accesos'],
  ['editar_unidad', 'Editar la ficha de la unidad (institución, logotipo y tripulación)'],
  ['ver_actividad', 'Ver la actividad del equipo']
];
const ROLES = {
  admin: { n: 'Administrador', p: PERMISOS.map(x => x[0]) },
  coordinador: { n: 'Coordinador', p: ['crear', 'corregir_propios', 'pdf', 'compartir', 'ver_pacientes', 'ver_otros', 'corregir_otros', 'ver_expediente', 'exportar', 'ver_integrantes', 'editar_unidad', 'ver_actividad'] },
  paramedico: { n: 'Paramédico', p: ['crear', 'corregir_propios', 'pdf', 'compartir', 'ver_pacientes'] },
  operador: { n: 'Operador', p: ['crear', 'corregir_propios', 'pdf'] }
};
function permsDe(u) {
  if (!u || u.estado === 'suspendido' || u.estado === 'cancelado') return new Set();
  const s = new Set((ROLES[u.rol] || ROLES.operador).p);
  if (u.permisos) for (const [k, v] of Object.entries(u.permisos)) v ? s.add(k) : s.delete(k);
  return s;
}
const personalizado = u => !!(u.permisos && Object.keys(u.permisos).some(k => u.permisos[k] !== (ROLES[u.rol]?.p.includes(k))));

/* ---------- estado ---------- */
const S = {
  user: null, perms: new Set(), regs: [], dc: {}, integrantes: [], invit: [], act: [],
  unidad: null, cola: [], online: navigator.onLine, ultimaAct: null, sondeos: 0, sync: 'ok', ses: null
};
const can = p => S.perms.has(p);
const unidadVacia = () => ({
  institucion: 'Protección Civil Municipal', siglas: 'PC', logo: '', unidad: '', tipo: 'Urgencias básicas', placas: '', turno: '',
  cabina: '', radio: '', tamp: '', operador: '', copiloto: '', base: ''
});

/* ---------- nube: Supabase por REST (sin librerías) ---------- */
function _red(e) { const x = new Error('Sin conexión con el servidor'); x.status = 0; return x; }
async function _json(r) { const t = await r.text(); if (!t) return null; try { return JSON.parse(t); } catch (e) { return null; } }
async function _falla(r) {
  const e = await _json(r) || {};
  const x = new Error(e.message || e.msg || e.error_description || ('Error ' + r.status));
  x.status = r.status; x.code = e.code || e.error_code; return x;
}
function guardarSes(d) {
  S.ses = { token: d.access_token, refresh: d.refresh_token, exp: Date.now() + (d.expires_in || 3600) * 1000, uid: d.user.id, email: d.user.email };
  LS.set('ses', S.ses);
}
async function refrescar() {
  const s = S.ses; if (!s) throw new Error('Sin sesión');
  let r; try { r = await fetch(CFG.url + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: CFG.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: s.refresh }) }); } catch (e) { throw _red(e); }
  if (!r.ok) { const x = await _falla(r); x.status = 401; throw x; }
  guardarSes(await r.json());
}
async function token() {
  if (!S.ses) throw Object.assign(new Error('Sin sesión'), { status: 401 });
  if (S.ses.exp - 60000 < Date.now()) await refrescar();
  return S.ses.token;
}
async function api(path, { m = 'GET', body, h = {}, reintento = true } = {}) {
  const t = await token();
  let r;
  try { r = await fetch(CFG.url + path, { method: m, headers: { apikey: CFG.key, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json', ...h }, body: body === undefined ? undefined : JSON.stringify(body) }); }
  catch (e) { throw _red(e); }
  if (r.status === 401 && reintento) { await refrescar(); return api(path, { m, body, h, reintento: false }); }
  if (!r.ok) throw await _falla(r);
  return _json(r);
}
async function traerTodo(path) {
  const out = []; let off = 0;
  for (; ;) {
    const lote = await api(path + (path.includes('?') ? '&' : '?') + `limit=1000&offset=${off}`) || [];
    out.push(...lote); if (lote.length < 1000) break; off += 1000;
  }
  return out;
}
const Auth = {
  async entrar(correo, pass) {
    let r; try { r = await fetch(CFG.url + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: CFG.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: correo.trim().toLowerCase(), password: pass }) }); } catch (e) { throw _red(e); }
    if (!r.ok) { const x = await _falla(r); throw Object.assign(new Error(r.status === 400 ? 'Correo o contraseña incorrectos' : x.message), { status: r.status }); }
    guardarSes(await r.json());
  },
  async registrar(correo, pass, nombre) {
    let r; try { r = await fetch(CFG.url + '/auth/v1/signup', { method: 'POST', headers: { apikey: CFG.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: correo.trim().toLowerCase(), password: pass, data: { nombre } }) }); } catch (e) { throw _red(e); }
    if (!r.ok) throw await _falla(r);
    const d = await r.json();
    if (d.access_token) { guardarSes(d); return true; }
    return false; // requiere confirmar el correo
  },
  async recuperar(correo) {
    let r; try { r = await fetch(CFG.url + '/auth/v1/recover', { method: 'POST', headers: { apikey: CFG.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: correo.trim().toLowerCase() }) }); } catch (e) { throw _red(e); }
    if (!r.ok) throw await _falla(r);
  },
  async cambiarPass(nueva) { await api('/auth/v1/user', { m: 'PUT', body: { password: nueva } }); },
  salir() { S.ses = null; LS.del('ses'); }
};

/* ---------- capa de datos (local o nube) ---------- */
const COLS = 'id,folio,fecha,hora_llamada,unidad,motivo,paciente,edad,sexo,prioridad,derivacion,hospital,resp_min,sitio_min,revisar,alertas,estatus,autor,creado_por,creado_en,actualizado_en';
const norm = r => ({ ...r, resp_min: r.resp_min ?? null, alertas: r.alertas || 0 });
const guardarCola = () => LS.set('cola:' + (S.user?.id || ''), S.cola);
const claveReg = () => 'reg:' + (S.user?.id || 'local');
function persistirLocal() {
  if (!NUBE) { LS.set('reg', S.regs.map(r => ({ ...r, datos: S.dc[r.id] || r.datos }))); return; }
  LS.set('lista:' + S.user.id, S.regs);
  // cache de formularios abiertos/guardados (los 40 más recientes) para poder abrirlos sin internet
  const ids = Object.keys(S.dc).sort((a, b) => ((S.regs.find(x => x.id === b)?.actualizado_en || '') > (S.regs.find(x => x.id === a)?.actualizado_en || '')) ? 1 : -1).slice(0, 40);
  const dc = {}; ids.forEach(i => dc[i] = S.dc[i]);
  if (!LS.set('dc:' + S.user.id, dc)) { const poco = {}; ids.slice(0, 10).forEach(i => poco[i] = S.dc[i]); LS.set('dc:' + S.user.id, poco); }
}
function filaDe(rec, f) {
  const r = resumenFRAP(f);
  return {
    id: rec.id, fecha: f.fecha || hoy(), hora_llamada: f.t_llamada || null, unidad: f.ambulancia || null, motivo: f.motivo || null,
    paciente: f.pac_nombre || null, edad: f.edad || null, sexo: f.sexo || null, prioridad: f.prioridad || null,
    derivacion: f.derivacion || null, hospital: f.hospital || null, resp_min: r.respuesta, sitio_min: r.sitio, revisar: r.revisar.join(' · ') || null, alertas: r.faltan.length,
    estatus: rec.estatus, datos: f, autor: rec.autor
  };
}
const Datos = {
  async iniciarSesion() {
    const u = S.user;
    S.perms = permsDe(u);
    S.cola = LS.get('cola:' + u.id, []);
    if (!NUBE) {
      S.regs = LS.get('reg', []); S.regs.forEach(r => { if (r.datos) { S.dc[r.id] = r.datos; } });
      S.unidad = LS.get('unidad', null) || unidadVacia();
      S.integrantes = [u]; return;
    }
    S.regs = LS.get('lista:' + u.id, []); S.dc = LS.get('dc:' + u.id, {});
    S.unidad = LS.get('unidad:nube', null) || unidadVacia();
    S.ultimaAct = LS.get('ultact:' + u.id, null);
    if (navigator.onLine) { try { await Datos.sincronizar(true); } catch (e) { if (e.status === 401) throw e; } }
  },
  async sincronizar(completo) {
    if (!NUBE) return;
    S.sondeos++;
    const full = completo || !S.ultimaAct || S.sondeos % 10 === 0;
    try {
      await vaciarCola();
      const pend = new Set(S.cola.map(c => c.id));
      if (full) {
        const filas = await traerTodo(`/rest/v1/frap_registros?select=${COLS}&order=creado_en.asc,id.asc`);
        const mapa = new Map(S.regs.map(r => [r.id, r]));
        filas.forEach(f => { const o = mapa.get(f.id); if (o && o.actualizado_en !== f.actualizado_en && !pend.has(f.id)) delete S.dc[f.id]; }); // otro equipo lo cambió: la copia guardada ya no vale
        const nuevos = filas.map(f => pend.has(f.id) && mapa.get(f.id) ? mapa.get(f.id) : { ...norm(f), _nube: true });
        S.regs.filter(r => pend.has(r.id) && !filas.some(f => f.id === r.id)).forEach(r => nuevos.push(r)); // aún sin subir
        S.regs = nuevos;
      } else {
        const filas = await traerTodo(`/rest/v1/frap_registros?select=${COLS}&actualizado_en=gt.${enc(S.ultimaAct)}&order=actualizado_en.asc`);
        for (const f of filas) {
          if (pend.has(f.id)) continue;
          const i = S.regs.findIndex(r => r.id === f.id);
          const n = { ...norm(f), _nube: true };
          if (i >= 0) { S.regs[i] = n; delete S.dc[f.id]; } else S.regs.push(n);
        }
      }
      const mx = S.regs.reduce((a, r) => r._nube && r.actualizado_en > a ? r.actualizado_en : a, '');
      if (mx) { S.ultimaAct = mx; LS.set('ultact:' + S.user.id, mx); }
      const cfg = await api('/rest/v1/frap_config?clave=eq.unidad&select=valor');
      if (cfg && cfg[0]) { S.unidad = { ...unidadVacia(), ...cfg[0].valor }; LS.set('unidad:nube', S.unidad); }
      if (can('ver_integrantes') || can('ver_expediente') || can('invitar')) S.integrantes = await api('/rest/v1/frap_perfiles?select=*&order=creado_en.asc') || S.integrantes;
      else S.integrantes = [S.user];
      if (can('invitar') || can('ver_integrantes')) S.invit = await api('/rest/v1/frap_invitaciones?select=*&estado=eq.pendiente&order=creado_en.desc') || [];
      persistirLocal(); S.sync = S.cola.length ? 'pend' : 'ok';
    } catch (e) { S.sync = e.status === 0 ? 'off' : 'err'; throw e; }
    pintarSync();
  },
  async cargarActividad() {
    if (!NUBE || !can('ver_actividad')) { S.act = LS.get('act', []); return; }
    S.act = await api('/rest/v1/frap_actividad?select=*&order=creado_en.desc&limit=200') || [];
  },
  async abrir(id) {
    if (S.dc[id]) return S.dc[id];
    if (!NUBE) return null;
    const r = await api(`/rest/v1/frap_registros?id=eq.${enc(id)}&select=datos`);
    if (r && r[0]) { S.dc[id] = r[0].datos || {}; persistirLocal(); return S.dc[id]; }
    return null;
  },
  /* guarda (crea o actualiza) un FRAP; en la nube pasa por la cola para tolerar la falta de internet */
  async guardar(rec, f) {
    const fila = filaDe(rec, f);
    const ahora = new Date().toISOString();
    let r = S.regs.find(x => x.id === rec.id);
    if (!r) {
      r = { ...fila, folio: rec.folio || '', creado_por: S.user.id, creado_en: ahora, _nube: false };
      if (!NUBE && !r.folio) r.folio = siguienteFolioLocal(fila.fecha);
      S.regs.push(r);
    }
    Object.assign(r, { ...fila, datos: undefined, actualizado_en: ahora }); delete r.datos;
    r.autor = r.autor || fila.autor;
    S.dc[r.id] = f;
    if (NUBE) {
      const ex = S.cola.find(c => c.id === r.id && c.op === 'up');
      const filaN = { ...fila }; if (!r._nube && r.folio) filaN.folio = r.folio;
      if (ex) ex.fila = filaN; else S.cola.push({ op: 'up', id: r.id, fila: filaN, nube: !!r._nube });
      guardarCola(); persistirLocal();
      const antes = S.cola.length; await vaciarCola();
      return { sincronizado: !S.cola.some(c => c.id === r.id), rec: r };
    }
    persistirLocal();
    return { sincronizado: true, rec: r };
  },
  async eliminar(id) {
    S.regs = S.regs.filter(r => r.id !== id); delete S.dc[id];
    if (NUBE) { S.cola = S.cola.filter(c => c.id !== id); const r0 = true; S.cola.push({ op: 'del', id }); guardarCola(); persistirLocal(); await vaciarCola(); }
    else persistirLocal();
  },
  async marcarRevisado(id, val) {
    const r = S.regs.find(x => x.id === id); if (!r) return;
    r.estatus = val ? 'revisado' : 'cerrado';
    if (NUBE) { await api(`/rest/v1/frap_registros?id=eq.${enc(id)}`, { m: 'PATCH', body: { estatus: r.estatus }, h: { Prefer: 'return=minimal' } }); persistirLocal(); }
    else persistirLocal();
  },
  async guardarUnidad(u) {
    S.unidad = { ...unidadVacia(), ...u };
    if (!NUBE) { LS.set('unidad', S.unidad); return; }
    await api('/rest/v1/frap_config?on_conflict=clave', { m: 'POST', body: [{ clave: 'unidad', valor: S.unidad, actualizado_en: new Date().toISOString() }], h: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
    LS.set('unidad:nube', S.unidad);
  },
  log(accion, detalle) {
    const fila = { usuario_id: S.user.id, usuario: S.user.nombre, accion, detalle: detalle || null };
    if (!NUBE) { const a = LS.get('act', []); a.unshift({ ...fila, creado_en: new Date().toISOString() }); LS.set('act', a.slice(0, 300)); return; }
    api('/rest/v1/frap_actividad', { m: 'POST', body: fila, h: { Prefer: 'return=minimal' } }).catch(() => { });
  }
};
function siguienteFolioLocal(fecha) {
  const anio = +String(fecha || hoy()).slice(0, 4);
  const c = LS.get('folios', {}); c[anio] = (c[anio] || 0) + 1; LS.set('folios', c);
  return `PCIX-${anio}-${String(c[anio]).padStart(4, '0')}`;
}
let _vaciando = false;
async function vaciarCola() {
  if (!NUBE || _vaciando || !navigator.onLine || !S.cola.length) return;
  _vaciando = true;
  try {
    while (S.cola.length) {
      const it = S.cola[0];
      try {
        if (it.op === 'del') await api(`/rest/v1/frap_registros?id=eq.${enc(it.id)}`, { m: 'DELETE', h: { Prefer: 'return=minimal' } });
        else {
          const { folio, ...resto } = it.fila;
          const parchar = () => api(`/rest/v1/frap_registros?id=eq.${enc(it.id)}`, { m: 'PATCH', body: resto, h: { Prefer: 'return=representation' } });
          let res;
          if (!it.nube) {
            try { res = await api('/rest/v1/frap_registros', { m: 'POST', body: it.fila, h: { Prefer: 'return=representation' } }); }
            catch (e) { if (e.status === 409 || e.code === '23505') res = await parchar(); else throw e; }
            it.nube = true;
          } else {
            res = await parchar();
            if (!res || !res.length) throw Object.assign(new Error('Sin permiso para corregir este FRAP'), { status: 403 });
          }
          const r = S.regs.find(x => x.id === it.id);
          if (r && res && res[0]) { r.folio = res[0].folio; r._nube = true; r.actualizado_en = res[0].actualizado_en; }
        }
        S.cola.shift(); guardarCola();
      } catch (e) {
        if (e.status === 0 || e.status === 401 || e.status >= 500 || !e.status) { S.sync = e.status === 0 ? 'off' : 'err'; break; }
        S.cola.shift(); guardarCola(); toast('No se pudo guardar un FRAP: ' + e.message, 6000);   // rechazado por permisos/validación
      }
    }
  } finally { _vaciando = false; S.sync = S.cola.length ? 'pend' : 'ok'; persistirLocal(); pintarSync(); }
}
function pintarSync() {
  const el = $('#sync'); if (!el) return;
  const m = { ok: ['Sincronización en tiempo real', 'ok'], pend: [`${S.cola.length} por enviar`, 'pend'], off: ['Sin internet · se guarda en el equipo', 'off'], err: ['Error de conexión · reintentando', 'off'] }[S.sync] || ['', ''];
  if (!NUBE) { el.innerHTML = '<i></i><span>Modo local<br>(sin nube)</span>'; el.className = 'sync off'; return; }
  el.className = 'sync ' + m[1]; el.innerHTML = `<i></i><span>${esc(m[0])}</span>`;
}
function arrancarSondeo() {
  if (!NUBE) return;
  const tic = async () => { if (document.hidden || !S.user) return; try { await Datos.sincronizar(false); if (typeof refrescarVistas === 'function') refrescarVistas(); if (typeof vigilarOtroDispositivo === 'function') vigilarOtroDispositivo(); } catch (e) { if (e.status === 401) { Auth.salir(); location.reload(); } pintarSync(); } };
  setInterval(tic, 30000);
  window.addEventListener('online', () => { S.online = true; tic(); });
  window.addEventListener('offline', () => { S.online = false; S.sync = 'off'; pintarSync(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tic(); });
}
