import React from 'react';
import { Property } from '../types';
import ScoreBadge from './ui/Badge';
import Button from './ui/Button';

interface PropertyTableProps {
  properties: Property[];
  onEditProperty: (property: Property) => void;
  onDeleteProperty: (propertyId: string) => void;
  deletingId?: string | null;
}

const PropertyTable: React.FC<PropertyTableProps> = ({ properties, onEditProperty, onDeleteProperty, deletingId }) => {
  if (properties.length === 0) {
    return null; 
  }

  const formatComment = (comment?: string): string => {
    if (!comment) return '-';
    if (comment.length > 50) {
      return `${comment.substring(0, 50)}...`;
    }
    return comment;
  };

  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Adresse</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Score</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">Pris</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Areal</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">Type</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Notat (Andre rel.)</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Handlinger</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {properties.map(property => (
            <tr key={property.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm font-medium text-green-700">{property.address}</div>
                {property.finnLink && (
                  <a 
                    href={property.finnLink.startsWith('http') ? property.finnLink : `https://${property.finnLink}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs text-green-600 hover:underline"
                  >
                    FINN-annonse
                  </a>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <ScoreBadge score={property.totalScore || 0} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 hidden sm:table-cell">
                {property.price.toLocaleString('nb-NO')} kr
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 hidden md:table-cell">
                {property.area} m²
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 hidden lg:table-cell">
                {property.propertyType}
              </td>
              <td className="px-4 py-3 whitespace-normal text-xs text-slate-600 hidden md:table-cell max-w-xs break-words" title={property.userComment}>
                {formatComment(property.userComment)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                <div className="flex items-center space-x-1 h-8">
                  {deletingId === property.id ? (
                    <span className="text-slate-500 text-xs flex items-center px-2">
                      <i className="fas fa-spinner animate-spin mr-2"></i> Sletter...
                    </span>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => onEditProperty(property)} title="Rediger bolig" disabled={!!deletingId}>
                        <i className="fas fa-edit text-green-600"></i>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onDeleteProperty(property.id)} title="Slett bolig" disabled={!!deletingId}>
                        <i className="fas fa-trash text-red-600"></i>
                      </Button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PropertyTable;