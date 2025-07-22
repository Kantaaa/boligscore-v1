
import { Property, Weights } from '../types';
import { DEFAULT_WEIGHTS } from '../constants';

const PROPERTIES_KEY = 'boligscore_properties';
const WEIGHTS_KEY = 'boligscore_weights';

export const getStoredProperties = (): Property[] => {
  const stored = localStorage.getItem(PROPERTIES_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveProperties = (properties: Property[]): void => {
  localStorage.setItem(PROPERTIES_KEY, JSON.stringify(properties));
};

export const getStoredWeights = (): Weights => {
  const stored = localStorage.getItem(WEIGHTS_KEY);
  return stored ? JSON.parse(stored) : DEFAULT_WEIGHTS;
};

export const saveWeights = (weights: Weights): void => {
  localStorage.setItem(WEIGHTS_KEY, JSON.stringify(weights));
};
    