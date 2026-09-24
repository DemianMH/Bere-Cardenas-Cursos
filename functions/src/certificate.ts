import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

interface CertificateParams {
  studentName: string;
  courseTitle: string;
  date: string;
}

const GOLD = rgb(0.831, 0.686, 0.216);
const DARK = rgb(0.071, 0.071, 0.071);
const WHITE = rgb(1, 1, 1);
const GRAY = rgb(0.66, 0.66, 0.66);

export async function generateCertificatePdf({ studentName, courseTitle, date }: CertificateParams): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]); // A4 apaisado
  const { width, height } = page.getSize();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const centered = (text: string, y: number, size: number, useFont = font, color = WHITE) => {
    page.drawText(text, {
      x: width / 2 - useFont.widthOfTextAtSize(text, size) / 2,
      y,
      size,
      font: useFont,
      color,
    });
  };

  page.drawRectangle({ x: 0, y: 0, width, height, color: DARK });
  page.drawRectangle({
    x: 24, y: 24, width: width - 48, height: height - 48,
    borderColor: GOLD, borderWidth: 3,
  });

  centered("CONSTANCIA DE FINALIZACIÓN", height - 130, 28, fontBold, GOLD);
  centered("Bere Cárdenas Cosmetología Integral", height - 160, 14, font, GRAY);

  centered("Se otorga la presente constancia a:", height - 240, 14, font, GRAY);
  centered(studentName, height - 285, 32, fontBold, WHITE);

  centered(`por haber completado satisfactoriamente el curso`, height - 335, 14, font, GRAY);
  centered(`"${courseTitle}"`, height - 360, 18, fontBold, GOLD);

  centered(date, 70, 12, font, GRAY);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
