import React from 'react';

/**
 * Reusable FlagIcon component for Icelandic and English flags.
 * Renders crisp SVG flags compatible across Windows, Android, iOS, and macOS.
 */
export const FlagIS = ({ className = "w-5 h-3.5 rounded-[3px] object-cover inline-block shadow-sm border border-black/10 shrink-0" }) => (
  <svg className={className} viewBox="0 0 25 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="25" height="18" fill="#02529C"/>
    <rect x="7" width="4" height="18" fill="#FFFFFF"/>
    <rect y="7" width="25" height="4" fill="#FFFFFF"/>
    <rect x="8" width="2" height="18" fill="#DC1E35"/>
    <rect y="8" width="25" height="2" fill="#DC1E35"/>
  </svg>
);

export const FlagEN = ({ className = "w-5 h-3.5 rounded-[3px] object-cover inline-block shadow-sm border border-black/10 shrink-0" }) => (
  <svg className={className} viewBox="0 0 60 30" fill="none" xmlns="http://www.w3.org/2000/svg">
    <clipPath id="uk-flag-clip"><path d="M0 0v30h60V0z"/></clipPath>
    <clipPath id="uk-flag-diag"><path d="M30 15h30v15H30zM0 0h30v15H0zM30 0h30v15H30zM0 15h30v15H0z"/></clipPath>
    <g clipPath="url(#uk-flag-clip)">
      <path d="M0 0v30h60V0z" fill="#012169"/>
      <path d="M0 0l60 30M60 0L0 30" stroke="#FFFFFF" strokeWidth="6"/>
      <path d="M0 0l60 30M60 0L0 30" stroke="#C8102E" strokeWidth="4" clipPath="url(#uk-flag-diag)"/>
      <path d="M30 0v30M0 15h60" stroke="#FFFFFF" strokeWidth="10"/>
      <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6"/>
    </g>
  </svg>
);

export function FlagIcon({ lang, code, className = "w-5 h-3.5 rounded-[3px] object-cover inline-block shadow-sm border border-black/10 shrink-0" }) {
  const target = (lang || code || '').toLowerCase();
  if (target.startsWith('is')) {
    return <FlagIS className={className} />;
  }
  return <FlagEN className={className} />;
}

export default FlagIcon;
