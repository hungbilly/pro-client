
import React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

export function withRouter<P extends object>(
  Component: React.ComponentType<P & { navigate: ReturnType<typeof useNavigate>; params: Record<string, string>; location: ReturnType<typeof useLocation> }>
) {
  return (props: Omit<P, 'navigate' | 'params' | 'location'>) => {
    const navigate = useNavigate();
    const params = useParams();
    const location = useLocation();
    
    return <Component {...props as P} navigate={navigate} params={params} location={location} />;
  };
}
