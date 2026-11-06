/**
 * A22 (revisión de Yesid) · EXPORTAR EL GANTT COMO DOCUMENTO: encabezado, leyenda y el rango elegido, en Carta, A4 o plotter.
 * Parte de la imagen del diagrama (la misma captura del PNG); si no cabe en una página, se corta por filas enteras.
 */
export type Papel = 'carta' | 'a4' | 'plotter';
export type RangoDeExportacion = 'todo' | 'vista';
export interface OpcionesDeExportacion { papel: Papel; rango: RangoDeExportacion; }

/** En milímetros, apaisado. Plotter = A1. */
export const PAPELES: Record<Papel, { ancho: number; alto: number; formato: string }> = {
  carta: { ancho: 279.4, alto: 215.9, formato: 'letter' },
  a4: { ancho: 297, alto: 210, formato: 'a4' },
  plotter: { ancho: 841, alto: 594, formato: 'a1' },
};

export const MARGEN_MM = 10;
export const CABECERA_MM = 16;
export const PIE_MM = 8;

export interface CorteDePagina { desde: number; alto: number; }

/**
 * Cómo repartir una imagen de `altoPx` en páginas: la escala la pone el ancho y cada corte cae en el borde de una fila, para
 * que ninguna tarea salga partida. La cabecera del diagrama se repite en cada página (`cabeceraPx`).
 */
export function paginar(anchoPx: number, altoPx: number, anchoUtilMm: number, altoUtilMm: number, cabeceraPx: number, filaPx: number): CorteDePagina[] {
  const pxPorMm = anchoPx / anchoUtilMm;
  const altoPaginaPx = Math.floor(altoUtilMm * pxPorMm);
  const cortes: CorteDePagina[] = [];
  let desde = cabeceraPx;
  const cuerpoPorPagina = Math.max(filaPx, Math.floor((altoPaginaPx - cabeceraPx) / filaPx) * filaPx);
  while (desde < altoPx) {
    const alto = Math.min(cuerpoPorPagina, altoPx - desde);
    cortes.push({ desde, alto });
    desde += alto;
  }
  return cortes.length ? cortes : [{ desde: cabeceraPx, alto: Math.max(0, altoPx - cabeceraPx) }];
}

export interface DatosDelDocumento {
  imagen: HTMLCanvasElement;
  /** Alto de la cabecera del diagrama y de una fila, en píxeles de la imagen. */
  cabeceraPx: number;
  filaPx: number;
  titulo: string;
  fecha: string;
  leyenda: Array<{ texto: string; color: string }>;
  etiquetaPagina: (n: number, de: number) => string;
}

function recorte(c: HTMLCanvasElement, cabeceraPx: number, desde: number, alto: number): HTMLCanvasElement {
  const salida = document.createElement('canvas');
  salida.width = c.width;
  salida.height = cabeceraPx + alto;
  const g = salida.getContext('2d');
  if (g) {
    g.drawImage(c, 0, 0, c.width, cabeceraPx, 0, 0, c.width, cabeceraPx);
    g.drawImage(c, 0, desde, c.width, alto, 0, cabeceraPx, c.width, alto);
  }
  return salida;
}

export async function aPdf(d: DatosDelDocumento, papel: Papel, nombre: string): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const p = PAPELES[papel];
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: p.formato });
  const anchoUtil = p.ancho - MARGEN_MM * 2;
  const altoUtil = p.alto - MARGEN_MM * 2 - CABECERA_MM - PIE_MM;
  const cortes = paginar(d.imagen.width, d.imagen.height, anchoUtil, altoUtil, d.cabeceraPx, d.filaPx);
  cortes.forEach((c, i) => {
    if (i > 0) doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor('#0E1114');
    doc.text(d.titulo, MARGEN_MM, MARGEN_MM + 5);
    doc.setFontSize(9);
    doc.setTextColor('#4D5761');
    doc.text(d.fecha, p.ancho - MARGEN_MM, MARGEN_MM + 5, { align: 'right' });
    let x = MARGEN_MM;
    const yLeyenda = MARGEN_MM + 11;
    for (const l of d.leyenda) {
      doc.setFillColor(l.color);
      doc.rect(x, yLeyenda - 2.4, 5, 2.4, 'F');
      doc.setTextColor('#4D5761');
      doc.text(l.texto, x + 6.5, yLeyenda);
      x += 10 + doc.getTextWidth(l.texto);
    }
    const parte = recorte(d.imagen, d.cabeceraPx, c.desde, c.alto);
    /* JPEG: con PNG, una página del Gantt pesaba 14 MB. */
    doc.addImage(parte.toDataURL('image/jpeg', 0.88), 'JPEG', MARGEN_MM, MARGEN_MM + CABECERA_MM, anchoUtil, (parte.height / parte.width) * anchoUtil, undefined, 'FAST');
    doc.setFontSize(8);
    doc.setTextColor('#5F6972');
    doc.text(d.etiquetaPagina(i + 1, cortes.length), p.ancho - MARGEN_MM, p.alto - MARGEN_MM + 2, { align: 'right' });
  });
  doc.save(nombre);
}

export function aPng(d: DatosDelDocumento, nombre: string): void {
  const cabecera = 96;
  const c = document.createElement('canvas');
  c.width = d.imagen.width;
  c.height = d.imagen.height + cabecera;
  const g = c.getContext('2d');
  if (!g) return;
  g.fillStyle = '#FFFFFF';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#0E1114';
  g.font = '600 32px Geist, sans-serif';
  g.fillText(d.titulo, 24, 44);
  g.font = '20px Geist, sans-serif';
  g.fillStyle = '#4D5761';
  g.fillText(d.fecha, c.width - 24 - g.measureText(d.fecha).width, 44);
  let x = 24;
  for (const l of d.leyenda) {
    g.fillStyle = l.color;
    g.fillRect(x, 66, 28, 12);
    g.fillStyle = '#4D5761';
    g.fillText(l.texto, x + 36, 79);
    x += 60 + g.measureText(l.texto).width;
  }
  g.drawImage(d.imagen, 0, cabecera);
  const a = document.createElement('a');
  a.download = nombre;
  a.href = c.toDataURL('image/png');
  a.click();
}
