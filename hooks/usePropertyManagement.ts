import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { Property, Weights, ScoringCriterion, MutationResult } from "../types";
import { calculatePropertyScores } from "../utils/scoring";
import { DEFAULT_WEIGHTS } from "../constants";
import { supabase, Json, Database } from "../supabaseClient";

const toCamel = (s: string): string => {
  return s.replace(/([-_][a-z])/gi, ($1) => {
    return $1.toUpperCase().replace("-", "").replace("_", "");
  });
};

const isObject = (obj: any): obj is Object => {
  return (
    obj === Object(obj) && !Array.isArray(obj) && typeof obj !== "function"
  );
};

const keysToCamel = (obj: any): any => {
  if (isObject(obj)) {
    const n: { [key: string]: any } = {};
    Object.keys(obj).forEach((k) => {
      n[toCamel(k)] = keysToCamel((obj as any)[k]);
    });
    return n;
  } else if (Array.isArray(obj)) {
    return obj.map((i) => {
      return keysToCamel(i);
    });
  }
  return obj;
};

type PropertyInsert = Database["public"]["Tables"]["properties"]["Insert"];
type PropertyUpdate = Database["public"]["Tables"]["properties"]["Update"];
type UserWeightsInsert = Database["public"]["Tables"]["user_weights"]["Insert"];

