import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="bg-surface mt-16 py-8">
      <div className="container mx-auto px-6 text-center text-text-secondary">
        <p>&copy; {new Date().getFullYear()} Bere Cárdenas Cosmetología Integral. Todos los derechos reservados.</p>
        <div className="flex justify-center space-x-4 mt-4">
          <a href="https://www.facebook.com/BereCardenasCosmetologiaIntegral" target="_blank" rel="noopener noreferrer" className="hover:text-primary">Facebook</a>
          <a href="https://www.instagram.com/bere.cardenas_cosmetologia" target="_blank" rel="noopener noreferrer" className="hover:text-primary">Instagram</a>
          <a href="https://www.tiktok.com/@Bere.cardenas.cosme" target="_blank" rel="noopener noreferrer" className="hover:text-primary">TikTok</a>
        </div>
        <div className="mt-4">
          <p>Contacto: 33 1694 2473</p>
        </div>
        <div className="mt-4 text-sm">
          <Link href="/terminos-y-condiciones" className="hover:text-primary">Términos y Condiciones</Link>
          <span className="mx-2">|</span>
          <Link href="/aviso-de-privacidad" className="hover:text-primary">Aviso de Privacidad</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;