export default function PrivacidadPage() {
  return (
    <div>
      <div className="bg-surface py-12">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold text-primary">Aviso de Privacidad</h1>
        </div>
      </div>
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="bg-surface p-8 sm:p-10 rounded-lg shadow-lg space-y-6 border border-primary/20">
          <p className="text-text-secondary">En Bere Cárdenas Cosmetología Integral, nos comprometemos a proteger y respetar tu privacidad...</p>
          <section>
            <h2 className="text-2xl font-bold text-primary mb-2">Datos que recopilamos</h2>
            <ul className="list-disc list-inside text-text-secondary mt-2 space-y-1">
              <li>Nombre completo</li>
              <li>Correo electrónico</li>
              <li>Datos de contacto</li>
            </ul>
          </section>
          {/* Repite la estructura <section> para cada uno de los puntos */}
        </div>
      </div>
    </div>
  );
}