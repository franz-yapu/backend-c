// Fuente ÚNICA del secreto JWT. Todos los puntos que firman o verifican tokens
// (auth.module, jwt.strategy, jwt-auth.guard, bids.gateway) deben importar
// `jwtConstants.secret` desde aquí; así nunca se firma con un secreto y se
// verifica con otro.
//
// En producción DEBE definirse la variable de entorno `JWT_SECRET` (en el
// entorno del proceso / Docker, no commiteada). El valor de respaldo es solo
// para desarrollo local y NO debe usarse en producción: está en el repo y por
// tanto es público.
const DEV_FALLBACK_SECRET = 'c8306951-4b29-5669-b31f-5e44c3580280';

const secret = process.env.JWT_SECRET || DEV_FALLBACK_SECRET;

if (!process.env.JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.warn(
    '⚠️  JWT_SECRET no está definido: usando el secreto de desarrollo (público). ' +
      'Define JWT_SECRET en el entorno antes de desplegar a producción.',
  );
}

export const jwtConstants = {
  secret,
};