export const usePropertyManagement = (user: User | null) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [isLoading, setIsLoading] = useState(true);

  const reprocessScores = useCallback(
    (props: Property[], w: Weights): Property[] => {
      if (!props) return [];
      return props.map((p) => {
        const { totalScore, scores } = calculatePropertyScores(p, w);
        return { ...p, totalScore, scores };
      });
    },
    []
  );

  useEffect(() => {
    if (user && supabase) {
      const fetchData = async () => {
        setIsLoading(true);

        const [propertiesResponse, weightsResponse] = await Promise.all([
          supabase
            .from("properties")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("user_weights")
            .select("weights")
            .eq("user_id", user.id)
            .single(),
        ]);

        const { data: propertiesData, error: propertiesError } =
          propertiesResponse;
        if (propertiesError)
          console.error("Error fetching properties:", propertiesError);

        const { data: weightsData, error: weightsError } = weightsResponse;
        if (weightsError && weightsError.code !== "PGRST116") {
          console.error("Error fetching weights:", weightsError);
        }

        const finalWeights = (weightsData as any)?.weights
          ? ({
              ...DEFAULT_WEIGHTS,
              ...((weightsData as any).weights as unknown as object),
            } as Weights)
          : DEFAULT_WEIGHTS;
        const initialPropertiesInCamelCase = keysToCamel(
          propertiesData || []
        ) as Property[];
        const scoredProperties = reprocessScores(
          initialPropertiesInCamelCase,
          finalWeights
        );

        setWeights(finalWeights);
        setProperties(scoredProperties);

        setIsLoading(false);
      };
      fetchData();
    } else {
      setProperties([]);
      setWeights(DEFAULT_WEIGHTS);
      setIsLoading(false);
    }
  }, [user, reprocessScores]);

  useEffect(() => {
    if (!isLoading) {
      setProperties((currentProperties) =>
        reprocessScores(currentProperties, weights)
      );
    }
  }, [weights, reprocessScores, isLoading]);

  const addProperty = async (
    propertyData: Omit<Property, "id" | "scores" | "totalScore">
  ): Promise<MutationResult> => {
    if (!user || !supabase)
      return { success: false, message: "Bruker ikke logget inn." };

    const propertyWithId = {
      ...propertyData,
      id: crypto.randomUUID(),
    } as Property;
    const { totalScore, scores } = calculatePropertyScores(
      propertyWithId,
      weights
    );
    const newPropertyForUI = { ...propertyWithId, totalScore, scores };

    setProperties((prev) => [newPropertyForUI, ...prev]);

    const { id, scores: s, totalScore: ts, ...rest } = newPropertyForUI;
    const dbPayload: PropertyInsert = {
      id: id,
      user_id: user.id,
      address: rest.address,
      price: rest.price,
      area: rest.area,
      property_type: rest.propertyType,
      condition: rest.condition,
      location: rest.location,
      parking_spots: rest.parkingSpots,
      has_garage: rest.hasGarage,
      garden_size: rest.gardenSize,
      has_rental_unit: rest.hasRentalUnit,
      renovation_needs: rest.renovationNeeds,
      other_attributes: rest.otherAttributes,
      year_built: rest.yearBuilt,
      bedrooms: rest.bedrooms,
      bathrooms: rest.bathrooms,
      finn_link: rest.finnLink || null,
      user_comment: rest.userComment || null,
      kitchen_quality: rest.kitchenQuality,
      living_room_quality: rest.livingRoomQuality,
      storage_quality: rest.storageQuality,
      floor_plan_quality: rest.floorPlanQuality,
      balcony_terrace_quality: rest.balconyTerraceQuality,
      light_and_air_quality: rest.lightAndAirQuality,
      area_impression: rest.areaImpression,
      neighborhood_impression: rest.neighborhoodImpression,
      public_transport_access: rest.publicTransportAccess,
      schools_proximity: rest.schoolsProximity,
      viewing_impression: rest.viewingImpression,
      potential_score: rest.potentialScore,
    };

    const { error } = await supabase.from("properties").insert([dbPayload]);

    if (error) {
      console.error("Error adding property:", error);
      setProperties((prev) => prev.filter((p) => p.id !== newPropertyForUI.id));
      return {
        success: false,
        message: `Kunne ikke lagre boligen: ${error.message}`,
      };
    }
    return { success: true };
  };

  const updateProperty = async (
    updatedPropertyData: Property
  ): Promise<MutationResult> => {
    if (!user || !supabase)
      return { success: false, message: "Bruker ikke logget inn." };

    const { totalScore, scores } = calculatePropertyScores(
      updatedPropertyData,
      weights
    );
    const finalPropertyForUI = { ...updatedPropertyData, totalScore, scores };
    const originalProperties = [...properties];
    setProperties((prev) =>
      prev.map((p) => (p.id === finalPropertyForUI.id ? finalPropertyForUI : p))
    );

    const {
      id,
      scores: _scores,
      totalScore: _totalScore,
      ...data
    } = finalPropertyForUI;

    const dbPayload: PropertyUpdate = {
      address: data.address,
      price: data.price,
      area: data.area,
      property_type: data.propertyType,
      condition: data.condition,
      location: data.location,
      parking_spots: data.parkingSpots,
      has_garage: data.hasGarage,
      garden_size: data.gardenSize,
      has_rental_unit: data.hasRentalUnit,
      renovation_needs: data.renovationNeeds,
      other_attributes: data.otherAttributes,
      year_built: data.yearBuilt,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      finn_link: data.finnLink || null,
      user_comment: data.userComment || null,
      kitchen_quality: data.kitchenQuality,
      living_room_quality: data.livingRoomQuality,
      storage_quality: data.storageQuality,
      floor_plan_quality: data.floorPlanQuality,
      balcony_terrace_quality: data.balconyTerraceQuality,
      light_and_air_quality: data.lightAndAirQuality,
      area_impression: data.areaImpression,
      neighborhood_impression: data.neighborhoodImpression,
      public_transport_access: data.publicTransportAccess,
      schools_proximity: data.schoolsProximity,
      viewing_impression: data.viewingImpression,
      potential_score: data.potentialScore,
    };

    const { error } = await supabase
      .from("properties")
      .update(dbPayload)
      .eq("id", id);

    if (error) {
      console.error("Error updating property:", error);
      setProperties(originalProperties); // Revert on failure
      return {
        success: false,
        message: `Kunne ikke oppdatere boligen: ${error.message}`,
      };
    }
    return { success: true };
  };

  const deleteProperty = async (
    propertyId: string
  ): Promise<MutationResult> => {
    if (!user || !supabase) {
      return {
        success: false,
        message: "Du må være logget inn for å slette en bolig.",
      };
    }

    console.log(`🗑️ Attempting to delete property:
  - Property ID: ${propertyId}
  - User ID: ${user.id}`);

    try {
      const { error, count } = await supabase
        .from("properties")
        .delete({ count: "exact" })
        .eq("id", propertyId)
        .eq("user_id", user.id);

      if (error || count === 0) {
        let message = "";

        if (error) {
          console.error("❌ Error from Supabase:", error);
          message = `En teknisk feil oppstod ved sletting: ${error.message}`;
        } else {
          console.warn(`⚠️ Deletion failed. Possibly blocked by RLS or missing user_id match.
  - Property ID: ${propertyId}
  - User ID: ${user.id}
  - Check if the 'user_id' column in Supabase matches the above.`);

          message =
            "Sletting mislyktes. Dette skjer vanligvis hvis RLS blokkerer handlingen, ofte fordi denne boligen ikke har din bruker-ID lagret. Se konsollen for detaljer.";
        }

        return { success: false, message };
      }

      console.log(`✅ Successfully deleted property ID: ${propertyId}`);

      setProperties((prev) => prev.filter((p) => p.id !== propertyId));

      return {
        success: true,
        message: `Boligen ble slettet (${count} rad slettet).`,
      };
    } catch (unexpected) {
      console.error("🔥 Uventet feil ved sletting:", unexpected);
      return {
        success: false,
        message: "Uventet feil oppstod under sletting. Prøv igjen senere.",
      };
    }
  };

  const updateWeight = async (
    criterion: ScoringCriterion,
    value: number
  ): Promise<MutationResult> => {
    if (!user || !supabase)
      return { success: false, message: "Bruker ikke logget inn." };

    const originalWeights = { ...weights };
    const newWeights = { ...weights, [criterion]: value };
    setWeights(newWeights);

    const payload: UserWeightsInsert = {
      user_id: user.id,
      weights: newWeights,
    };
    const { error } = await supabase
      .from("user_weights")
      .upsert([payload], { onConflict: "user_id" });

    if (error) {
      console.error("Error updating weights:", error);
      setWeights(originalWeights); // Revert on failure
      return {
        success: false,
        message: "Kunne ikke lagre vektinnstillingene.",
      };
    }
    return { success: true };
  };

  const resetWeights = async (): Promise<MutationResult> => {
    const originalWeights = { ...weights };
    setWeights(DEFAULT_WEIGHTS);

    if (!user || !supabase) return { success: true }; // No need to save if not logged in

    const payload: UserWeightsInsert = {
      user_id: user.id,
      weights: DEFAULT_WEIGHTS,
    };
    const { error } = await supabase
      .from("user_weights")
      .upsert([payload], { onConflict: "user_id" });

    if (error) {
      console.error("Error resetting weights:", error);
      setWeights(originalWeights); // Revert on failure
      return {
        success: false,
        message: "Kunne ikke nullstille vektinnstillingene.",
      };
    }
    return { success: true };
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
