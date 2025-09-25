export default function PrivacidadPage() {
  return (
    <div>
      {/* Encabezado de la Página */}
      <div className="bg-primary-light py-12">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold text-primary-dark">
            Aviso de Privacidad
          </h1>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="bg-white p-8 sm:p-10 rounded-lg shadow-md space-y-6">
          
          <p className="text-gray-700">En Bere Cárdenas Cosmetología Integral, con domicilio en Guadalajara, Jalisco, nos comprometemos a proteger y respetar tu privacidad. Este aviso detalla cómo recopilamos, utilizamos y protegemos tus datos personales en cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.</p>
          
          <section>
            <h2 className="text-2xl font-bold text-primary-dark mb-2">Datos que recopilamos</h2>
            <p className="text-gray-700">Recopilamos los siguientes datos personales:</p>
            <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1">
              <li>Nombre completo</li>
              <li>Correo electrónico</li>
              <li>Datos de contacto</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary-dark mb-2">Finalidad del tratamiento de datos</h2>
            <p className="text-gray-700">Tus datos serán utilizados para las siguientes finalidades:</p>
            <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1">
              <li>Proveer los servicios de capacitación solicitados.</li>
              <li>Fines administrativos, como la gestión de inscripciones y pagos.</li>
              <li>Enviar comunicaciones sobre nuestros cursos y promociones (con tu consentimiento).</li>
              <li>Evaluar la calidad de nuestros servicios.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary-dark mb-2">Derechos ARCO</h2>
            <p className="text-gray-700">Tienes derecho a Acceder, Rectificar, Cancelar u Oponerte al tratamiento de tus datos personales. Para ejercer estos derechos, por favor envía una solicitud al correo electrónico que se proporcionará próximamente.</p>
          </section>
          
          <p className="text-gray-700">Este aviso de privacidad puede ser modificado en cualquier momento. Te recomendamos revisarlo periódicamente.</p>
          <p className="text-sm text-gray-500"><strong>Última actualización:</strong> 25 de Septiembre de 2025</p>
        </div>
      </div>
    </div>
  );
}