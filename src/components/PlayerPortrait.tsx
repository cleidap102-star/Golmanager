import React from 'react';
import { GenderDivision } from '../types/game';

interface PlayerPortraitProps {
  name: string;
  countryCode?: string;
  gender?: GenderDivision;
  age?: number;
  faceSeed?: string;
  primaryColor?: string;
  secondaryColor?: string;
  size?: number;
  className?: string;
}

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const SKIN_TONES = [
  '#FCE3D1', // 0 very light
  '#F2C9A8', // 1 light warm
  '#E0AC82', // 2 olive / tan
  '#C68652', // 3 medium brown
  '#9A5C34', // 4 dark brown
  '#6E3E22', // 5 deep brown
];

const HAIR_COLORS = [
  '#161414', // jet black
  '#2C1E16', // dark brown
  '#4A3123', // chestnut
  '#8C6239', // light brown
  '#C69C4E', // blonde
  '#9B4426', // auburn
];

const DEEP_SKIN_COUNTRIES = new Set(['SOM', 'NGA', 'GHA', 'SEN', 'CMR', 'CIV', 'MAR', 'EGY', 'RSA']);
const LIGHT_SKIN_COUNTRIES = new Set(['ENG', 'GER', 'NOR', 'SWE', 'DEN', 'NED', 'POL', 'BEL', 'RUS', 'SCO', 'USA']);
const EAST_ASIAN_COUNTRIES = new Set(['JPN', 'KOR', 'CHN']);

function pickSkinPalette(countryCode: string | undefined, h: number): string {
  const code = (countryCode || '').toUpperCase();
  if (DEEP_SKIN_COUNTRIES.has(code)) {
    const pool = code === 'MAR' || code === 'EGY' ? [2, 3, 4] : [3, 4, 5, 5];
    return SKIN_TONES[pool[h % pool.length]];
  }
  if (EAST_ASIAN_COUNTRIES.has(code)) {
    const pool = [0, 1, 2];
    return SKIN_TONES[pool[h % pool.length]];
  }
  if (LIGHT_SKIN_COUNTRIES.has(code)) {
    const pool = [0, 0, 1, 2, 3];
    return SKIN_TONES[pool[h % pool.length]];
  }
  // Brazil, LatAm, Portugal, France, Spain, Italy, mixed pools
  const pool = [0, 1, 2, 2, 3, 4, 5];
  return SKIN_TONES[pool[h % pool.length]];
}

