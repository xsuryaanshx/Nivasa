'use client';

import React, { useState, useMemo } from 'react';

type IconComponentType = React.ElementType<{ className?: string }>;

export interface InteractiveMenuItem {
  label: string;
  icon: IconComponentType;
  id: string;
}

export interface InteractiveMenuProps {
  items?: InteractiveMenuItem[];
  accentColor?: string;
  activeIndex?: number;
  onItemClick?: (index: number, id: string) => void;
}

const defaultAccentColor = "hsl(var(--foreground))";

const InteractiveMenu: React.FC<InteractiveMenuProps> = ({
  items,
  accentColor,
  activeIndex: externalActiveIndex,
  onItemClick,
}) => {
  const finalItems = useMemo(() => items || [], [items]);

  const [internalActiveIndex, setInternalActiveIndex] = useState(0);
  const activeIndex = externalActiveIndex !== undefined ? externalActiveIndex : internalActiveIndex;

  const handleItemClick = (index: number) => {
    if (externalActiveIndex === undefined) {
      setInternalActiveIndex(index);
    }
    if (onItemClick) {
      onItemClick(index, finalItems[index].id);
    }
  };

  const navStyle = useMemo(() => {
    const activeColor = accentColor || defaultAccentColor;
    return { '--component-active-color': activeColor } as React.CSSProperties;
  }, [accentColor]);

  if (finalItems.length === 0) return null;

  return (
    <nav className="menu" role="navigation" style={navStyle}>
      {finalItems.map((item, index) => {
        const isActive = index === activeIndex;
        const IconComponent = item.icon;

        return (
          <button
            key={item.id}
            type="button"
            className={`menu__item ${isActive ? 'active' : ''}`}
            onClick={() => handleItemClick(index)}
          >
            <div className="menu__icon">
              <IconComponent className="icon h-6 w-6" />
            </div>
            <strong className={`menu__text ${isActive ? 'active' : ''}`}>{item.label}</strong>
          </button>
        );
      })}
    </nav>
  );
};

export { InteractiveMenu };
