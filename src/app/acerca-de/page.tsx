import Image from 'next/image';
export default function AcercaDePage() {
  return (
    <div className="bg-surface py-16">
      <div className="container mx-auto px-6 text-center">
        <h1 className="text-4xl font-bold text-primary mb-12">
          Sobre Nosotros
        </h1>
        <div className="bg-background p-8 rounded-lg shadow-lg max-w-4xl mx-auto border border-primary/20 text-left">
          <h2 className="text-3xl font-bold text-primary mb-4">Quién está detrás</h2>
          <p className="text-lg text-text-secondary mb-4">
            Soy <span className="font-bold text-text-primary">Bere Cárdenas</span>, abogada de formación y cosmetóloga cosmiatra, con más de 10 años de experiencia y diplomado en dermatofuncional.
          </p>
          <p className="text-text-secondary mb-4 leading-relaxed">
            Esta combinación de conocimientos me permite ofrecer una visión única: unir la parte legal y normativa con la práctica estética profesional, garantizando a cada alumno no solo aprender técnicas actualizadas, sino también ejercer con seguridad jurídica y ética profesional.
          </p>
          <div className="text-center">
            <Image
              src="/berenice.jpg"
              alt="Foto de Bere Cárdenas"
              width={400}
              height={400}
              className="rounded-lg object-cover mx-auto border-2 border-primary"
            />
          </div>
          <div className="border-t border-primary/20 my-8"></div>
          <h3 className="text-2xl font-bold text-primary mt-8 mb-2">Nuestra Misión</h3>
          <p className="text-text-secondary leading-relaxed">
            Formar cosmetólogos, cosmiatras y profesionales de la estética que trabajen con protocolos seguros, tecnologías avanzadas y fundamentos científicos, siempre dentro de un marco de respeto, responsabilidad y amor por la profesión.
          </p>
          
        </div>
        
      </div>
      
    </div>
  );
}