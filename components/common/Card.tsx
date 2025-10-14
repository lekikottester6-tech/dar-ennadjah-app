import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', title, ...props }) => {
  return (
    <div className={`bg-white rounded-xl shadow-lg border border-slate-100 transition-all duration-300 hover:shadow-xl ${className}`} {...props}>
      {title && (
        <div className="px-4 pt-4 pb-2 border-b border-slate-100">
          <h3 className="text-lg font-bold text-royal-blue">{title}</h3>
          <div className="mt-1.5 w-10 h-1 bg-accent-yellow rounded-full"></div>
        </div>
      )}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};

export default Card;