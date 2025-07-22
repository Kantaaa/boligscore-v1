
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { Property } from './types';
import { usePropertyManagement } from './hooks/usePropertyManagement';
import { usePropertyManagementLocalStorage } from './hooks/usePropertyManagementLocalStorage';
import PropertyList from './components/PropertyList';
import PropertyForm from './components/PropertyForm';
import WeightAdjuster from './components/WeightAdjuster';
import ScoreExplanation from './components/ScoreExplanation';
import Button from './components/ui/Button';
import Modal from './components/ui/Modal';
import Input from './components/ui/Input';
import Auth from './components/Auth';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import DebugTools from './components/DebugTools';
import { useConfirmationDialog } from './hooks/useConfirmationDialog';


export type ViewMode = 'list' | 'card';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(!isSupabaseConfigured);
  
  useEffect(() => {
    // If supabase is not configured, we are already in guest mode and auth is not possible.
    if (!isSupabaseConfigured || !supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
       if (session) {
        setIsGuestMode(false); // If user logs in, exit guest mode
      }
    });

    return () => subscription.unsubscribe();
  }, []);
  
  const user = useMemo(() => session?.user ?? null, [session]);

  const supabaseHookData = usePropertyManagement(user);
  const localStorageHookData = usePropertyManagementLocalStorage();

  const { 
    properties, 
    weights, 
    updateWeight,
    resetWeights, 
    addProperty, 
    updateProperty, 
    deleteProperty,
    isLoading 
  } = isGuestMode ? localStorageHookData : supabaseHookData;
  
  const [isPropertyFormModalOpen, setIsPropertyFormModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [appError, setAppError] = useState<string | null>(null); // New state for error messages
  const { confirm, Dialog: ConfirmationDialog } = useConfirmationDialog();

  const handleOpenAddPropertyModal = () => {
    setAppError(null);
    setEditingProperty(undefined);
    setIsPropertyFormModalOpen(true);
  };

  const handleOpenEditPropertyModal = (property: Property) => {
    setAppError(null);
    setEditingProperty(property);
    setIsPropertyFormModalOpen(true);
  };

  const handlePropertyFormSubmit = useCallback(async (propertyData: Omit<Property, 'id' | 'scores' | 'totalScore'> | Property) => {
    setAppError(null);
    let result;
    if ('id' in propertyData && propertyData.id) { 
      result = await updateProperty(propertyData as Property);
    } else {
      result = await addProperty(propertyData as Omit<Property, 'id' | 'scores' | 'totalScore'>);
    }

    if (result.success) {
        setIsPropertyFormModalOpen(false);
        setEditingProperty(undefined);
    } else {
        setAppError(result.message || 'En ukjent feil oppstod.');
    }
  }, [addProperty, updateProperty]);

  const handleDeleteProperty = useCallback(async (propertyId: string) => {
    const isConfirmed = await confirm({
      title: "Bekreft sletting",
      message: "Er du sikker på at du vil slette denne boligen? Handlingen kan ikke angres.",
      confirmText: "Ja, slett",
      cancelText: "Avbryt",
      confirmVariant: 'danger',
    });

    if (isConfirmed) {
        setDeletingId(propertyId);
        setAppError(null);
        const result = await deleteProperty(propertyId);
        setDeletingId(null);
        if (!result.success && result.message) {
            setAppError(result.message);
        }
    }
  }, [deleteProperty, confirm]);
  
  const handleSignOut = async () => {
    if (isGuestMode) {
      if (!isSupabaseConfigured) {
        setAppError("Appen er ikke konfigurert for skylagring. Fyll ut `SUPABASE_URL` og `SUPABASE_ANON_KEY` i `env.ts`-filen og last siden på nytt for å logge inn.");
        return;
      }
      setIsGuestMode(false);
    } else if (supabase) {
      await supabase.auth.signOut();
    }
  };
  
  const handleBypassLogin = () => {
    setIsGuestMode(true);
  }

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredProperties = useMemo(() => {
    if (!searchTerm.trim()) {
      return properties;
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    return properties.filter(property =>
      property.address.toLowerCase().includes(lowerSearchTerm) ||
      (property.userComment && property.userComment.toLowerCase().includes(lowerSearchTerm)) ||
      (property.finnLink && property.finnLink.toLowerCase().includes(lowerSearchTerm)) ||
      (property.propertyType.toLowerCase().includes(lowerSearchTerm))
    );
  }, [properties, searchTerm]);

  const handlePropertyFormCancel = useCallback(() => {
    setAppError(null);
    setIsPropertyFormModalOpen(false);
    setEditingProperty(undefined);
  }, []);

  const appIsLoading = authLoading || isLoading;

  if (appIsLoading) {
    return (
        <div className="flex justify-center items-center min-h-screen bg-slate-100">
            <div className="animate-pulse text-xl font-semibold text-slate-600">Laster Boligscore...</div>
        </div>
    );
  }

  if (!session && !isGuestMode) {
    return <Auth onBypassLogin={handleBypassLogin} />;
  }
  
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      {!isSupabaseConfigured && (
        <div className="bg-orange-100 border-b-4 border-orange-400 text-orange-800 p-4 text-center sticky top-0 z-50">
            <div className="container mx-auto">
                <p className="font-bold">Database ikke konfigurert</p>
                <p className="text-sm">Appen kjører kun i lokal gjestemodus. For å lagre data i skyen, fyll ut filen <code>env.ts</code> og last inn siden på nytt.</p>
            </div>
        </div>
      )}

      {ConfirmationDialog}
      {appError && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 fixed top-20 right-4 z-[100] shadow-lg rounded-md animate-modalShow w-full max-w-md">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-bold">En feil oppstod</p>
              <p className="text-sm">{appError}</p>
            </div>
            <button onClick={() => setAppError(null)} className="ml-4 text-red-500 hover:text-red-700 text-2xl font-bold p-1 leading-none">&times;</button>
          </div>
        </div>
      )}

      <header className="bg-white shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-green-700">Boligscore</h1>
            {isGuestMode && <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Gjestemodus</span>}
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Button onClick={handleOpenAddPropertyModal} leftIcon={<i className="fas fa-plus"></i>} size="md">
              Ny Bolig
            </Button>
            <Button variant="secondary" onClick={() => setIsSettingsModalOpen(true)} leftIcon={<i className="fas fa-cog"></i>} size="md" title="Innstillinger">
            </Button>
            <Button variant="ghost" onClick={handleSignOut} leftIcon={<i className="fas fa-sign-out-alt"></i>} size="md" title={isGuestMode ? "Avslutt Gjestemodus" : "Logg ut"}>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 p-4 bg-white shadow rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2 lg:col-span-2">
              <Input
                label="Søk i boliger"
                type="text"
                placeholder="Skriv adresse, type, kommentar..."
                value={searchTerm}
                onChange={handleSearchChange}
                wrapperClassName="mb-0 w-full" 
              />
            </div>
            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Visningsmodus</label>
              <div className="flex space-x-2">
                <Button 
                  onClick={() => setViewMode('list')} 
                  variant={viewMode === 'list' ? 'primary' : 'ghost'} 
                  size="sm" 
                  className="flex-1 justify-center w-full"
                  leftIcon={<i className="fas fa-list"></i>}
                >
                  Liste
                </Button>
                <Button 
                  onClick={() => setViewMode('card')} 
                  variant={viewMode === 'card' ? 'primary' : 'ghost'} 
                  size="sm" 
                  className="flex-1 justify-center w-full"
                  leftIcon={<i className="fas fa-th-large"></i>}
                >
                  Kort
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-700 mb-4 sm:mb-6">
          {searchTerm ? `Resultater for "${searchTerm}"` : "Registrerte boliger"} ({filteredProperties.length})
        </h2>
        
        {filteredProperties.length === 0 && (
             <div className="flex flex-col items-center text-center py-10 bg-white rounded-lg shadow">
                <i className="fas fa-home text-4xl text-slate-400 mb-4"></i>
                <p className="text-slate-600 font-semibold text-lg">
                  {properties.length === 0 ? "Ingen boliger registrert enda." : "Ingen boliger matcher ditt søk."}
                </p>
                <p className="text-slate-500 mt-1 mb-6">
                  {properties.length === 0 ? "Kom i gang ved å legge til din første bolig." : "Prøv å justere søketeksten eller registrer en ny bolig."}
                </p>
                {properties.length === 0 && 
                    <Button onClick={handleOpenAddPropertyModal} leftIcon={<i className="fas fa-plus"></i>}>
                        Legg til din første bolig
                    </Button>
                }
            </div>
        )}

        {filteredProperties.length > 0 &&
          <PropertyList 
              properties={filteredProperties} 
              onEditProperty={handleOpenEditPropertyModal}
              onDeleteProperty={handleDeleteProperty}
              viewMode={viewMode}
              deletingId={deletingId}
          />
        }
      </main>

      <Modal
        isOpen={isPropertyFormModalOpen}
        onClose={handlePropertyFormCancel}
        title={editingProperty ? "Rediger bolig" : "Registrer ny bolig"}
        size="5xl" 
      >
        <PropertyForm 
            onSubmit={handlePropertyFormSubmit} 
            onCancel={handlePropertyFormCancel}
            initialData={editingProperty}
        />
      </Modal>

      <Modal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        title="Innstillinger og Informasjon"
        size="2xl"
      >
        <div className="space-y-8">
          <ScoreExplanation />
          <hr className="my-6 border-slate-200" />
          <WeightAdjuster weights={weights} onWeightChange={updateWeight} onResetWeights={resetWeights} />
          {!isGuestMode && (
             <>
              <hr className="my-6 border-slate-200" />
              <DebugTools />
            </>
          )}
        </div>
      </Modal>
      
      <footer className="text-center py-6 sm:py-8 text-xs sm:text-sm text-slate-500 border-t border-slate-200 mt-10 sm:mt-12">
        <p>&copy; {new Date().getFullYear()} Boligscore App. Enkel boligvurdering laget av Kanta.</p>
      </footer>
    </div>
  );
};

export default App;