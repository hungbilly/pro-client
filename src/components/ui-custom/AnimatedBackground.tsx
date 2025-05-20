
import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface AnimatedBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'subtle' | 'dots' | 'none' | 'gradient-purple' | 'gradient-blue';
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

  // Fix scrolling on component mount
  useEffect(() => {
    if (isMobile) {
      // Force enable scrolling on mobile
      document.body.style.overflow = 'auto';
      document.body.style.touchAction = 'auto';
      document.documentElement.style.touchAction = 'auto';
      
      // For iOS Safari specifically
      document.body.style.position = 'static';
      document.body.style.height = 'auto';
      document.documentElement.style.height = 'auto';
      
      // Small delay to ensure DOM is ready and force a redraw
      const timer = setTimeout(() => {
        window.scrollTo(0, 1);
        window.scrollTo(0, 0);
      }, 100);
      
      return () => {
        clearTimeout(timer);
        // Reset styles when component unmounts
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
        document.body.style.position = '';
      };
    }
  }, [isMobile]);

  // Only add mouse effect on non-mobile devices
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
      case 'gradient-purple':
        return 'bg-gradient-to-br from-purple-50 via-fuchsia-50 to-indigo-50 dark:from-purple-950/10 dark:via-fuchsia-950/10 dark:to-indigo-950/10';
      case 'gradient-blue':
        return 'bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 dark:from-blue-950/10 dark:via-cyan-950/10 dark:to-sky-950/10';
      default:
        return '';
    }
  };

  return (
    <div 
      ref={backgroundRef}
      className={cn(
        'relative w-full min-h-screen',
        // Only apply overflow-hidden if not disabled and not on mobile
        !disableOverflowHidden && !isMobile && 'overflow-hidden',
        // Add mobile-specific class for scrolling
        isMobile && 'touch-action-manipulation',
        className
      )}
      style={{ 
        touchAction: isMobile ? 'pan-y' : 'inherit', // Enable vertical scrolling on mobile
        overflowY: isMobile ? 'auto' : 'inherit',
        // Fixed: Use string literal for -webkit-overflow-scrolling instead of camelCase property
        ...(isMobile ? { WebkitOverflowScrolling: 'touch' } as any : {}),
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
