
import React, { useState, useEffect, FormEvent } from 'react';
import { Property, PropertyType, ConditionRating, LocationRating } from '../types';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import Checkbox from './ui/Checkbox';
import Textarea from './ui/Textarea';

const getDefaultNumericValue = (value: any, defaultValue = 0): number => {
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
};


const initialFormState: Omit<Property, 'id' | 'scores' | 'totalScore'> = {
  address: '',
  price: 0,
  area: 0,
  propertyType: PropertyType.HOUSE,
  condition: ConditionRating.GOOD,
  location: LocationRating.AVERAGE,
  parkingSpots: 0,
  hasGarage: false,
  gardenSize: 0,
  hasRentalUnit: false,
  renovationNeeds: '',
  otherAttributes: '',
  yearBuilt: new Date().getFullYear(),
  bedrooms: 3,
  bathrooms: 1,

  finnLink: '',
  userComment: '',
  kitchenQuality: 5, // Default to mid-range for 0-10 scores
  livingRoomQuality: 5,
  storageQuality: 5,
  floorPlanQuality: 5,
  balconyTerraceQuality: 5,
  lightAndAirQuality: 5,
  areaImpression: 5,
  neighborhoodImpression: 5,
  publicTransportAccess: 5,
  schoolsProximity: 5,
  viewingImpression: 5,
  potentialScore: 5,
};

interface PropertyFormProps {
  onSubmit: (property: Omit<Property, 'id' | 'scores' | 'totalScore'> | Property) => void;
  onCancel: () => void;
  initialData?: Property;
}

