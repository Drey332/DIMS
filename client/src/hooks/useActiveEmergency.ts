import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

export interface Emergency {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED';
  startTime: string;
  protocol?: string;
  musterPoint?: {
    lat: number;
    lng: number;
  };
  notifiedContacts?: Array<{
    roleKey: string;
    name: string;
    phone: string;
    title: string;
  }>;
  createdAt: string;
}

export function useActiveEmergency(): Emergency | null {
  const [emergency, setEmergency] = useState<Emergency | null>(null);

  useEffect(() => {
    // Query for active emergencies, ordered by creation time (most recent first)
    const emergenciesRef = collection(db, 'emergencies');
    const q = query(
      emergenciesRef,
      where('status', '==', 'ACTIVE'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setEmergency(null);
      } else {
        const doc = snapshot.docs[0];
        setEmergency({
          id: doc.id,
          ...doc.data()
        } as Emergency);
      }
    }, (error) => {
      console.error('Error listening for active emergencies:', error);
      setEmergency(null);
    });

    return () => unsubscribe();
  }, []);

  return emergency;
}