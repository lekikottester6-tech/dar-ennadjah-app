import React from 'react';

interface NavItemProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ label, icon, isActive, onClick }) => {
  const activeColor = 'text-black';
  const inactiveColor = 'text-yellow-900';

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center flex-1 pt-2 pb-1 transition-colors duration-200"
      aria-label={label}
    >
      <div className={`w-6 h-6 mb-1 transition-transform duration-200 ${isActive ? `${activeColor} transform scale-110` : inactiveColor}`}>
        {icon}
      </div>
      <span className={`text-xs ${isActive ? `${activeColor} font-semibold` : `${inactiveColor} font-medium`}`}>
        {label}
      </span>
    </button>
  );
};


interface BottomNavProps<T extends string> {
  activeView: T;
  setActiveView: (view: T) => void;
  navItems: { view: T; label: string; icon: React.ReactNode }[];
}

const BottomNav = <T extends string>({ activeView, setActiveView, navItems }: BottomNavProps<T>) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-accent-yellow shadow-[0_-2px_10px_rgba(0,0,0,0.1)] border-t border-yellow-400 flex z-30">
      {navItems.map((item) => (
        <NavItem
          key={item.view}
          label={item.label}
          icon={item.icon}
          isActive={activeView === item.view}
          onClick={() => setActiveView(item.view)}
        />
      ))}
    </nav>
  );
};

export default BottomNav;
