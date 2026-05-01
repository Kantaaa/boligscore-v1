
import React from 'react';
import { SCORING_CRITERIA_DEFINITIONS, DEFAULT_WEIGHTS } from '../constants';

const ScoreExplanation: React.FC = () => {
  return (
    <div className="space-y-4 text-sm text-slate-700">
      <h3 className="text-lg font-medium text-slate-800">Hvordan kalkuleres Boligscore?</h3>
      <p>
        Boligscoren er en samlet vurdering av en eiendom basert på flere kriterier. Hvert kriterium får en score fra 0 til 100, som deretter vektes for å beregne en totalscore, også fra 0 til 100.
      </p>
      <p>
        Du kan justere vektingen for hvert kriterium for å tilpasse scoren til dine preferanser.
      </p>
      <h4 className="text-md font-medium text-slate-800 pt-2">Standard Kriterier og Vekting:</h4>
      <ul className="list-disc list-inside space-y-1 pl-2">
        {SCORING_CRITERIA_DEFINITIONS.map(criterion => (
          <li key={criterion.id}>
            <strong>{criterion.label}</strong> (Standardvekt: {DEFAULT_WEIGHTS[criterion.id]}%): {criterion.description}
          </li>
        ))}
      </ul>
      <p className="pt-2">
        <strong>Viktig:</strong> Scorene er ment som en veiledning og bør brukes sammen med egen vurdering og eventuell profesjonell rådgivning. Modellen er forenklet og tar ikke høyde for alle mulige faktorer.
      </p>
    </div>
  );
};

export default ScoreExplanation;
    