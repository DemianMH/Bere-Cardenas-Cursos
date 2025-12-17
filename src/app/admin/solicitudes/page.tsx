// RUTA: src/app/admin/solicitudes/page.tsx

"use client";

import { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

interface TransferRequest {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  courseId: string;
  courseTitle: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: any; // Firestore Timestamp
}

export default function AdminSolicitudesPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, "transferRequests"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const requestsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TransferRequest[];
      setRequests(requestsData);
    } catch (error) {
      console.error("Error al cargar las solicitudes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const handleConfirm = async (request: TransferRequest) => {
    if (!window.confirm(`¿Estás seguro de confirmar la inscripción de ${request.userName} al curso "${request.courseTitle}"?`)) return;

    try {
      // 1. Añadir el curso al array 'cursosInscritos' del usuario
      const userDocRef = doc(db, 'users', request.userId);
      await updateDoc(userDocRef, {
        cursosInscritos: arrayUnion(request.courseId)
      });

      // 2. Actualizar el estado de la solicitud a 'confirmed'
      const requestDocRef = doc(db, 'transferRequests', request.id);
      await updateDoc(requestDocRef, {
        status: 'confirmed'
      });

      alert('Inscripción confirmada con éxito. El usuario ya tiene acceso al curso.');
      fetchRequests(); // Recargar la lista de solicitudes
    } catch (error) {
      console.error("Error al confirmar la inscripción:", error);
      alert('Ocurrió un error al confirmar la inscripción. Revisa la consola para más detalles.');
    }
  };

  const handleCancel = async (requestId: string) => {
    if (!window.confirm('¿Estás seguro de cancelar esta solicitud? Esta acción no se puede deshacer.')) return;
    try {
      const requestDocRef = doc(db, 'transferRequests', requestId);
      await updateDoc(requestDocRef, {
        status: 'cancelled'
      });
      alert('Solicitud cancelada.');
      fetchRequests();
    } catch (error) {
      console.error("Error al cancelar la solicitud:", error);
      alert('Ocurrió un error al cancelar.');
    }
  };
  
  const filteredRequests = requests.filter(r => filter === 'all' || r.status === filter);

  if (loading) {
    return <p className="text-center mt-12 text-text-secondary">Cargando solicitudes...</p>;
  }

  return (
    <div className="container mx-auto px-6 py-12">
      <h1 className="text-4xl text-center font-bold text-primary mb-10">
        Solicitudes de Transferencia
      </h1>

      <div className="text-center mb-8">
        <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-l-lg ${filter === 'pending' ? 'bg-primary text-background' : 'bg-surface text-text-primary'}`}>Pendientes</button>
        <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-r-lg ${filter === 'all' ? 'bg-primary text-background' : 'bg-surface text-text-primary'}`}>Todas</button>
      </div>

      <div className="space-y-6 max-w-4xl mx-auto">
        {filteredRequests.length > 0 ? (
          filteredRequests.map(req => (
            <div key={req.id} className="bg-surface p-6 rounded-lg shadow-lg border border-primary/20">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-bold text-lg text-primary">{req.userName}</p>
                  <p className="text-sm text-text-secondary">Tel: {req.userPhone}</p>
                </div>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                  req.status === 'pending' ? 'bg-yellow-200/20 text-yellow-300' :
                  req.status === 'confirmed' ? 'bg-green-200/20 text-green-300' : 'bg-red-200/20 text-red-300'
                }`}>
                  {req.status}
                </span>
              </div>
              <p className="text-text-primary my-4">
                Solicita inscripción al curso: <strong className="font-semibold">{req.courseTitle}</strong>
              </p>
              <p className="text-xs text-text-secondary/70 mb-4">
                Fecha de solicitud: {new Date(req.createdAt?.toDate()).toLocaleString()}
              </p>
              
              {req.status === 'pending' && (
                <div className="flex gap-4 border-t border-primary/20 pt-4 mt-4">
                  <button 
                    onClick={() => handleConfirm(req)}
                    className="w-full bg-green-600/20 text-green-300 font-bold py-2 px-4 rounded-full text-sm hover:bg-green-500 hover:text-white transition-colors"
                  >
                    Confirmar Inscripción
                  </button>
                  <button 
                    onClick={() => handleCancel(req.id)}
                    className="w-full bg-red-600/20 text-red-300 font-bold py-2 px-4 rounded-full text-sm hover:bg-red-500 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center bg-surface p-8 rounded-lg shadow-lg border border-primary/20">
            <p className="text-text-secondary">No hay solicitudes en esta categoría.</p>
          </div>
        )}
      </div>
    </div>
  );
}