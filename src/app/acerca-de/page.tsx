// src/app/acerca-de/page.tsx
export default function AcercaDePage() {
  return (
    <div className="container mx-auto px-6 py-16">
      <h1 className="text-4xl text-center font-bold text-primary-dark mb-12">
        Sobre Nosotros
      </h1>
      <div className="bg-white p-8 rounded-lg shadow-md max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-primary-dark mb-4">Quién está detrás</h2>
        <p className="text-lg text-gray-700 mb-4">
          Soy <span className="font-bold text-primary-medium">Bere Cárdenas</span>, abogada de formación y cosmetóloga cosmiatra, con más de 10 años de experiencia y diplomado en dermatofuncional.
        </p>
        <p className="text-gray-600 mb-4">
          Esta combinación de conocimientos me permite ofrecer una visión única: unir la parte legal y normativa con la práctica estética profesional, garantizando a cada alumno no solo aprender técnicas actualizadas, sino también ejercer con seguridad jurídica y ética profesional.
        </p>
        <h3 className="text-2xl font-bold text-primary-dark mt-8 mb-2">Nuestra Misión</h3>
        <p className="text-gray-600">
          Formar cosmetólogos, cosmiatras y profesionales de la estética que trabajen con protocolos seguros, tecnologías avanzadas y fundamentos científicos, siempre dentro de un marco de respeto, responsabilidad y amor por la profesión.
        </p>
      </div>
    </div>
  );
}