// Conexión a Supabase para el modo en línea (cuentas, rangos, permisos y FRAPs compartidos).
// La llave "publishable" es pública por diseño: la protección de los datos la dan el inicio de sesión
// y las reglas de seguridad (RLS) de la base. NUNCA poner aquí la llave service_role.
//
// Mientras `url` y `key` estén vacías, la app trabaja en MODO LOCAL (un solo usuario, datos en este equipo).
// Para activar el modo en línea: pega aquí la URL del proyecto y la llave publishable
// (Supabase → Project Settings → API), ejecuta supabase/01_esquema.sql y publica de nuevo los archivos.
window.FRAP_CONFIG = {
  url: 'https://xjfarwnsoncchtjlgtag.supabase.co',
  key: 'sb_publishable_iN-JjwgQ7HeR0XqGZZWAdg_xDRsmWTI',
  geocodificar: true   // true = al tomar el GPS se consulta la dirección en OpenStreetMap (solo se envían las coordenadas)
};
