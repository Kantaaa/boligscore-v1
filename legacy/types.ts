
export enum PropertyType {
  HOUSE = 'Enebolig',
  APARTMENT = 'Leilighet',
  TOWNHOUSE = 'Rekkehus',
  SEMI_DETACHED = 'Tomannsbolig',
  OTHER = 'Annet',
}

export enum ConditionRating {
  NEW = 'Nytt',
  VERY_GOOD = 'Meget God',
  GOOD = 'God',
  FAIR = 'Grei',
  POOR = 'Dårlig',
  NEEDS_MAJOR_RENOVATION = 'Totalrenovering',
}

export enum LocationRating {
  EXCELLENT = 'Utmerket',
  VERY_GOOD = 'Meget God',
  GOOD = 'God',
  AVERAGE = 'Gjennomsnittlig',
  BELOW_AVERAGE = 'Under Middels',
}

export interface Property {
  id: string;
  address: string;
  price: number;
  area: number; // BRA in m^2
  propertyType: PropertyType;
  condition: ConditionRating;
  location: LocationRating; // General location, still useful
  parkingSpots: number; // Number of parking spots
  hasGarage: boolean;
  gardenSize: number; // Size of garden in m^2, 0 if no garden
  hasRentalUnit: boolean;
  renovationNeeds: string; // Description of renovation needs
  otherAttributes: string;
  yearBuilt: number;
  bedrooms: number;
  bathrooms: number; // Can be 1, 1.5, 2 etc.

  // New attributes
  finnLink?: string;
  userComment?: string;

  kitchenQuality: number; // 0-10 rating
  livingRoomQuality: number; // 0-10 rating
  storageQuality: number; // 0-10 rating
  floorPlanQuality: number; // 0-10 rating
  balconyTerraceQuality: number; // 0-10 rating
  lightAndAirQuality: number; // 0-10 rating
  areaImpression: number; // 0-10 rating (Specific area/micro-location)
  neighborhoodImpression: number; // 0-10 rating (Specific neighborhood feel)
  publicTransportAccess: number; // 0-10 rating
  schoolsProximity: number; // 0-10 rating
  viewingImpression: number; // 0-10 rating (Subjective impression from viewing)
  potentialScore: number; // 0-10 rating (Potential for improvement/value increase)
  
  scores?: PropertyScores;
  totalScore?: number;
}

export enum ScoringCriterion {
  PRICE_PER_SQM = 'Pris per kvm',
  AREA_SIZE = 'Størrelse (BRA)',
  CONDITION = 'Tilstand (Generell)',
  LOCATION = 'Beliggenhet (Makro)', // Renamed for clarity
  PARKING = 'Parkering',
  GARDEN = 'Hage',
  RENTAL_UNIT = 'Utleiedel (Hybel)',
  AGE = 'Alder på bolig',
  BEDROOMS = 'Antall Soverom',
  BATHROOMS = 'Antall Bad',
  // New Scoring Criteria
  KITCHEN_QUALITY = 'Kjøkkenkvalitet',
  LIVING_ROOM_QUALITY = 'Stuekvalitet',
  STORAGE_QUALITY = 'Oppbevaringsmuligheter',
  FLOOR_PLAN_QUALITY = 'Planløsning',
  BALCONY_TERRACE_QUALITY = 'Balkong/Terrasse',
  LIGHT_AND_AIR_QUALITY = 'Lysforhold og luftighet',
  AREA_IMPRESSION = 'Områdeinntrykk (Mikro)',
  NEIGHBORHOOD_IMPRESSION = 'Nabolagsfølelse',
  PUBLIC_TRANSPORT_ACCESS = 'Tilgang Offentlig Transport',
  SCHOOLS_PROXIMITY = 'Nærhet Skoler/Barnehager',
  VIEWING_IMPRESSION = 'Inntrykk på Visning',
  POTENTIAL = 'Potensial',
}

export type Weights = {
  [key in ScoringCriterion]: number;
};

export interface CriterionScore {
  score: number; // 0-100
  description: string;
}

export type PropertyScores = {
  [key in ScoringCriterion]?: CriterionScore;
};

export type SortKey = 'totalScore' | 'price' | 'area' | 'address';
export type SortDirection = 'asc' | 'desc';

export interface CriterionDefinition {
  id: ScoringCriterion;
  label: string;
  description: string;
  minWeight?: number;
  maxWeight?: number;
  step?: number;
}
export interface MutationResult {
  success: boolean;
  message?: string;
}

export interface AiSuggestion {
  title: string;
  description: string;
  cost_level: string;
}