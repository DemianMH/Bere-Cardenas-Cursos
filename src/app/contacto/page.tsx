// src/app/contacto/page.tsx
export default function ContactoPage() {
  return (
    <div className="container mx-auto px-6 py-16">
      <h1 className="text-4xl text-center font-bold text-primary-dark mb-12">
        Ponte en Contacto
      </h1>
      <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl mx-auto text-center">
        <p className="text-lg text-gray-700 mb-4">
          ¿Tienes dudas o quieres más información sobre nuestros cursos? ¡Contáctanos!
        </p>
        <div className="text-xl text-primary-dark space-y-4 mt-6">
          <p>
            <strong>Teléfono / WhatsApp:</strong> 
            <a href="https://wa.me/523316942473" className="text-primary-medium hover:underline ml-2">
              33 1694 2473
            </a>
          </p>
          <p>
            <strong>Instagram:</strong> 
            <a href="https://www.instagram.com/bere.cardenas_cosmetologia" target="_blank" rel="noopener noreferrer" className="text-primary-medium hover:underline ml-2">
              @bere.cardenas_cosmetologia
            </a>
          </p>
          <p>
            <strong>Facebook:</strong> 
            <a href="https://www.facebook.com/BereCardenasCosmetologiaIntegral" target="_blank" rel="noopener noreferrer" className="text-primary-medium hover:underline ml-2">
              Bere Cardenas Cosmetologia Integral
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}