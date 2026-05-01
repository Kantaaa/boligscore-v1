
import { Weights, ScoringCriterion, CriterionDefinition } from './types';

// Adjusted weights based on user feedback and new criteria
// User impact points scaled by 10 (e.g., 1 -> 10, 0.8 -> 8)
export const DEFAULT_WEIGHTS: Weights = {
  [ScoringCriterion.PRICE_PER_SQM]: 15, // Existing
  [ScoringCriterion.AREA_SIZE]: 15,     // Existing
  [ScoringCriterion.CONDITION]: 15,     // Existing, slightly reduced if specific qualities are scored
  [ScoringCriterion.LOCATION]: 10,      // General Location, reduced due to new specific criteria
  [ScoringCriterion.PARKING]: 6,        // User impact: 0.6 -> 6
  [ScoringCriterion.GARDEN]: 5,         // Existing
  [ScoringCriterion.RENTAL_UNIT]: 3,    // User impact: 0.3 -> 3
  [ScoringCriterion.AGE]: 5,            // Existing
  [ScoringCriterion.BEDROOMS]: 8,       // User impact: 0.8 -> 8 (refers to quality/number impact beyond just count)
  [ScoringCriterion.BATHROOMS]: 10,     // User impact: 1 -> 10 (refers to quality/number impact)
  
  // New criteria weights from user impact points (scaled * 10)
  [ScoringCriterion.KITCHEN_QUALITY]: 10,               // Impact: 1
  [ScoringCriterion.LIVING_ROOM_QUALITY]: 10,           // Impact: 1
  [ScoringCriterion.STORAGE_QUALITY]: 5,                // Impact: 0.5
  [ScoringCriterion.FLOOR_PLAN_QUALITY]: 4,             // Impact: 0.4
  [ScoringCriterion.BALCONY_TERRACE_QUALITY]: 7,        // Impact: 0.7
  [ScoringCriterion.LIGHT_AND_AIR_QUALITY]: 6,          // Impact: 0.6
  [ScoringCriterion.AREA_IMPRESSION]: 10,               // Impact: 1
  [ScoringCriterion.NEIGHBORHOOD_IMPRESSION]: 10,       // Impact: 1
  [ScoringCriterion.PUBLIC_TRANSPORT_ACCESS]: 7,        // Impact: 0.7
  [ScoringCriterion.SCHOOLS_PROXIMITY]: 8,              // Impact: 0.8
  [ScoringCriterion.VIEWING_IMPRESSION]: 8,             // Impact: 0.8
  [ScoringCriterion.POTENTIAL]: 7,                      // Impact: 0.7
};

