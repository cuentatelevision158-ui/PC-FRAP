// Service worker: deja la app instalable y disponible sin internet.
// Primero pide SIEMPRE la versión más nueva a la red; solo si no hay internet usa la copia guardada.
// Nunca guarda datos de Supabase (otro origen).
const VER = 'sirap-v19';
const ARCHIVOS = ['./index.html', './estilos.css', './config.js', './jspdf.umd.min.js', './core.js', './licencia.js', './equipos.js', './privacidad.js', './form.js', './pdf.js', './vistas.js', './manifest.webmanifest', './icono.svg', './icono-192.png', './icono-512.png',
  './imagenes/imagenes-datos.js', './imagenes/ambulancia.png', './imagenes/logo-app.png', './imagenes/logo-escritorio.png', './imagenes/iconos/les-deformidades.png', './imagenes/iconos/les-contusiones.png', './imagenes/iconos/les-abrasiones.png', './imagenes/iconos/les-penetraciones.png', './imagenes/iconos/les-paradojico.png', './imagenes/iconos/les-crepitacion.png', './imagenes/iconos/les-heridas.png', './imagenes/iconos/les-fracturas.png', './imagenes/iconos/les-enfisema.png', './imagenes/iconos/les-quemaduras.png', './imagenes/iconos/les-laceraciones.png', './imagenes/iconos/les-edema.png', './imagenes/iconos/les-sensibilidad.png', './imagenes/iconos/les-movilidad.png', './imagenes/iconos/les-dolor.png', './imagenes/iconos/ag-arma.png', './imagenes/iconos/ag-juguete.png', './imagenes/iconos/ag-automovil.png', './imagenes/iconos/ag-bicicleta.png', './imagenes/iconos/ag-motocicleta.png', './imagenes/iconos/ag-atropellamiento.png', './imagenes/iconos/ag-caida.png', './imagenes/iconos/ag-maquinaria.png', './imagenes/iconos/ag-herramienta.png', './imagenes/iconos/ag-fuego.png', './imagenes/iconos/ag-sust-caliente.png', './imagenes/iconos/ag-sust-toxica.png', './imagenes/iconos/ag-electricidad.png', './imagenes/iconos/ag-explosion.png', './imagenes/iconos/ag-humano.png', './imagenes/iconos/ag-animal.png', './imagenes/iconos/ag-ahogamiento.png', './imagenes/iconos/ag-biologico.png', './imagenes/iconos/ini-fraps.png', './imagenes/iconos/ini-expediente.png', './imagenes/iconos/ini-acceso.png', './imagenes/iconos/sec-servicio.png', './imagenes/iconos/sec-unidad.png', './imagenes/iconos/sec-paciente.png', './imagenes/iconos/sec-tcp.png', './imagenes/iconos/sec-prim.png', './imagenes/iconos/sec-sec.png', './imagenes/iconos/sec-gcs.png', './imagenes/iconos/sec-trat.png', './imagenes/iconos/sec-tras.png', './imagenes/iconos/sec-leg.png', './imagenes/ojo.jpg', './imagenes/ojo.json', './imagenes/adulto-frente.png', './imagenes/adulto-espalda.png', './imagenes/adulto-lat-der.png', './imagenes/adulto-lat-izq.png',
  './imagenes/nino-frente.png', './imagenes/nino-espalda.png', './imagenes/nino-lat-der.png', './imagenes/nino-lat-izq.png',
  './imagenes/embarazada-frente.png', './imagenes/embarazada-espalda.png', './imagenes/embarazada-lat-der.png', './imagenes/embarazada-lat-izq.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => Promise.allSettled(ARCHIVOS.map(u => fetch(u, { cache: 'reload' }).then(r => r.ok && c.put(u, r))))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(VER);
    try {
      const r = await fetch(u.href, { cache: 'no-store' });
      if (r.ok) c.put(e.request, r.clone());
      return r;
    } catch (err) {
      return (await c.match(e.request, { ignoreSearch: true })) || (await c.match('./index.html'));
    }
  })());
});
