import React from 'react';

const CakeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4a1 1 0 00-1 1v6a1 1 0 001 1h16a1 1 0 001-1v-6a1 1 0 00-1-1z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7a1 1 0 00-1-1h-1a1 1 0 00-1 1v5h3V7zM12 7a1 1 0 00-1-1H7a1 1 0 00-1 1v5h6V7z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7V4m0 0a2 2 0 100 4 2 2 0 000-4z" />
    </svg>
);

export default CakeIcon;