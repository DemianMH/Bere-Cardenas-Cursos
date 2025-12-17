export default function ContactoPage() {
  return (
    <div className="bg-surface py-16">
      <div className="container mx-auto px-6 text-center">
        <h1 className="text-4xl font-bold text-primary mb-12">
          Ponte en Contacto
        </h1>
        <div className="bg-background p-8 rounded-lg shadow-lg max-w-2xl mx-auto text-center border border-primary/20">
          <p className="text-lg text-text-secondary mb-4">
            ¿Tienes dudas o quieres más información sobre nuestros cursos? ¡Contáctanos!
          </p>
          <div className="text-xl text-text-primary space-y-4 mt-6">
            <p>
              <strong>Teléfono / WhatsApp:</strong> 
              <a href="https://wa.me/523316942473" className="text-primary hover:underline ml-2">
                33 1694 2473
              </a>
            </p>
            <p>
              <strong>Instagram:</strong> 
              <a href="https://www.instagram.com/bere.cardenas_cosmetologia" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-2">
                @bere.cardenas_cosmetologia
              </a>
            </p>
            <p>
              <strong>Facebook:</strong> 
              <a href="https://www.facebook.com/BereCardenasCosmetologiaIntegral" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-2">
                Bere Cardenas Cosmetologia Integral
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}