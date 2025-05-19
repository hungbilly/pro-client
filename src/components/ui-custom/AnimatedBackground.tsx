
import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface AnimatedBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'subtle' | 'dots' | 'none';
  disableOverflowHidden?: boolean;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  children,
  className,
  variant = 'subtle',
  disableOverflowHidden = false,
  ...props
}) => {
  const backgroundRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (variant === 'none' || !backgroundRef.current || isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!backgroundRef.current) return;
      
      const { clientX, clientY } = e;
      const { width, height } = backgroundRef.current.getBoundingClientRect();
      
      const xPos = clientX / width - 0.5;
      const yPos = clientY / height - 0.5;
      
      // Add a very subtle parallax effect
      backgroundRef.current.style.setProperty('--mouse-x', `${xPos * 5}px`);
      backgroundRef.current.style.setProperty('--mouse-y', `${yPos * 5}px`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [variant, isMobile]);

  const getBgClasses = () => {
    switch (variant) {
      case 'dots':
        return 'bg-grid-pattern bg-[length:20px_20px] dark:opacity-5 opacity-[0.08]';
      case 'subtle':
        return 'bg-gradient-subtle dark:opacity-20 opacity-30';
      default:
        return '';
    }
  };

  return (
    <div 
      ref={backgroundRef}
      className={cn(
        'relative w-full min-h-screen',
        // Only apply overflow-hidden if not disabled
        !disableOverflowHidden && 'overflow-hidden',
        // Add touch-action property for mobile devices
        isMobile && 'touch-action-manipulation',
        className
      )}
      style={{ 
        touchAction: 'pan-y', // Allow vertical scrolling on touch devices
        ...((!isMobile && variant !== 'none') ? {
          transform: 'translate3d(var(--mouse-x, 0), var(--mouse-y, 0), 0)'
        } : {})
      }}
      {...props}
    >
      {variant !== 'none' && (
        <div 
          className={cn(
            'absolute inset-0 -z-10 transform transition-transform duration-500 ease-soft',
            getBgClasses()
          )}
          style={{ 
            transform: isMobile ? 'none' : 'translate3d(var(--mouse-x, 0), var(--mouse-y, 0), 0)'
          }}
        />
      )}
      {children}
    </div>
  );
};

export default AnimatedBackground;
