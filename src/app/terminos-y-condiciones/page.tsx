export default function TerminosPage() {
  return (
    <div>
      <div className="bg-surface py-12">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold text-primary">Términos y Condiciones</h1>
        </div>
      </div>
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="bg-surface p-8 sm:p-10 rounded-lg shadow-lg space-y-6 border border-primary/20">
          <section>
            <h2 className="text-2xl font-bold text-primary mb-2">1. Aceptación de los términos</h2>
            <p className="text-text-secondary">El acceso y uso de los servicios de capacitación ofrecidos por Bere Cárdenas Capacitación en Cosmetología Integral implica la aceptación plena de los presentes Términos y Condiciones...</p>
          </section>
          {/* Repite la estructura <section> para cada uno de los puntos */}
        </div>
      </div>
    </div>
  );
}