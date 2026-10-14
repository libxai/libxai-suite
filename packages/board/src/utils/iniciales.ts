/**
 * Las iniciales de una PERSONA (QA Asakaa E41: «Arcadio Ortiz es "AR" en unas
 * vistas y "AO" en otras»). Inicial del primer nombre + inicial del último; con
 * una palabra, sus dos primeras letras; sin nombre, «?». La misma regla que la
 * app (src/lib/iniciales.ts): aquí sirve de reserva cuando no llegan `initials`.
 */
export function inicialesDe(nombre?: string | null): string {
  const palabras = (nombre ?? '').trim().split(/\s+/).filter((p) => /[\p{L}\p{N}]/u.test(p));
  const letra = (p: string) => (p.match(/[\p{L}\p{N}]/u)?.[0] ?? '');
  if (palabras.length >= 2) return (letra(palabras[0]!) + letra(palabras[palabras.length - 1]!)).toUpperCase();
  if (palabras.length === 1) return palabras[0]!.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase();
  return '?';
}
