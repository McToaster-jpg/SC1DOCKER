import React from 'react';

export function TerranEmblem({ className }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="terranMetal" x1="0" y1="0" x2="100" y2="100">
          <stop offset="0%" stopColor="#dfe9f2" />
          <stop offset="45%" stopColor="#7fa8c9" />
          <stop offset="100%" stopColor="#1c3a52" />
        </linearGradient>
      </defs>
      <polygon points="50,4 88,22 88,58 50,96 12,58 12,22"
        fill="url(#terranMetal)" stroke="#0b1e2c" strokeWidth="2.5" />
      <polygon points="50,16 76,29 76,55 50,80 24,55 24,29"
        fill="none" stroke="#0b1e2c" strokeWidth="1.5" opacity="0.6" />
      <path d="M50 30 L62 42 L50 70 L38 42 Z" fill="#0b1e2c" opacity="0.85" />
      <rect x="46" y="38" width="8" height="20" fill="#00e5ff" opacity="0.9" />
      <circle cx="50" cy="50" r="3" fill="#ffffff" />
    </svg>
  );
}

export function ProtossEmblem({ className }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="protossGold" x1="0" y1="0" x2="100" y2="100">
          <stop offset="0%" stopColor="#fff4c9" />
          <stop offset="50%" stopColor="#f0c419" />
          <stop offset="100%" stopColor="#8a5a00" />
        </linearGradient>
        <radialGradient id="protossGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff9e0" stopOpacity="1" />
          <stop offset="100%" stopColor="#f0c419" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="36" fill="url(#protossGlow)" opacity="0.7" />
      <path d="M50 6 L62 40 L94 50 L62 60 L50 94 L38 60 L6 50 L38 40 Z"
        fill="url(#protossGold)" stroke="#5c3a00" strokeWidth="2" />
      <circle cx="50" cy="50" r="9" fill="#fffbe6" stroke="#8a5a00" strokeWidth="2" />
    </svg>
  );
}

export function ZergEmblem({ className }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="zergOrganic" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#d9a6ff" />
          <stop offset="55%" stopColor="#8b2fc9" />
          <stop offset="100%" stopColor="#2e0a4d" />
        </radialGradient>
      </defs>
      <path d="M50 8 C66 14 78 26 82 44 C86 62 76 80 62 90 C68 78 66 64 56 56
               C60 68 54 80 42 86 C48 74 44 62 34 58 C36 70 28 80 16 82
               C24 74 24 62 16 54 C22 58 30 58 36 52 C24 50 16 40 16 28
               C24 36 34 40 44 38 C34 30 30 18 34 8 C38 20 46 28 56 30
               C50 20 48 12 50 8 Z"
        fill="url(#zergOrganic)" stroke="#1a0630" strokeWidth="1.5" />
      <circle cx="50" cy="46" r="5" fill="#c9ff5e" opacity="0.9" />
    </svg>
  );
}

export function AllianceEmblem({ className }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="allianceSteel" x1="0" y1="0" x2="100" y2="100">
          <stop offset="0%" stopColor="#f2f6fa" />
          <stop offset="50%" stopColor="#9db6c7" />
          <stop offset="100%" stopColor="#233b4a" />
        </linearGradient>
      </defs>
      <polygon points="50,3 91,25 91,75 50,97 9,75 9,25"
        fill="url(#allianceSteel)" stroke="#0a1720" strokeWidth="2.5" />
      <polygon points="50,15 80,31 80,69 50,85 20,69 20,31"
        fill="#0a1720" opacity="0.9" />
      <path d="M50 24 L62 44 L50 76 L38 44 Z" fill="#00c6ff" opacity="0.95" />
      <path d="M28 50 L50 40 L72 50 L50 60 Z" fill="#f0c419" opacity="0.85" />
      <circle cx="50" cy="50" r="4.5" fill="#ffffff" />
    </svg>
  );
}
