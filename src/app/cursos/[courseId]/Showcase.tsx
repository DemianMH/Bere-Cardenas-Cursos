import Image from 'next/image';

// Carrusel de una sola imagen a la vez, con cruce de opacidad (crossfade) automático.
// Es CSS puro (sin JS) para que funcione igual de bien server-rendered, sin depender de hidratación.
function FadeCarousel({ images, sectionId }: { images: string[]; sectionId: string }) {
  const n = images.length;
  if (n === 0) return null;

  const slideDuration = 4; // segundos que cada imagen permanece visible
  const totalDuration = n * slideDuration;
  const fadeShare = Math.min(8, 100 / n / 3); // % de la duración total usado para el fundido

  const keyframes = `
@keyframes ${sectionId}-fade {
  0% { opacity: 0; }
  ${fadeShare}% { opacity: 1; }
  ${100 / n - fadeShare}% { opacity: 1; }
  ${100 / n}% { opacity: 0; }
  100% { opacity: 0; }
}`;

  return (
    <div className="relative w-full aspect-[4/5] sm:aspect-video max-w-xl mx-auto rounded-lg overflow-hidden bg-background border border-primary/20">
      <style dangerouslySetInnerHTML={{ __html: keyframes }} />
      {images.map((url, i) => (
        <div
          key={url + i}
          className="absolute inset-0"
          style={{
            animation: `${sectionId}-fade ${totalDuration}s infinite`,
            animationDelay: `${i * slideDuration}s`,
            opacity: i === 0 ? 1 : 0,
          }}
        >
          <Image src={url} alt="" fill sizes="600px" className="object-cover" />
        </div>
      ))}
    </div>
  );
}

// Franja horizontal que se desplaza sola en bucle infinito (marquee). CSS puro.
function MarqueeCarousel({
  images,
  sectionId,
  direction = 'left',
  speedSeconds = 30,
}: {
  images: string[];
  sectionId: string;
  direction?: 'left' | 'right';
  speedSeconds?: number;
}) {
  if (images.length === 0) return null;
  // Duplicamos la lista para que el bucle sea continuo sin salto visible
  const looped = [...images, ...images];

  const keyframes = `
@keyframes ${sectionId}-marquee {
  from { transform: translateX(${direction === 'left' ? '0' : '-50%'}); }
  to { transform: translateX(${direction === 'left' ? '-50%' : '0'}); }
}`;

  return (
    <div className="overflow-hidden w-full">
      <style dangerouslySetInnerHTML={{ __html: keyframes }} />
      <div
        className="flex gap-4 w-max"
        style={{ animation: `${sectionId}-marquee ${speedSeconds}s linear infinite` }}
      >
        {looped.map((url, i) => (
          <div key={url + i} className="relative w-56 sm:w-64 aspect-[4/5] flex-shrink-0 rounded-lg overflow-hidden bg-background border border-primary/20">
            <Image src={url} alt="" fill sizes="256px" className="object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface CourseShowcaseProps {
  resultados: string[];
  testimonios: string[];
  alumnas: string[];
}

export default function CourseShowcase({ resultados, testimonios, alumnas }: CourseShowcaseProps) {
  const hasAny = resultados.length > 0 || testimonios.length > 0 || alumnas.length > 0;
  if (!hasAny) return null;

  return (
    <div className="container mx-auto px-4 py-4 space-y-16">
      {resultados.length > 0 && (
        <section>
          <h2 className="text-3xl font-bold text-primary text-center mb-8">Resultados</h2>
          <FadeCarousel images={resultados} sectionId="resultados" />
        </section>
      )}

      {testimonios.length > 0 && (
        <section>
          <h2 className="text-3xl font-bold text-primary text-center mb-8">Lo que dicen nuestras alumnas</h2>
          <MarqueeCarousel images={testimonios} sectionId="testimonios" direction="left" speedSeconds={28} />
        </section>
      )}

      {alumnas.length > 0 && (
        <section>
          <h2 className="text-3xl font-bold text-primary text-center mb-8">Alumnas Certificadas</h2>
          <MarqueeCarousel images={alumnas} sectionId="alumnas" direction="right" speedSeconds={36} />
        </section>
      )}
    </div>
  );
}
