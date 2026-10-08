/**
 * Decide si una extensión de la subasta suma 1 a `extendedTimes`.
 *
 * Con la extensión anti-francotirador cada puja de la ventana final corre el
 * cierre un poco, así que contar cada una daba cifras sin sentido (3 759 en la
 * prueba de estrés). Aquí se cuenta una extensión cada vez que el cierre ya se
 * movió un bloque completo de `minutos` desde la última vez que se contó: si
 * la subasta terminó 9 minutos más tarde con extensiones de 3, cuenta 3.
 *
 * Se guarda en memoria por subasta. Tras un reinicio del backend se vuelve a
 * medir desde el cierre que haya en ese momento (como mucho se pierde un bloque).
 */
const ultimoFinContado = new Map<string, number>();

export function cuentaComoExtension(
  auctionId: string,
  finAnterior: Date,
  finNuevo: Date,
  minutos: number,
): boolean {
  const base = ultimoFinContado.get(auctionId) ?? finAnterior.getTime();
  if (finNuevo.getTime() - base >= minutos * 60 * 1000) {
    ultimoFinContado.set(auctionId, finNuevo.getTime());
    return true;
  }
  if (!ultimoFinContado.has(auctionId)) ultimoFinContado.set(auctionId, base);
  return false;
}
