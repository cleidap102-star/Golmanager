import React from 'react';
import { Club } from '../types/game';

interface ClubCrestProps {
  club: Pick<Club, 'shortName' | 'primaryColor' | 'secondaryColor' | 'name'>;
  size?: number;
  className?: string;
}

export const ClubCrest: React.FC<ClubCrestProps> = ({ club, size = 40, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={`Escudo ${club.name}`}
    >
      <path
        d="M10 10C10 8.5 11.2 7.5 12.7 7.5H51.3C52.8 7.5 54 8.5 54 10V31C54 45.2 39.2 54.6 32 58.2C24.8 54.6 10 45.2 10 31V10Z"
        fill={club.primaryColor}
        stroke="#E2E8F0"
        strokeOpacity="0.28"
        strokeWidth="2.5"
      />
      <path
        d="M32 7.5H51.3C52.8 7.5 54 8.5 54 10V31C54 45.2 39.2 54.6 32 58.2V7.5Z"
        fill={club.secondaryColor}
        fillOpacity="0.28"
      />
      <path
        d="M14 14H50V20H14V14Z"
        fill={club.secondaryColor}
        fillOpacity="0.88"
      />
      <rect
        x="15"
        y="24"
        width="34"
        height="18"
        rx="3"
        fill="#0B111A"
        fillOpacity="0.72"
      />
      <text
        x="32"
        y="37"
        textAnchor="middle"
        fill="#F8FAFC"
        fontSize="12"
        fontWeight="800"
        fontFamily="Barlow Condensed, sans-serif"
        letterSpacing="0.8"
      >
        {club.shortName}
      </text>
    </svg>
  );
};
