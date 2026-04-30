
import React from 'react';

interface BadgeProps {
  score: number;
}

const ScoreBadge: React.FC<BadgeProps> = ({ score }) => {
  let bgColor = 'bg-slate-200';
  let textColor = 'text-slate-800';

  if (score >= 80) {
    bgColor = 'bg-emerald-100';
    textColor = 'text-emerald-700';
  } else if (score >= 65) {
    bgColor = 'bg-green-100';
    textColor = 'text-green-700';
  } else if (score >= 50) {
    bgColor = 'bg-yellow-100';
    textColor = 'text-yellow-700';
  } else if (score >= 35) {
    bgColor = 'bg-orange-100';
    textColor = 'text-orange-700';
  } else {
    bgColor = 'bg-red-100';
    textColor = 'text-red-700';
  }

  return (
    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${bgColor} ${textColor}`}>
      {score}
    </span>
  );
};

export default ScoreBadge;
    