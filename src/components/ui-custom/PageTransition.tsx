
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ 
  children, 
  className,
  delay = 0 
}) => {
  // Animation variants
  const variants = {
    hidden: { opacity: 0, y: 10 },
    enter: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
        staggerChildren: 0.1,
        delay,
      }
    },
    exit: { 
      opacity: 0, 
      y: -10,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 1, 1]
      }
    }
  };

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="enter"
      exit="exit"
      className={cn('w-full', className)}
    >
      {children}
    </motion.div>
  );
};

// You also need to add framer-motion as a dependency
<lov-add-dependency>framer-motion@latest</lov-add-dependency>

export default PageTransition;
