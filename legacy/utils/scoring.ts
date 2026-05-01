
import { Property, Weights, ScoringCriterion, PropertyScores, ConditionRating, LocationRating, CriterionScore } from '../types';
import { MAX_EXPECTED_PRICE_PER_SQM, MIN_EXPECTED_PRICE_PER_SQM, OPTIMAL_AREA_SIZE, MAX_AREA_SCORE_CAP, MAX_YEAR_BUILT_BENEFIT, OLDEST_YEAR_PENALTY_START, MAX_GARDEN_SIZE_BENEFIT } from '../constants';

const normalizeScore = (value: number, min: number, max: number, invert: boolean = false): number => {
  let score = Math.max(0, Math.min(1, (value - min) / (max - min))) * 100;
  return invert ? 100 - score : score;
};

// Helper for 0-10 rated criteria
const calculateZeroToTenRatedScore = (rating: number, criterionName: string): CriterionScore => {
  const score = Math.max(0, Math.min(10, rating)) * 10; // Scale 0-10 to 0-100
  return { score, description: `${criterionName}: ${rating}/10` };
};

const calculatePricePerSqmScore = (property: Property): CriterionScore => {
  if (property.area === 0) return { score: 0, description: "Areal mangler" };
  const pricePerSqm = property.price / property.area;
  const score = normalizeScore(pricePerSqm, MIN_EXPECTED_PRICE_PER_SQM, MAX_EXPECTED_PRICE_PER_SQM, true);
  return { score, description: `Pris/kvm: ${Math.round(pricePerSqm).toLocaleString('nb-NO')} kr` };
};

const calculateAreaSizeScore = (property: Property): CriterionScore => {
  let score = 0;
  if (property.area <= OPTIMAL_AREA_SIZE) {
    score = (property.area / OPTIMAL_AREA_SIZE) * 100;
  } else {
    score = 100 - Math.min(20, ((property.area - OPTIMAL_AREA_SIZE) / (MAX_AREA_SCORE_CAP - OPTIMAL_AREA_SIZE)) * 20);
  }
  score = Math.max(0, Math.min(100, score));
  return { score, description: `Areal: ${property.area} m²` };
};

const calculateConditionScore = (property: Property): CriterionScore => {
  let score = 0;
  switch (property.condition) {
    case ConditionRating.NEW: score = 100; break;
    case ConditionRating.VERY_GOOD: score = 90; break;
    case ConditionRating.GOOD: score = 75; break;
    case ConditionRating.FAIR: score = 50; break;
    case ConditionRating.POOR: score = 25; break;
    case ConditionRating.NEEDS_MAJOR_RENOVATION: score = 5; break;
  }
  if (property.renovationNeeds && (property.renovationNeeds.toLowerCase().includes("totalrenover") || property.renovationNeeds.toLowerCase().includes("rives"))) {
    score = Math.min(score, 5);
  }
  return { score, description: `Tilstand: ${property.condition}` };
};

const calculateLocationScore = (property: Property): CriterionScore => {
  let score = 0;
  switch (property.location) {
    case LocationRating.EXCELLENT: score = 100; break;
    case LocationRating.VERY_GOOD: score = 90; break;
    case LocationRating.GOOD: score = 75; break;
    case LocationRating.AVERAGE: score = 50; break;
    case LocationRating.BELOW_AVERAGE: score = 25; break;
  }
  return { score, description: `Makro-Beliggenhet: ${property.location}` };
};

const calculateParkingScore = (property: Property): CriterionScore => {
  let score = 0;
  if (property.hasGarage) score += 60; // Garage itself is a big plus
  score += Math.min(40, property.parkingSpots * 20); // Additional spots, capped
  score = Math.min(100, score);
  const descParts = [];
  if (property.hasGarage) descParts.push("Garasje");
  if (property.parkingSpots > 0) descParts.push(`${property.parkingSpots} P-plass(er)`);
  return { score, description: descParts.length > 0 ? descParts.join(', ') : "Ingen dedikert parkering" };
};

const calculateGardenScore = (property: Property): CriterionScore => {
  if (property.gardenSize === 0) return { score: 0, description: "Ingen hage" };
  const score = Math.min(100, (property.gardenSize / MAX_GARDEN_SIZE_BENEFIT) * 100);
  return { score, description: `Hage: ${property.gardenSize} m²` };
};

const calculateRentalUnitScore = (property: Property): CriterionScore => {
  return { score: property.hasRentalUnit ? 100 : 0, description: property.hasRentalUnit ? "Har utleiedel" : "Ingen utleiedel" };
};

