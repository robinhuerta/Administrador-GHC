import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export const useFirestoreCollection = (collectionName) => {
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    // onSnapshot escucha cambios en la nube en tiempo real
    const unsubscribe = onSnapshot(collection(db, collectionName), (snapshot) => {
      const fetchedDocs = [];
      snapshot.forEach(doc => {
        fetchedDocs.push({ id: doc.id, ...doc.data() });
      });
      // Ordenamos en el cliente para evitar errores de índices de Firestore en la primera prueba
      setDocs(fetchedDocs.sort((a, b) => b.createdAt - a.createdAt));
    }, (error) => {
      console.error("Error al obtener datos: ", error);
    });

    return () => unsubscribe();
  }, [collectionName]);

  const addDocument = async (data) => {
    try {
      await addDoc(collection(db, collectionName), { 
        ...data, 
        createdAt: Date.now() 
      });
    } catch (e) {
      console.error("Error al agregar documento: ", e);
      alert("Error al guardar en la nube. Revisa si Firestore está en modo prueba.");
    }
  };

  const deleteDocument = async (id) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (e) {
      console.error("Error al eliminar: ", e);
    }
  };

  const updateDocument = async (id, data) => {
    try {
      await updateDoc(doc(db, collectionName, id), data);
    } catch (e) {
      console.error("Error al actualizar: ", e);
    }
  };

  return [docs, addDocument, deleteDocument, updateDocument];
};