export const PlayerPortrait: React.FC<PlayerPortraitProps> = ({
  name,
  countryCode = 'BRA',
  gender = 'MASCULINO',
  age = 24,
  faceSeed,
  primaryColor = '#10B981',
  secondaryColor = '#0F172A',
  size = 40,
  className = '',
}) => {
  const h1 = hashSeed(faceSeed || `${name}-${countryCode}`);
  const h2 = hashSeed(`${name}-v2-${age}`);
  const h3 = hashSeed(`${countryCode}-${faceSeed || name}-v3`);

  const skin = pickSkinPalette(countryCode, h1);
  const isDeepSkin = skin === '#6E3E22' || skin === '#9A5C34';
  const hairColor = isDeepSkin
    ? HAIR_COLORS[h2 % 2]
    : EAST_ASIAN_COUNTRIES.has((countryCode || '').toUpperCase())
      ? HAIR_COLORS[h2 % 2]
      : age >= 50 && h3 % 4 === 0
        ? '#CBD5E1'
        : HAIR_COLORS[h2 % HAIR_COLORS.length];

  const hairStyle =
    gender === 'FEMININO'
      ? (h3 % 4) // 0: ponytail/bob, 1: long wavy, 2: top bun, 3: sporty short
      : (h3 % 5); // 0: fade, 1: curly top, 2: side part, 3: buzzcut, 4: afro/volume

  const hasBeard = gender === 'MASCULINO' && age >= 21 && h1 % 3 === 0;
  const hasMustache = !hasBeard && gender === 'MASCULINO' && age >= 23 && h2 % 5 === 0;
  const browTilt = (h2 % 3) - 1; // -1, 0, 1
  const mouthSmile = h3 % 4 !== 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`rounded-full shrink-0 bg-[#182334] border border-white/15 overflow-hidden ${className}`}
      aria-label={`Retrato de ${name}`}
    >
      {/* Subtle radial background */}
      <rect width="64" height="64" fill="#152030" />
      <circle cx="32" cy="28" r="24" fill={primaryColor} fillOpacity="0.16" />

      {/* Back hair for long feminine styles */}
      {gender === 'FEMININO' && hairStyle === 1 && (
        <path
          d="M15 26 C14 40 16 52 20 56 L44 56 C48 52 50 40 49 26 Z"
          fill={hairColor}
        />
      )}
      {gender === 'FEMININO' && hairStyle === 0 && (
        <circle cx="32" cy="12" r="7" fill={hairColor} />
      )}
      {gender === 'FEMININO' && hairStyle === 2 && (
        <circle cx="32" cy="9" r="6.5" fill={hairColor} />
      )}

      {/* Shoulders & Club Jersey */}
      <path
        d="M8 64 C10 50 19 46 32 46 C45 46 54 50 56 64 Z"
        fill={primaryColor}
      />
      <path
        d="M24 46 L32 54 L40 46"
        fill="none"
        stroke={secondaryColor}
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      {/* Neck */}
      <rect x="27" y="38" width="10" height="11" rx="4" fill={skin} />
      <path d="M27 41 Q32 45 37 41" fill="#000000" fillOpacity="0.14" />

      {/* Ears */}
      <circle cx="17.5" cy="29" r="3.4" fill={skin} />
      <circle cx="46.5" cy="29" r="3.4" fill={skin} />

      {/* Head */}
      <rect x="18" y="14" width="28" height="29" rx="13.5" fill={skin} />

      {/* Hair styles */}
      {gender === 'MASCULINO' && hairStyle === 0 && (
        <path
          d="M18 24 C18 14 24 10 32 10 C40 10 46 14 46 24 C44 19 40 17 32 17 C24 17 20 19 18 24 Z"
          fill={hairColor}
        />
      )}
      {gender === 'MASCULINO' && hairStyle === 1 && (
        <g fill={hairColor}>
          <circle cx="23" cy="15" r="5" />
          <circle cx="30" cy="13" r="5.5" />
          <circle cx="38" cy="14" r="5" />
          <circle cx="43" cy="18" r="4" />
          <circle cx="20" cy="19" r="4" />
        </g>
      )}
      {gender === 'MASCULINO' && hairStyle === 2 && (
        <path
          d="M17.5 25 C17.5 13 24 9.5 33 10 C42 10.5 46.5 15 46 24 C43 18 37 16 29 17.5 C23 18.5 19.5 21 17.5 25 Z"
          fill={hairColor}
        />
      )}
      {gender === 'MASCULINO' && hairStyle === 3 && (
        <path
          d="M18.5 22 C19.5 13.5 25 11 32 11 C39 11 44.5 13.5 45.5 22 C42 18.5 37 17.5 32 17.5 C27 17.5 22 18.5 18.5 22 Z"
          fill={hairColor}
          fillOpacity="0.88"
        />
      )}
      {gender === 'MASCULINO' && hairStyle === 4 && (
        <path
          d="M15 24 C14 11 22 7 32 7 C42 7 50 11 49 24 C46 17.5 40 16 32 16 C24 16 18 17.5 15 24 Z"
          fill={hairColor}
        />
      )}

      {gender === 'FEMININO' && (hairStyle === 0 || hairStyle === 2) && (
        <path
          d="M17.5 25 C17.5 13 24 10 32 10 C40 10 46.5 13 46.5 25 C43 18.5 38 17 32 17 C26 17 21 18.5 17.5 25 Z"
          fill={hairColor}
        />
      )}
      {gender === 'FEMININO' && hairStyle === 1 && (
        <path
          d="M17 26 C17 13 24 10 32 10 C40 10 47 13 47 26 C43 18 38 17 32 18 C26 17 21 18 17 26 Z"
          fill={hairColor}
        />
      )}
      {gender === 'FEMININO' && hairStyle === 3 && (
        <path
          d="M17.5 24 C18 13 24 10 32 10 C40 10 46 13 46.5 24 C42 18 36 16.5 28 18 C23 19 19.5 21 17.5 24 Z"
          fill={hairColor}
        />
      )}

      {/* Eyebrows */}
      <line
        x1="22.5"
        y1={24.5 + browTilt * 0.5}
        x2="28"
        y2="24"
        stroke={hairColor}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <line
        x1="36"
        y1="24"
        x2="41.5"
        y2={24.5 + browTilt * 0.5}
        stroke={hairColor}
        strokeWidth="1.7"
        strokeLinecap="round"
      />

      {/* Eyes */}
      <circle cx="25.5" cy="27.8" r="1.7" fill="#111827" />
      <circle cx="38.5" cy="27.8" r="1.7" fill="#111827" />
      <circle cx="26" cy="27.2" r="0.55" fill="#FFFFFF" />
      <circle cx="39" cy="27.2" r="0.55" fill="#FFFFFF" />

      {/* Nose */}
      <path
        d="M32 27.5 L31 32.5 L33.5 33"
        fill="none"
        stroke="#000000"
        strokeOpacity="0.22"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Facial hair */}
      {hasBeard && (
        <path
          d="M19 31 C19.5 39.5 25 43.5 32 43.5 C39 43.5 44.5 39.5 45 31 C43 35.5 38.5 38 32 38 C25.5 38 21 35.5 19 31 Z"
          fill={hairColor}
          fillOpacity="0.72"
        />
      )}
      {hasMustache && (
        <path
          d="M27.5 35 Q32 33.2 36.5 35"
          fill="none"
          stroke={hairColor}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}

      {/* Mouth */}
      {mouthSmile ? (
        <path
          d="M27.8 36.5 Q32 39.2 36.2 36.5"
          fill="none"
          stroke="#4B1D1D"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      ) : (
        <line
          x1="28.5"
          y1="37.2"
          x2="35.5"
          y2="37.2"
          stroke="#4B1D1D"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
};
