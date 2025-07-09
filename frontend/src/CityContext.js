import { createContext, useContext } from 'react';

export const CityContext = createContext();
export function useCity() {
  return useContext(CityContext);
} 