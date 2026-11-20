import React from 'react';
import { KitConfig } from '../types/game';

interface JerseySvgProps {
  kit: KitConfig;
  size?: number;
  label?: string;
}

export const JerseySvg: React.FC<JerseySvgProps> = ({ kit, size = 120, label }) => {
  const clipId = React.useId();

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={label || 'Uniforme do clube'}
      >
        <defs>
          <clipPath id={clipId}>
            <path d="M38 16L48 22C54 25 66 25 72 22L82 16L104 28L96 50L84 44V104H36V44L24 50L16 28L38 16Z" />
          </clipPath>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y="0" width="120" height="120" fill={kit.primary} />
          {kit.pattern === 'LISTRADO' && (
            <>
              <rect x="36" y="0" width="9" height="120" fill={kit.secondary} />
              <rect x="55" y="0" width="10" height="120" fill={kit.secondary} />
              <rect x="75" y="0" width="9" height="120" fill={kit.secondary} />
            </>
          )}
          {kit.pattern === 'FAIXA' && (
            <rect x="0" y="48" width="120" height="22" fill={kit.secondary} />
          )}
          {kit.pattern === 'METADE' && (
            <rect x="60" y="0" width="60" height="120" fill={kit.secondary} />
          )}
          {/* Collar */}
          <path d="M44 16C52 26 68 26 76 16" stroke={kit.accent} strokeWidth="5" fill="none" />
          {/* Sleeve cuffs */}
          <path d="M16 28L24 50" stroke={kit.accent} strokeWidth="4" />
          <path d="M104 28L96 50" stroke={kit.accent} strokeWidth="4" />
        </g>

        <path
          d="M38 16L48 22C54 25 66 25 72 22L82 16L104 28L96 50L84 44V104H36V44L24 50L16 28L38 16Z"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="2"
          fill="none"
        />
      </svg>
      {label && <span className="text-xs text-slate-400 font-medium">{label}</span>}
    </div>
  );
};
