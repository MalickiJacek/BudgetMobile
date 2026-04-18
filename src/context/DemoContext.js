import React, { createContext, useContext, useState, useCallback } from 'react';
import { setDemoMode, getDb } from '../db/database';
import { seedDemoData, clearAllData } from '../db/seed';

const DemoContext = createContext();

export function DemoProvider({ children }) {
  const [isDemoMode, setIsDemoMode] = useState(false);

  const enterDemo = useCallback(async () => {
    setDemoMode(true);
    // Upewnij się że demo DB ma dane
    const db = await getDb();
    const { cnt } = await db.getFirstAsync('SELECT COUNT(*) as cnt FROM expenses');
    if (cnt === 0) await seedDemoData(db);
    setIsDemoMode(true);
  }, []);

  const exitDemo = useCallback(async () => {
    setDemoMode(false);
    setIsDemoMode(false);
  }, []);

  const clearDemo = useCallback(async () => {
    if (!isDemoMode) return;
    const db = await getDb();
    await clearAllData(db);
  }, [isDemoMode]);

  return (
    <DemoContext.Provider value={{ isDemoMode, enterDemo, exitDemo, clearDemo }}>
      {children}
    </DemoContext.Provider>
  );
}

export const useDemo = () => useContext(DemoContext);
