export const openIndexedDB = async (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AlphaSimulator', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create simulations store if it doesn't exist
      if (!db.objectStoreNames.contains('simulations')) {
        const store = db.createObjectStore('simulations', { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }
    };
  });
};

export const addSimulation = async (simulation: any): Promise<void> => {
  const db = await openIndexedDB();
  const tx = db.transaction('simulations', 'readwrite');
  const store = tx.objectStore('simulations');
  await store.add(simulation);
};

export const getSimulations = async (): Promise<any[]> => {
  const db = await openIndexedDB();
  const tx = db.transaction('simulations', 'readonly');
  const store = tx.objectStore('simulations');
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const updateSimulation = async (id: string, updates: Partial<any>): Promise<void> => {
  const db = await openIndexedDB();
  const tx = db.transaction('simulations', 'readwrite');
  const store = tx.objectStore('simulations');
  
  const simulation = await new Promise<any>((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  if (simulation) {
    const updated = { ...simulation, ...updates, updated_at: Date.now() };
    await store.put(updated);
  }
}; 