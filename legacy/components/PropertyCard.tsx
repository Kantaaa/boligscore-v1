import React, { useState } from 'react';
import { Property, ScoringCriterion, AiSuggestion } from '../types';
import ScoreBadge from './ui/Badge';
import Button from './ui/Button';
import { SCORING_CRITERIA_DEFINITIONS } from '../constants';
import { getRenovationSuggestions } from '../utils/geminiApi';

interface PropertyCardProps {
  property: Property;
  onEdit: (property: Property) => void;
  onDelete: (propertyId: string) => void;
  deletingId?: string | null;
}

const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 65) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  if (score >= 35) return 'text-orange-600';
  return 'text-red-600';
};

const getCriterionLabel = (criterionKey: ScoringCriterion): string => {
  const definition = SCORING_CRITERIA_DEFINITIONS.find(def => def.id === criterionKey);
  return definition ? definition.label : criterionKey;
};

const PropertyCard: React.FC<PropertyCardProps> = ({ property, onEdit, onDelete, deletingId }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[] | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleGetAiSuggestions = async () => {
    if (aiSuggestions) return; // Don't fetch again if we already have them
    setIsAiLoading(true);
    setAiError(null);
    try {
      const suggestions = await getRenovationSuggestions(property);
      setAiSuggestions(suggestions);
    } catch (error: any) {
      setAiError(error.message || 'Kunne ikke hente forslag. Prøv igjen.');
      console.error(error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const renderDetailItem = (label: string, value: string | number | undefined, unit?: string) => {
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) return null;
    return (
      <div>
        <span className="font-medium text-slate-600">{label}: </span>
        <span className="text-slate-800">{value}{unit && `${unit}`}</span>
      </div>
    );
  };

  return (
    <div className="bg-white shadow-lg rounded-xl p-4 md:p-6 hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-lg md:text-xl font-semibold text-green-700 mb-1">{property.address}</h3>
            <p className="text-xs md:text-sm text-slate-500">{property.propertyType}</p>
            {property.finnLink && (
              <a
                href={property.finnLink.startsWith('http') ? property.finnLink : `https://` + property.finnLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-600 hover:text-green-700 hover:underline break-all"
              >
                FINN-annonse
              </a>
            )}
          </div>
          <ScoreBadge score={property.totalScore || 0} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs md:text-sm">
          {renderDetailItem("Pris", property.price.toLocaleString('nb-NO'), " kr")}
          {renderDetailItem("Areal", property.area, " m²")}
          {renderDetailItem("Byggeår", property.yearBuilt)}
          {renderDetailItem("Tilstand", property.condition)}
          {renderDetailItem("Kjøkken", `${property.kitchenQuality}/10`)}
          {renderDetailItem("Balk/Terr.", `${property.balconyTerraceQuality}/10`)}
        </div>

        {property.userComment && (
          <div className="mt-3">
            <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-md">
              <span className="font-semibold">Kommentar:</span> {property.userComment}
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)} rightIcon={<i className={`fas fa-chevron-down transition-transform ${showDetails ? 'rotate-180' : ''}`}></i>}>
            {showDetails ? 'Skjul detaljer' : 'Vis detaljert score'}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleGetAiSuggestions} disabled={isAiLoading} leftIcon={<i className={`fa-solid ${isAiLoading ? 'fa-spinner animate-spin' : 'fa-wand-magic-sparkles'}`}></i>}>
            {isAiLoading ? 'Henter...' : 'AI Forslag'}
          </Button>
        </div>

        {showDetails && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <h4 className="text-sm md:text-md font-semibold text-slate-700 mb-2">Detaljert Score:</h4>
            <ul className="space-y-1 text-xs md:text-sm">
              {Object.entries(property.scores || {}).sort(([keyA], [keyB]) => getCriterionLabel(keyA as ScoringCriterion).localeCompare(getCriterionLabel(keyB as ScoringCriterion))).map(([key, criterionScore]) => {
                if (!criterionScore) return null;
                const criterionKey = key as ScoringCriterion;
                return (
                  <li key={criterionKey} className="flex justify-between items-center py-0.5">
                    <span className="text-slate-600 ">{getCriterionLabel(criterionKey)}:</span>
                    <div className="text-right">
                      <span className={`font-semibold mr-1 md:mr-2 ${getScoreColor(criterionScore.score)}`}>{criterionScore.score}/100</span>
                      <span className="text-slate-500 text-xs italic hidden sm:inline">({criterionScore.description})</span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3">
              <h5 className="text-xs md:text-sm font-semibold text-slate-700">Sammendrag Notater:</h5>
              <p className="text-xs text-slate-600 mt-1">
                {property.renovationNeeds ? `Renoveringsbehov: ${property.renovationNeeds}. ` : ''}
                {property.otherAttributes ? `Andre notater: ${property.otherAttributes}.` : ''}
                {!property.renovationNeeds && !property.otherAttributes && !property.userComment && 'Ingen spesifikke notater.'}
              </p>
            </div>
            
            {isAiLoading && <div className="mt-4 text-center text-slate-500"><i className="fas fa-spinner animate-spin mr-2"></i>Henter AI-drevne forslag...</div>}
            {aiError && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm"><span className="font-bold">Feil:</span> {aiError}</div>}
            {aiSuggestions && (
              <div className="mt-4">
                <h4 className="text-sm md:text-md font-semibold text-slate-700 mb-2">🤖 AI-drevne Renoveringsforslag</h4>
                <div className="space-y-3">
                  {aiSuggestions.map((s, i) => (
                    <div key={i} className="p-3 bg-green-50/50 border-l-4 border-green-300 rounded-r-md">
                      <p className="font-semibold text-green-800">{s.title} <span className="text-xs font-normal text-slate-500 ml-2">({s.cost_level})</span></p>
                      <p className="text-xs text-slate-700 mt-1">{s.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mt-4 md:mt-6 flex justify-end space-x-2">
        <Button size="sm" variant="secondary" onClick={() => onEdit(property)} leftIcon={<i className="fas fa-edit"></i>} disabled={!!deletingId}>Rediger</Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => onDelete(property.id)}
          leftIcon={deletingId === property.id ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-trash"></i>}
          disabled={!!deletingId}
        >
          {deletingId === property.id ? 'Sletter...' : 'Slett'}
        </Button>
      </div>
    </div>
  );
};

export default PropertyCard;