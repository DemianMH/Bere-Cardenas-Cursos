import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

interface CertificateParams {
  studentName: string;
  templateUrl: string;
}

const NAME_COLOR = rgb(0.16, 0.16, 0.16);

export async function generateCertificatePdf({ studentName, templateUrl }: CertificateParams): Promise<Buffer> {
  const response = await fetch(templateUrl);
  if (!response.ok) {
    throw new Error(`No se pudo descargar la plantilla de constancia (HTTP ${response.status}).`);
  }
  const templateBytes = Buffer.from(await response.arrayBuffer());

  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPage(0);
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  // Todas las plantillas de constancia usan el mismo formato/diseño base, así que
  // el nombre siempre va en el mismo lugar relativo: el espacio en blanco entre
  // "DE RECONOCIMIENTO" y la línea divisoria, centrado en la mitad derecha.
  const fontSize = 26;
  const textWidth = font.widthOfTextAtSize(studentName, fontSize);
  const centerX = width * 0.685;
  const y = height * 0.585;

  page.drawText(studentName, {
    x: centerX - textWidth / 2,
    y,
    size: fontSize,
    font,
    color: NAME_COLOR,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