const calculateAgeScore = (property: Property): CriterionScore => {
  const currentYear = new Date().getFullYear();
  if(property.yearBuilt === 0) return { score: 0, description: "Byggeår ukjent"};
  const age = currentYear - property.yearBuilt;
  let score = 0;

  if (age <= MAX_YEAR_BUILT_BENEFIT) {
    score = 100;
  } else if (age > OLDEST_YEAR_PENALTY_START) {
    const conditionBonus = (property.condition === ConditionRating.NEW || property.condition === ConditionRating.VERY_GOOD) ? 40 : 0;
    score = Math.max(0, 50 - (age - OLDEST_YEAR_PENALTY_START) * 2) + conditionBonus;
  } else {
    score = normalizeScore(age, MAX_YEAR_BUILT_BENEFIT, OLDEST_YEAR_PENALTY_START, true);
  }
  score = Math.max(0, Math.min(100, score));
  return { score, description: `Byggeår: ${property.yearBuilt} (Alder: ${age} år)` };
};

const calculateBedroomsScore = (property: Property): CriterionScore => {
    let score = 0;
    if (property.bedrooms >= 4) score = 100;
    else if (property.bedrooms === 3) score = 90;
    else if (property.bedrooms === 2) score = 70; // Adjusted based on common preference
    else if (property.bedrooms === 1) score = 40; // Adjusted
    else score = 10; // For 0 bedrooms, e.g. studio, if applicable
    return { score, description: `${property.bedrooms} soverom`};
};

const calculateBathroomsScore = (property: Property): CriterionScore => {
    let score = 0;
    if (property.bathrooms >= 2) score = 100;
    else if (property.bathrooms === 1.5) score = 80; // 1 bath + 1 WC gets a good score
    else if (property.bathrooms === 1) score = 60; // Standard single bathroom
    else score = 10; // Less than 1, e.g. only WC
    return { score, description: `${property.bathrooms} bad`};
};


export const calculatePropertyScores = (property: Property, weights: Weights): { totalScore: number; scores: PropertyScores } => {
  const scores: PropertyScores = {};
  
  scores[ScoringCriterion.PRICE_PER_SQM] = calculatePricePerSqmScore(property);
  scores[ScoringCriterion.AREA_SIZE] = calculateAreaSizeScore(property);
  scores[ScoringCriterion.CONDITION] = calculateConditionScore(property);
  scores[ScoringCriterion.LOCATION] = calculateLocationScore(property);
  scores[ScoringCriterion.PARKING] = calculateParkingScore(property);
  scores[ScoringCriterion.GARDEN] = calculateGardenScore(property);
  scores[ScoringCriterion.RENTAL_UNIT] = calculateRentalUnitScore(property);
  scores[ScoringCriterion.AGE] = calculateAgeScore(property);
  scores[ScoringCriterion.BEDROOMS] = calculateBedroomsScore(property);
  scores[ScoringCriterion.BATHROOMS] = calculateBathroomsScore(property);

  // New 0-10 rated criteria
  scores[ScoringCriterion.KITCHEN_QUALITY] = calculateZeroToTenRatedScore(property.kitchenQuality, "Kjøkken");
  scores[ScoringCriterion.LIVING_ROOM_QUALITY] = calculateZeroToTenRatedScore(property.livingRoomQuality, "Stue");
  scores[ScoringCriterion.STORAGE_QUALITY] = calculateZeroToTenRatedScore(property.storageQuality, "Oppbevaring");
  scores[ScoringCriterion.FLOOR_PLAN_QUALITY] = calculateZeroToTenRatedScore(property.floorPlanQuality, "Planløsning");
  scores[ScoringCriterion.BALCONY_TERRACE_QUALITY] = calculateZeroToTenRatedScore(property.balconyTerraceQuality, "Balkong/Terrasse");
  scores[ScoringCriterion.LIGHT_AND_AIR_QUALITY] = calculateZeroToTenRatedScore(property.lightAndAirQuality, "Lys/Luft");
  scores[ScoringCriterion.AREA_IMPRESSION] = calculateZeroToTenRatedScore(property.areaImpression, "Område (Mikro)");
  scores[ScoringCriterion.NEIGHBORHOOD_IMPRESSION] = calculateZeroToTenRatedScore(property.neighborhoodImpression, "Nabolag");
  scores[ScoringCriterion.PUBLIC_TRANSPORT_ACCESS] = calculateZeroToTenRatedScore(property.publicTransportAccess, "Off. transp.");
  scores[ScoringCriterion.SCHOOLS_PROXIMITY] = calculateZeroToTenRatedScore(property.schoolsProximity, "Skoler/Bhg.");
  scores[ScoringCriterion.VIEWING_IMPRESSION] = calculateZeroToTenRatedScore(property.viewingImpression, "Visn.inntrykk");
  scores[ScoringCriterion.POTENTIAL] = calculateZeroToTenRatedScore(property.potentialScore, "Potensial");

  let weightedScoreSum = 0;
  let totalWeightSum = 0;

  for (const key in scores) {
    const criterion = key as ScoringCriterion;
    if (scores[criterion] && weights[criterion] > 0) {
      weightedScoreSum += (scores[criterion]?.score ?? 0) * weights[criterion];
      totalWeightSum += weights[criterion];
    }
  }
  
  const totalScore = totalWeightSum > 0 ? Math.round(weightedScoreSum / totalWeightSum) : 0;
  return { totalScore: Math.max(0, Math.min(100, totalScore)), scores };
};
