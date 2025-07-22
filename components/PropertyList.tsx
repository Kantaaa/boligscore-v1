import React, { useState, useMemo } from 'react';
import { Property, SortKey, SortDirection } from '../types';
import PropertyCard from './PropertyCard';
import PropertyTable from './PropertyTable';
import Button from './ui/Button';
import { ViewMode } from '../App';

interface PropertyListProps {
  properties: Property[];
  onEditProperty: (property: Property) => void;
  onDeleteProperty: (propertyId: string) => void;
  viewMode: ViewMode;
  deletingId?: string | null;
}

const PropertyList: React.FC<PropertyListProps> = ({
  properties,
  onEditProperty,
  onDeleteProperty,
  viewMode,
  deletingId
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('totalScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedProperties = useMemo(() => {
    return [...properties].sort((a, b) => {
      let valA = a?.[sortKey];
      let valB = b?.[sortKey];

      if (sortKey === 'totalScore') {
        valA = a.totalScore ?? 0;
        valB = b.totalScore ?? 0;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      return 0;
    });
  }, [properties, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'address' ? 'asc' : 'desc');
    }
  };

  const SortButton: React.FC<{ SKey: SortKey; label: string }> = ({ SKey, label }) => (
    <Button
      variant={sortKey === SKey ? 'primary' : 'secondary'}
      size="sm"
      onClick={() => handleSort(SKey)}
      rightIcon={
        sortKey === SKey ? (
          sortDirection === 'asc' ? (
            <i className="fas fa-arrow-up" />
          ) : (
            <i className="fas fa-arrow-down" />
          )
        ) : (
          <i className="fas fa-sort text-slate-400" />
        )
      }
      className="min-w-[100px] justify-center"
    >
      {label}
    </Button>
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2 items-center">
        <span className="text-sm font-medium text-slate-700 mr-2">Sorter etter:</span>
        <SortButton SKey="totalScore" label="Totalscore" />
        <SortButton SKey="price" label="Pris" />
        <SortButton SKey="area" label="Areal" />
        <SortButton SKey="address" label="Adresse" />
      </div>

      {sortedProperties.length === 0 ? (
        <div className="text-slate-500 italic">Ingen boliger å vise.</div>
      ) : viewMode === 'list' ? (
        <PropertyTable
          properties={sortedProperties}
          onEditProperty={onEditProperty}
          onDeleteProperty={onDeleteProperty}
          deletingId={deletingId}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedProperties.map(property => (
            <PropertyCard
              key={property.id}
              property={property}
              onEdit={onEditProperty}
              onDelete={onDeleteProperty}
              deletingId={deletingId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PropertyList;
