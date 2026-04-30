import { useState, useEffect, useCallback } from 'react';
import { Property, Weights, ScoringCriterion, MutationResult } from '../types';
import { calculatePropertyScores } from '../utils/scoring';
import { getStoredProperties, saveProperties, getStoredWeights, saveWeights } from '../utils/localStorage';
import { DEFAULT_WEIGHTS } from '../constants';

export const usePropertyManagementLocalStorage = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [isLoading, setIsLoading] = useState(true);

  const reprocessScores = useCallback((props: Property[], w: Weights): Property[] => {
    return props.map(p => {
      const { totalScore, scores } = calculatePropertyScores(p, w);
      return { ...p, totalScore, scores };
    });
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const storedProperties = getStoredProperties();
    const storedWeights = getStoredWeights();
    setWeights(storedWeights);
    setProperties(reprocessScores(storedProperties, storedWeights));
    setIsLoading(false);
  }, [reprocessScores]);

  useEffect(() => {
    if (!isLoading) {
      setProperties(prevProps => reprocessScores(prevProps, weights));
    }
  }, [weights, reprocessScores, isLoading]);

  const addProperty = async (propertyData: Omit<Property, 'id' | 'scores' | 'totalScore'>): Promise<MutationResult> => {
    try {
        const propertyWithId = { ...propertyData, id: crypto.randomUUID() };
        const { totalScore, scores } = calculatePropertyScores(propertyWithId as Property, weights);
        const newProperty = { ...propertyWithId, totalScore, scores };
        
        setProperties(prev => {
            const newProps = [newProperty, ...prev];
            saveProperties(newProps);
            return newProps;
        });
        return { success: true };
    } catch (e: any) {
        return { success: false, message: `Lokal lagring feilet: ${e.message}`};
    }
  };

  const updateProperty = async (updatedPropertyData: Property): Promise<MutationResult> => {
    try {
        const { totalScore, scores } = calculatePropertyScores(updatedPropertyData, weights);
        const finalProperty = { ...updatedPropertyData, totalScore, scores };

        setProperties(prev => {
            const newProps = prev.map(p => p.id === finalProperty.id ? finalProperty : p);
            saveProperties(newProps);
            return newProps;
        });
        return { success: true };
    } catch (e: any) {
        return { success: false, message: `Lokal lagring feilet: ${e.message}`};
    }
  };

  const deleteProperty = async (propertyId: string): Promise<MutationResult> => {
    try {
        setProperties(prev => {
            const newProps = prev.filter(p => p.id !== propertyId);
            saveProperties(newProps);
            return newProps;
        });
        return { success: true };
    } catch (e: any) {
        return { success: false, message: `Lokal lagring feilet: ${e.message}`};
    }
  };

  const updateWeight = async (criterion: ScoringCriterion, value: number): Promise<MutationResult> => {
    try {
        setWeights(prevWeights => {
            const newWeights = { ...prevWeights, [criterion]: value };
            saveWeights(newWeights);
            return newWeights;
        });
        return { success: true };
    } catch (e: any) {
        return { success: false, message: `Lokal lagring feilet: ${e.message}`};
    }
  };
  
  const resetWeights = async (): Promise<MutationResult> => {
    try {
        saveWeights(DEFAULT_WEIGHTS);
        setWeights(DEFAULT_WEIGHTS);
        return { success: true };
    } catch (e: any) {
        return { success: false, message: `Lokal lagring feilet: ${e.message}`};
    }
  };

  return {
    properties,
    weights,
    updateWeight,
    resetWeights,
    addProperty,
    updateProperty,
    deleteProperty,
    isLoading,
  };
};