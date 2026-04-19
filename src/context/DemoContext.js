import React, { createContext, useContext, useState, useCallback } from 'react';
import { setDemoMode, countDemoExpenses, clearDemoData } from '../db/database';
import { seedDemoData } from '../db/seed';

const DemoContext = createContext();

export function DemoProvider({ children }) {
  const [isDemoMode, setIsDemoMode] = useState(false);

  const enterDemo = useCallback(async () => {
    setDemoMode(true);
    const cnt = await countDemoExpenses();
    if (cnt === 0) await seedDemoData();
    setIsDemoMode(true);
  }, []);

  const exitDemo = useCallback(async () => {
    setDemoMode(false);
    setIsDemoMode(false);
  }, []);

  const clearDemo = useCallback(async () => {
    if (!isDemoMode) return;
    await clearDemoData();
  }, [isDemoMode]);

  return (
    <DemoContext.Provider value={{ isDemoMode, enterDemo, exitDemo, clearDemo }}>
      {children}
    </DemoContext.Provider>
  );
}

export const useDemo = () => useContext(DemoContext);
