import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as fs from "fs";
import * as path from "path";

interface CertificateParams {
  studentName: string;
  courseTitle: string;
  date: string;
}

const TEMPLATE_PATH = path.join(__dirname, "..", "assets", "certificado-hifu.pdf");
const NAME_COLOR = rgb(0.16, 0.16, 0.16);

export async function generateCertificatePdf({ studentName }: CertificateParams): Promise<Buffer> {
  const templateBytes = fs.readFileSync(TEMPLATE_PATH);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPage(0);
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  // Espacio en blanco del diseño, entre "DE RECONOCIMIENTO" y la línea divisoria,
  // centrado en la mitad derecha de la constancia.
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
