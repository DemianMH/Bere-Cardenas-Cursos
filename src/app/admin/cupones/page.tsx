"use client";
import { useEffect, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth } from '@/lib/firebase'; // Importar auth
import { useAuth } from '@/context/AuthContext';

interface Coupon {
  id?: string;
  code: string;
  discountPercentage: number;
  active: boolean;
  createdAt?: { seconds: number, nanoseconds: number };
}

export default function AdminCuponesPage() {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const functions = getFunctions(app, 'us-central1');
  const manageCoupons = httpsCallable(functions, 'manageCoupons');

  const fetchCoupons = async () => {
    setLoading(true);
    setError(null);
    try {
      // httpsCallable maneja la autenticación automáticamente si el usuario está logueado
      const result: any = await manageCoupons({ action: 'listCoupons' });
      if (result.data.success) {
        setCoupons(result.data.coupons);
      } else {
        throw new Error(result.data.message || 'Error al cargar cupones');
      }
    } catch (err: any) {
      console.error("Error al cargar cupones:", err);
      setError(err.message || 'No se pudo cargar la lista de cupones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.rol === 'docente') {
      fetchCoupons();
    } else if (user === null) {
        // Podrías redirigir si no es docente, aunque el layout ya lo hace
    }
  }, [user]);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const discount = parseInt(newCouponDiscount, 10);
    if (!newCouponCode.trim() || !newCouponDiscount || isNaN(discount) || discount <= 0 || discount > 100) {
      setError('Código inválido o porcentaje debe ser entre 1 y 100.');
      return;
    }
    setIsSubmitting(true);
    try {
      const result: any = await manageCoupons({
        action: 'createCoupon',
        data: { code: newCouponCode, discountPercentage: discount }
      });
      if (result.data.success) {
        setNewCouponCode('');
        setNewCouponDiscount('');
        fetchCoupons(); // Recargar la lista
      } else {
        // Si la función onCall lanza un error, entra en el catch
        throw new Error(result.data.message || 'Error al crear cupón');
      }
    } catch (err: any) {
      console.error("Error al crear cupón:", err);
      setError(err.message || 'No se pudo crear el cupón.'); // Mostrar error de la función
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el cupón "${code}"?`)) {
      setLoading(true); // Usar setLoading para indicar operación en curso
      try {
        const result: any = await manageCoupons({ action: 'deleteCoupon', data: { id } });
        if (result.data.success) {
          fetchCoupons(); // Recargar lista
        } else {
          throw new Error(result.data.message || 'Error al eliminar cupón');
        }
      } catch (err: any) {
        console.error("Error al eliminar cupón:", err);
        alert(err.message || 'No se pudo eliminar el cupón.');
        setLoading(false); // Detener indicador si hay error
      }
      // setLoading(false) se maneja en fetchCoupons si tiene éxito
    }
  };

   const handleToggleCouponStatus = async (id: string, currentStatus: boolean) => {
     setLoading(true); // Indicar operación en curso
     try {
       const result: any = await manageCoupons({
         action: 'toggleCouponStatus',
         data: { id, active: !currentStatus }
       });
       if (result.data.success) {
         fetchCoupons(); // Recargar lista
       } else {
         throw new Error(result.data.message || 'Error al cambiar estado del cupón');
       }
     } catch (err: any) {
       console.error("Error al cambiar estado:", err);
       alert(err.message || 'No se pudo cambiar el estado del cupón.');
       setLoading(false); // Detener indicador si hay error
     }
      // setLoading(false) se maneja en fetchCoupons si tiene éxito
   };

  return (
    <div className="container mx-auto px-6 py-12">
      <h1 className="text-4xl text-center font-bold text-primary mb-10">
        Gestionar Cupones de Descuento
      </h1>

      <div className="bg-surface p-8 rounded-lg shadow-lg max-w-lg mx-auto border border-primary/20 mb-8">
        <h2 className="text-2xl font-bold text-primary mb-6">Crear Nuevo Cupón</h2>
        <form onSubmit={handleCreateCoupon} className="space-y-4">
          <div>
            <label htmlFor="couponCode" className="block text-text-secondary font-bold mb-2">Código del Cupón</label>
            <input
              id="couponCode"
              type="text"
              value={newCouponCode}
              onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
              placeholder="EJ: BIENVENIDO10"
              className="bg-background shadow border border-gray-700 rounded w-full py-2 px-3 text-text-primary focus:outline-none focus:border-primary"
              required
              minLength={3}
            />
          </div>
          <div>
            <label htmlFor="couponDiscount" className="block text-text-secondary font-bold mb-2">Porcentaje de Descuento (%)</label>
            <input
              id="couponDiscount"
              type="number"
              value={newCouponDiscount}
              onChange={(e) => setNewCouponDiscount(e.target.value)}
              placeholder="Ej: 15"
              min="1"
              max="100"
              className="bg-background shadow border border-gray-700 rounded w-full py-2 px-3 text-text-primary focus:outline-none focus:border-primary"
              required
            />
          </div>
          {error && <p className="text-red-500 text-xs italic">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="w-full bg-primary text-background font-bold py-3 px-4 rounded-full hover:opacity-90 disabled:bg-gray-500"
          >
            {isSubmitting ? 'Creando...' : 'Crear Cupón'}
          </button>
        </form>
      </div>

      <div className="bg-surface p-6 rounded-lg shadow-lg max-w-3xl mx-auto border border-primary/20 overflow-x-auto">
         <h2 className="text-2xl font-bold text-primary mb-6">Cupones Existentes</h2>
         {loading && <p className="text-center text-text-secondary">Cargando cupones...</p>}
         {!loading && coupons.length === 0 && <p className="text-center text-text-secondary">No hay cupones creados.</p>}
         {!loading && coupons.length > 0 && (
           <table className="w-full text-left min-w-[500px]">
             <thead className="border-b border-primary/30">
               <tr>
                 <th className="p-3 text-text-primary">Código</th>
                 <th className="p-3 text-text-primary">Descuento</th>
                 <th className="p-3 text-text-primary text-center">Estado</th>
                 <th className="p-3 text-text-primary text-right">Acciones</th>
               </tr>
             </thead>
             <tbody>
               {coupons.map(coupon => (
                 <tr key={coupon.id} className="border-b border-gray-700 hover:bg-background">
                   <td className="p-3 font-mono text-text-secondary">{coupon.code}</td>
                   <td className="p-3 text-text-secondary">{coupon.discountPercentage}%</td>
                    <td className="p-3 text-center">
                     <button
                       onClick={() => handleToggleCouponStatus(coupon.id!, coupon.active)}
                       disabled={loading}
                       className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors disabled:opacity-50 ${
                         coupon.active ? 'bg-green-600/30 text-green-300 hover:bg-green-500 hover:text-white' : 'bg-yellow-600/30 text-yellow-300 hover:bg-yellow-500 hover:text-white'
                       }`}
                     >
                       {coupon.active ? 'Activo' : 'Inactivo'}
                     </button>
                   </td>
                   <td className="p-3 text-right">
                     <button
                       onClick={() => handleDeleteCoupon(coupon.id!, coupon.code)}
                       disabled={loading}
                       className="text-red-400 hover:underline text-xs disabled:opacity-50"
                     >
                       Eliminar
                     </button>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         )}
      </div>
    </div>
  );
}