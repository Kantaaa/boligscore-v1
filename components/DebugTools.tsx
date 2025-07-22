import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import Button from './ui/Button';
import Input from './ui/Input';

const DebugTools: React.FC = () => {
  const [propertyIdToTest, setPropertyIdToTest] = useState('');
  const [testResult, setTestResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTestDelete = async () => {
    if (!propertyIdToTest) {
      setTestResult('Vennligst skriv inn en bolig-ID for å teste.');
      return;
    }
    
    setIsLoading(true);
    setTestResult('Tester sletting...');

    // Important: We are NOT adding .eq('user_id', ...) here.
    // The goal is to test if the database's RLS policy correctly
    // blocks the deletion based on the authenticated user alone.
    const { error, count } = await supabase
      .from('properties')
      .delete({ count: 'exact' })
      .eq('id', propertyIdToTest);

    let resultMessage = '';
    if (error) {
      resultMessage = `❌ FEIL: En uventet databasefeil oppstod. Melding: ${error.message}`;
    } else if (count === 0) {
      resultMessage = `✅ SUKSESS: Sletting ble blokkert av RLS-policyen som forventet. (Antall rader slettet: 0)`;
    } else if (count > 0) {
      resultMessage = `❌ KRITISK FEIL: RLS-policyen fungerte ikke! En bolig som ikke tilhører deg ble slettet (Antall: ${count}). Gjenopprett data fra backup og fiks policyen umiddelbart!`;
    }

    setTestResult(resultMessage);
    setIsLoading(false);
  };

  return (
    <div className="p-4 border border-dashed border-red-400 rounded-md bg-red-50">
      <h4 className="text-md font-semibold text-slate-800 mb-2">Sikkerhetstest (RLS)</h4>
      <p className="text-xs text-slate-600 mb-3">
        Dette verktøyet tester om Row Level Security (RLS) er riktig konfigurert. Lim inn ID-en til en bolig som tilhører en *annen* bruker for å bekrefte at du ikke kan slette den.
      </p>
      <Input
        label="Bolig-ID fra en annen bruker"
        value={propertyIdToTest}
        onChange={(e) => setPropertyIdToTest(e.target.value)}
        placeholder="f.eks. 123e4567-e89b-12d3-a456-426614174000"
        wrapperClassName="mb-3"
      />
      <Button
        onClick={handleTestDelete}
        disabled={isLoading}
        variant="danger"
        size="sm"
      >
        {isLoading ? 'Tester...' : 'Forsøk å slette'}
      </Button>
      {testResult && (
        <div className="mt-4 p-3 rounded-md bg-slate-100 text-sm text-slate-700">
          <p className="font-semibold">Testresultat:</p>
          <p className="whitespace-pre-wrap">{testResult}</p>
        </div>
      )}
    </div>
  );
};

export default DebugTools;
