import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import Button from './ui/Button';
import Input from './ui/Input';

interface AuthProps {
  onBypassLogin: () => void;
}

const Auth: React.FC<AuthProps> = ({ onBypassLogin }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Registrering vellykket! Sjekk e-posten din for en bekreftelseslenke.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // The onAuthStateChange listener in App.tsx will handle navigation.
      }
    } catch (error: any) {
      setMessage(`Feil: ${error.error_description || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
        <div>
            <h1 className="text-3xl font-bold text-center text-green-700">Boligscore</h1>
            <p className="mt-2 text-center text-sm text-slate-600">
                {isSignUp ? 'Opprett en konto for å lagre og vurdere boliger' : 'Logg inn for å få tilgang til dine vurderinger'}
            </p>
        </div>
        <form className="space-y-6" onSubmit={handleAuth}>
          <Input
            id="email"
            label="E-postadresse"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="din@epost.no"
            wrapperClassName="mb-3"
          />
          <Input
            id="password"
            label="Passord"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
             wrapperClassName="mb-3"
          />

          <div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Laster...' : (isSignUp ? 'Registrer' : 'Logg inn')}
            </Button>
          </div>

          {message && <p className={`mt-4 text-center text-sm ${message.startsWith('Feil:') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>}
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-4 text-slate-400 text-sm">Eller</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <div>
            <Button variant="secondary" onClick={onBypassLogin} className="w-full">
                Fortsett som gjest (data lagres lokalt)
            </Button>
        </div>
        
        <div className="text-center">
            <button
                onClick={() => { setIsSignUp(!isSignUp); setMessage(''); }}
                className="font-medium text-sm text-green-600 hover:text-green-500"
            >
                {isSignUp ? 'Har du allerede en konto? Logg inn' : 'Trenger du en konto? Registrer deg'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
