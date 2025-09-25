export default function TerminosPage() {
  return (
    <div>
      {/* Encabezado de la Página */}
      <div className="bg-primary-light py-12">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold text-primary-dark">
            Términos y Condiciones de Uso
          </h1>
          <p className="text-lg text-primary-dark mt-2">
            Bere Cárdenas Capacitación en Cosmetología Integral
          </p>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="bg-white p-8 sm:p-10 rounded-lg shadow-md space-y-6">
          
          <section>
            <h2 className="text-2xl font-bold text-primary-dark mb-2">1. Aceptación de los términos</h2>
            <p className="text-gray-700">El acceso y uso de los servicios de capacitación ofrecidos por Bere Cárdenas Capacitación en Cosmetología Integral implica la aceptación plena de los presentes Términos y Condiciones. Si el usuario no está de acuerdo con ellos, deberá abstenerse de utilizar los servicios.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary-dark mb-2">2. Servicios ofrecidos</h2>
            <p className="text-gray-700">Bere Cárdenas ofrece cursos, talleres y capacitaciones en cosmetología integral, estética avanzada y áreas afines. Cada programa cuenta con un temario, duración y modalidad específica, que será comunicado al alumno antes de su inscripción.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary-dark mb-2">3. Inscripciones y pagos</h2>
            <p className="text-gray-700">La inscripción queda confirmada únicamente cuando se haya efectuado el pago correspondiente. Los pagos realizados no son reembolsables, salvo en casos de cancelación por parte de la institución.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary-dark mb-2">4. Derechos de autor y propiedad intelectual</h2>
            <p className="text-gray-700">Todo el material didáctico, presentaciones, manuales, grabaciones y contenidos de los cursos están protegidos por derechos de autor. Queda estrictamente prohibida la reproducción, distribución o uso no autorizado de dicho material con fines comerciales o de enseñanza sin autorización expresa y por escrito de Bere Cárdenas.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-primary-dark mb-2">5. Responsabilidad del alumno</h2>
            <p className="text-gray-700">Es responsabilidad del participante aplicar los conocimientos adquiridos dentro del marco legal y ético correspondiente.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-primary-dark mb-2">6. Certificación</h2>
            <p className="text-gray-700">Al concluir satisfactoriamente el curso, el alumno recibirá constancia o certificado de participación, conforme a lo estipulado en la descripción del programa.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-primary-dark mb-2">7. Modificaciones</h2>
            <p className="text-gray-700">Bere Cárdenas se reserva el derecho de modificar en cualquier momento los presentes Términos y Condiciones, así como los contenidos y fechas de los programas, con el fin de mejorar la calidad de los servicios.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-primary-dark mb-2">8. Datos personales</h2>
            <p className="text-gray-700">Los datos proporcionados por los alumnos serán tratados con confidencialidad y únicamente utilizados para fines administrativos y académicos, conforme a la legislación aplicable en materia de protección de datos.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-primary-dark mb-2">9. Legislación aplicable</h2>
            <p className="text-gray-700">Estos Términos y Condiciones se rigen por las leyes mexicanas. Cualquier controversia será sometida a la jurisdicción de los tribunales competentes de Guadalajara.</p>
          </section>
        </div>
      </div>
    </div>
  );
}