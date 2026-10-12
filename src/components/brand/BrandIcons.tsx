import React from "react";

interface IconProps {
  className?: string;
  size?: number;
}

/**
 * Custom SVG Brand Icons tailored specifically for KB KHATA & FASHIONS
 */
export const BrandBillingIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
    <path d="M7 8H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M7 12H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="16" cy="15" r="2" fill="currentColor" />
    <path d="M7 16H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const BrandAnalyticsIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M3 3V21H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 16L12 11L15 14L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="11" r="1.5" fill="currentColor" />
    <circle cx="21" cy="8" r="1.5" fill="currentColor" />
  </svg>
);

export const BrandCustomersIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
    <path d="M2 21V19C2 15.6863 4.68629 13 8 13H10C13.3137 13 16 15.6863 16 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M16 11C17.6569 11 19 9.65685 19 8C19 6.34315 17.6569 5 16 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M19 14C20.6569 14.5 22 16.5 22 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const BrandCashfreeIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="2" y="5" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
    <path d="M2 10H22" stroke="currentColor" strokeWidth="2" />
    <circle cx="6.5" cy="15" r="1.5" fill="currentColor" />
    <path d="M11 15H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M14 2L18 5L14 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const BrandReportsIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M6 9V2H18V9" stroke="currentColor" strokeWidth="2" />
    <path d="M6 18H4C2.89543 18 2 17.1046 2 16V11C2 9.89543 2.89543 9 4 9H20C21.1046 9 22 9.89543 22 11V16C22 17.1046 21.1046 18 20 18H18" stroke="currentColor" strokeWidth="2" />
    <rect x="6" y="14" width="12" height="8" rx="1" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" />
    <line x1="9" y1="17" x2="15" y2="17" stroke="currentColor" strokeWidth="1.5" />
    <line x1="9" y1="19.5" x2="13" y2="19.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const BrandShieldIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M12 2L4 6V11C4 16.5228 7.41828 21.2828 12 22C16.5817 21.2828 20 16.5228 20 11V6L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M9 11.5L11 13.5L15 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const BrandAiTourIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M12 2L14.4 7.6L20 10L14.4 12.4L12 18L9.6 12.4L4 10L9.6 7.6L12 2Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="19" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="5" cy="18" r="1.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