const PropertyForm: React.FC<PropertyFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState<Omit<Property, 'id' | 'scores' | 'totalScore'> | Property>(initialData ? 
    {
      ...initialFormState, // ensure all fields are present
      ...initialData,
      // Ensure numeric fields from initialData are numbers
      price: getDefaultNumericValue(initialData.price),
      area: getDefaultNumericValue(initialData.area),
      yearBuilt: getDefaultNumericValue(initialData.yearBuilt, new Date().getFullYear()),
      bedrooms: getDefaultNumericValue(initialData.bedrooms),
      bathrooms: getDefaultNumericValue(initialData.bathrooms),
      parkingSpots: getDefaultNumericValue(initialData.parkingSpots),
      gardenSize: getDefaultNumericValue(initialData.gardenSize),
      kitchenQuality: getDefaultNumericValue(initialData.kitchenQuality, 5),
      livingRoomQuality: getDefaultNumericValue(initialData.livingRoomQuality, 5),
      storageQuality: getDefaultNumericValue(initialData.storageQuality, 5),
      floorPlanQuality: getDefaultNumericValue(initialData.floorPlanQuality, 5),
      balconyTerraceQuality: getDefaultNumericValue(initialData.balconyTerraceQuality, 5),
      lightAndAirQuality: getDefaultNumericValue(initialData.lightAndAirQuality, 5),
      areaImpression: getDefaultNumericValue(initialData.areaImpression, 5),
      neighborhoodImpression: getDefaultNumericValue(initialData.neighborhoodImpression, 5),
      publicTransportAccess: getDefaultNumericValue(initialData.publicTransportAccess, 5),
      schoolsProximity: getDefaultNumericValue(initialData.schoolsProximity, 5),
      viewingImpression: getDefaultNumericValue(initialData.viewingImpression, 5),
      potentialScore: getDefaultNumericValue(initialData.potentialScore, 5),
    }
    : initialFormState);

  useEffect(() => {
    if (initialData) {
       setFormData({
        ...initialFormState,
        ...initialData,
        price: getDefaultNumericValue(initialData.price),
        area: getDefaultNumericValue(initialData.area),
        yearBuilt: getDefaultNumericValue(initialData.yearBuilt, new Date().getFullYear()),
        bedrooms: getDefaultNumericValue(initialData.bedrooms),
        bathrooms: getDefaultNumericValue(initialData.bathrooms),
        parkingSpots: getDefaultNumericValue(initialData.parkingSpots),
        gardenSize: getDefaultNumericValue(initialData.gardenSize),
        kitchenQuality: getDefaultNumericValue(initialData.kitchenQuality, 5),
        livingRoomQuality: getDefaultNumericValue(initialData.livingRoomQuality, 5),
        storageQuality: getDefaultNumericValue(initialData.storageQuality, 5),
        floorPlanQuality: getDefaultNumericValue(initialData.floorPlanQuality, 5),
        balconyTerraceQuality: getDefaultNumericValue(initialData.balconyTerraceQuality, 5),
        lightAndAirQuality: getDefaultNumericValue(initialData.lightAndAirQuality, 5),
        areaImpression: getDefaultNumericValue(initialData.areaImpression, 5),
        neighborhoodImpression: getDefaultNumericValue(initialData.neighborhoodImpression, 5),
        publicTransportAccess: getDefaultNumericValue(initialData.publicTransportAccess, 5),
        schoolsProximity: getDefaultNumericValue(initialData.schoolsProximity, 5),
        viewingImpression: getDefaultNumericValue(initialData.viewingImpression, 5),
        potentialScore: getDefaultNumericValue(initialData.potentialScore, 5),
      });
    } else {
      setFormData(initialFormState);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number' || e.target.getAttribute('inputmode') === 'numeric') {
        setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    }
    else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };
  
  const currentYear = new Date().getFullYear();
  const formSectionTitleClass = "text-lg font-semibold text-green-700 mb-3 pt-4 col-span-1 md:col-span-2 lg:col-span-3";

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {/* Section 1: Basic Info */}
      <h3 className={formSectionTitleClass}>Generell Informasjon</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:col-span-3 gap-x-6 gap-y-1">
        <Input label="Adresse / Navn på bolig" name="address" value={formData.address} onChange={handleChange} required wrapperClassName="lg:col-span-2"/>
        <Input label="FINN-lenke (valgfritt)" name="finnLink" value={formData.finnLink || ''} onChange={handleChange} wrapperClassName="lg:col-span-1"/>
        <Select
            label="Boligtype"
            name="propertyType"
            value={formData.propertyType}
            onChange={handleChange}
            options={Object.values(PropertyType).map(pt => ({ value: pt, label: pt }))}
        />
        <Input label="Pris (kr)" name="price" type="number" inputMode="numeric" value={formData.price.toString()} onChange={handleChange} required />
        <Input label="Areal (BRA, m²)" name="area" type="number" inputMode="numeric" value={formData.area.toString()} onChange={handleChange} required />
        <Input label="Byggeår" name="yearBuilt" type="number" inputMode="numeric" min="1700" max={currentYear} value={formData.yearBuilt.toString()} onChange={handleChange} required />
        <Input label="Antall soverom" name="bedrooms" type="number" inputMode="numeric" min="0" value={formData.bedrooms.toString()} onChange={handleChange} />
        <Input label="Antall bad" name="bathrooms" type="number" inputMode="numeric" step="0.5" min="0" value={formData.bathrooms.toString()} onChange={handleChange} />
      </div>

      {/* Section 2: Condition & Location */}
      <h3 className={formSectionTitleClass}>Tilstand og Beliggenhet</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:col-span-3 gap-x-6 gap-y-1">
        <Select
            label="Tilstand / Standard (Generell)"
            name="condition"
            value={formData.condition}
            onChange={handleChange}
            options={Object.values(ConditionRating).map(cr => ({ value: cr, label: cr }))}
        />
        <Select
            label="Beliggenhet / Nabolag (Makro)"
            name="location"
            value={formData.location}
            onChange={handleChange}
            options={Object.values(LocationRating).map(lr => ({ value: lr, label: lr }))}
        />
      </div>

      {/* Section 3: Features */}
      <h3 className={formSectionTitleClass}>Egenskaper og Fasiliteter</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:col-span-3 gap-x-6 gap-y-1">
        <Input label="Antall P-plasser (utenom garasje)" name="parkingSpots" type="number" inputMode="numeric" min="0" value={formData.parkingSpots.toString()} onChange={handleChange} />
        <Checkbox label="Har garasje" name="hasGarage" checked={formData.hasGarage} onChange={handleChange} wrapperClassName="mt-6"/>
        <Input label="Hagestørrelse (m²)" name="gardenSize" type="number" inputMode="numeric" min="0" value={formData.gardenSize.toString()} onChange={handleChange} />
        <Checkbox label="Har utleiedel" name="hasRentalUnit" checked={formData.hasRentalUnit} onChange={handleChange} wrapperClassName="mt-6"/>
      </div>
      
      {/* Section 4: 0-10 Quality Ratings */}
      <h3 className={formSectionTitleClass}>Kvalitetsvurderinger (0-10 poeng)</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:col-span-3 gap-x-6 gap-y-1">
        <Input label="Kjøkkenkvalitet" name="kitchenQuality" type="number" inputMode="numeric" min="0" max="10" value={formData.kitchenQuality.toString()} onChange={handleChange}/>
        <Input label="Stuekvalitet" name="livingRoomQuality" type="number" inputMode="numeric" min="0" max="10" value={formData.livingRoomQuality.toString()} onChange={handleChange}/>
        <Input label="Oppbevaringsmuligheter" name="storageQuality" type="number" inputMode="numeric" min="0" max="10" value={formData.storageQuality.toString()} onChange={handleChange}/>
        <Input label="Planløsning" name="floorPlanQuality" type="number" inputMode="numeric" min="0" max="10" value={formData.floorPlanQuality.toString()} onChange={handleChange}/>
        <Input label="Balkong/Terrasse" name="balconyTerraceQuality" type="number" inputMode="numeric" min="0" max="10" value={formData.balconyTerraceQuality.toString()} onChange={handleChange}/>
        <Input label="Lysforhold og luftighet" name="lightAndAirQuality" type="number" inputMode="numeric" min="0" max="10" value={formData.lightAndAirQuality.toString()} onChange={handleChange}/>
        <Input label="Områdeinntrykk (Mikro)" name="areaImpression" type="number" inputMode="numeric" min="0" max="10" value={formData.areaImpression.toString()} onChange={handleChange}/>
        <Input label="Nabolagsfølelse" name="neighborhoodImpression" type="number" inputMode="numeric" min="0" max="10" value={formData.neighborhoodImpression.toString()} onChange={handleChange}/>
        <Input label="Tilgang Off. Transport" name="publicTransportAccess" type="number" inputMode="numeric" min="0" max="10" value={formData.publicTransportAccess.toString()} onChange={handleChange}/>
        <Input label="Nærhet Skoler/Barnehager" name="schoolsProximity" type="number" inputMode="numeric" min="0" max="10" value={formData.schoolsProximity.toString()} onChange={handleChange}/>
        <Input label="Inntrykk på Visning" name="viewingImpression" type="number" inputMode="numeric" min="0" max="10" value={formData.viewingImpression.toString()} onChange={handleChange}/>
        <Input label="Potensial" name="potentialScore" type="number" inputMode="numeric" min="0" max="10" value={formData.potentialScore.toString()} onChange={handleChange}/>
      </div>
      
      {/* Section 5: Notes */}
      <h3 className={formSectionTitleClass}>Notater</h3>
      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-x-6 gap-y-1">
        <Textarea label="Renoveringsbehov (beskrivelse)" name="renovationNeeds" value={formData.renovationNeeds} onChange={handleChange} />
        <Textarea label="Andre relevante attributter/kommentarer" name="userComment" value={formData.userComment || ''} onChange={handleChange} />
        <Textarea label="Diverse (Eldre 'Other Attributes')" name="otherAttributes" value={formData.otherAttributes} onChange={handleChange} />
      </div>
      
      <div className="flex justify-end space-x-3 pt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>Avbryt</Button>
        <Button type="submit" variant="primary">{initialData?.id ? 'Oppdater bolig' : 'Legg til bolig'}</Button>
      </div>
    </form>
  );
};

export default PropertyForm;