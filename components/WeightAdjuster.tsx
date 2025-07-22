
import React from 'react';
import { Weights, ScoringCriterion, CriterionDefinition } from '../types';
import { SCORING_CRITERIA_DEFINITIONS } from '../constants';
import Button from './ui/Button';

interface WeightAdjusterProps {
  weights: Weights;
  onWeightChange: (criterion: ScoringCriterion, value: number) => void;
  onResetWeights: () => void;
}

const WeightAdjuster: React.FC<WeightAdjusterProps> = ({ weights, onWeightChange, onResetWeights }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-800 mb-1">Juster vekting av kriterier</h3>
        <p className="text-sm text-slate-600 mb-4">Her kan du justere hvor mye hvert kriterium teller i totalscoren. Total sum av vekter påvirker ikke relativ score, men hvordan de er fordelt.</p>
      </div>
      {SCORING_CRITERIA_DEFINITIONS.map((criterionDef: CriterionDefinition) => (
        <div key={criterionDef.id} className="p-4 border border-slate-200 rounded-md bg-slate-50">
          <label htmlFor={`weight-${criterionDef.id}`} className="block text-sm font-medium text-slate-700 mb-1">
            {criterionDef.label} <span className="text-green-600 font-semibold">({weights[criterionDef.id]}%)</span>
          </label>
          <p className="text-xs text-slate-500 mb-2">{criterionDef.description}</p>
          <input
            type="range"
            id={`weight-${criterionDef.id}`}
            name={criterionDef.id}
            min={criterionDef.minWeight || 0}
            max={criterionDef.maxWeight || 25} // Max weight per criterion, sum can be > 100
            step={criterionDef.step || 1}
            value={weights[criterionDef.id]}
            onChange={(e) => onWeightChange(criterionDef.id, parseInt(e.target.value, 10))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-green-600"
          />
        </div>
      ))}
       <div className="mt-6 flex justify-end">
        <Button onClick={onResetWeights} variant="secondary">
          Nullstill vekter
        </Button>
      </div>
    </div>
  );
};

export default WeightAdjuster;