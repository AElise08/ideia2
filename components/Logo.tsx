import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      {/* Pillar Base */}
      <rect x="20" y="80" width="60" height="10" rx="2" fill="currentColor" />
      
      {/* Pillar Shafts (Stylized as sound waves) */}
      <rect x="25" y="30" width="10" height="45" rx="2" fill="currentColor" opacity="0.8" />
      <rect x="45" y="20" width="10" height="55" rx="2" fill="currentColor" />
      <rect x="65" y="30" width="10" height="45" rx="2" fill="currentColor" opacity="0.8" />
      
      {/* Speech Bubble / Capital */}
      <path 
        d="M20 20C20 14.4772 24.4772 10 30 10H70C75.5228 10 80 14.4772 80 20V25C80 30.5228 75.5228 35 70 35H30C24.4772 35 20 30.5228 20 25V20Z" 
        fill="currentColor" 
      />
      
      {/* Accent Detail */}
      <circle cx="50" cy="22.5" r="3" fill="black" />
    </svg>
  );
};

export default Logo;