export const SCORING_CRITERIA_DEFINITIONS: CriterionDefinition[] = [
  { id: ScoringCriterion.PRICE_PER_SQM, label: 'Pris per kvm', description: 'Vurderer pris i forhold til areal. Lavere er bedre.' },
  { id: ScoringCriterion.AREA_SIZE, label: 'Størrelse (BRA)', description: 'Total bruksareal. Større er generelt bedre, innenfor rimelighetens grenser.' },
  { id: ScoringCriterion.CONDITION, label: 'Tilstand (Generell)', description: 'Boligens generelle vedlikeholdsstandard.' },
  { id: ScoringCriterion.LOCATION, label: 'Beliggenhet (Makro)', description: 'Kvaliteten på den overordnede geografiske plasseringen (bydel, kommune).' },
  { id: ScoringCriterion.PARKING, label: 'Parkering', description: 'Tilgjengelighet og type parkering (garasje, antall plasser).' },
  { id: ScoringCriterion.GARDEN, label: 'Hage', description: 'Tilstedeværelse og størrelse på hage.' },
  { id: ScoringCriterion.RENTAL_UNIT, label: 'Utleiedel (Hybel)', description: 'Om boligen har en separat, godkjent utleiedel.' },
  { id: ScoringCriterion.AGE, label: 'Alder på bolig', description: 'Nyere boliger får ofte høyere score, men totalrenoverte eldre boliger kan også score høyt.'},
  { id: ScoringCriterion.BEDROOMS, label: 'Antall Soverom', description: 'Antall soverom i boligen. Vurderes også ift. totalstørrelse.'}, // Description updated
  { id: ScoringCriterion.BATHROOMS, label: 'Antall Bad', description: 'Antall bad/WC i boligen. Vurderes også ift. standard.'}, // Description updated
  // New Definitions
  { id: ScoringCriterion.KITCHEN_QUALITY, label: 'Kjøkkenkvalitet', description: 'Standard og funksjonalitet på kjøkken (0-10 poeng).', maxWeight: 20 },
  { id: ScoringCriterion.LIVING_ROOM_QUALITY, label: 'Stuekvalitet', description: 'Størrelse, lysforhold og atmosfære i stue(r) (0-10 poeng).', maxWeight: 20 },
  { id: ScoringCriterion.STORAGE_QUALITY, label: 'Oppbevaringsmuligheter', description: 'Kvalitet og mengde lagringsplass (boder, skap) (0-10 poeng).', maxWeight: 15 },
  { id: ScoringCriterion.FLOOR_PLAN_QUALITY, label: 'Planløsning', description: 'Effektivitet og funksjonalitet i boligens planløsning (0-10 poeng).', maxWeight: 15 },
  { id: ScoringCriterion.BALCONY_TERRACE_QUALITY, label: 'Balkong/Terrasse', description: 'Kvalitet, størrelse og solforhold for uteplass(er) (0-10 poeng).', maxWeight: 15 },
  { id: ScoringCriterion.LIGHT_AND_AIR_QUALITY, label: 'Lysforhold og luftighet', description: 'Generelle lysforhold, vindusflater og romfølelse (0-10 poeng).', maxWeight: 15 },
  { id: ScoringCriterion.AREA_IMPRESSION, label: 'Områdeinntrykk (Mikro)', description: 'Inntrykk av umiddelbart nærområde, gaten, utsikt (0-10 poeng).', maxWeight: 20 },
  { id: ScoringCriterion.NEIGHBORHOOD_IMPRESSION, label: 'Nabolagsfølelse', description: 'Atmosfære, trygghet og fasiliteter i nabolaget (0-10 poeng).', maxWeight: 20 },
  { id: ScoringCriterion.PUBLIC_TRANSPORT_ACCESS, label: 'Tilgang Offentlig Transport', description: 'Nærhet og frekvens for buss, bane, tog (0-10 poeng).', maxWeight: 15 },
  { id: ScoringCriterion.SCHOOLS_PROXIMITY, label: 'Nærhet Skoler/Barnehager', description: 'Tilgjengelighet og kvalitet på skoler/barnehager (0-10 poeng).', maxWeight: 15 },
  { id: ScoringCriterion.VIEWING_IMPRESSION, label: 'Inntrykk på Visning', description: 'Subjektivt helhetsinntrykk fra visningen (0-10 poeng).', maxWeight: 15 },
  { id: ScoringCriterion.POTENTIAL, label: 'Potensial', description: 'Muligheter for utbygging, modernisering eller verdivekst (0-10 poeng).', maxWeight: 15 },
];

export const MAX_EXPECTED_PRICE_PER_SQM = 150000; // kr
export const MIN_EXPECTED_PRICE_PER_SQM = 20000; // kr
export const OPTIMAL_AREA_SIZE = 120; // m^2, score peaks here and might decrease slightly for very large areas if not desired
export const MAX_AREA_SCORE_CAP = 250; // m^2, area beyond this doesn't add more score significantly

export const MAX_YEAR_BUILT_BENEFIT = 5; // Years, e.g. houses newer than 5 years get max score
export const OLDEST_YEAR_PENALTY_START = 50; // Years, houses older than this start getting lower scores unless condition is high

export const MAX_GARDEN_SIZE_BENEFIT = 500; // m^2
