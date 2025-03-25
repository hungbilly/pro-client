
import React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

export function withRouter<P extends object>(Component: React.ComponentType<P & { navigate: any; params: any; location: any }>) {
  return (props: P) => {
    const navigate = useNavigate();
    const params = useParams();
    const location = useLocation();
    
    return <Component {...props} navigate={navigate} params={params} location={location} />;
  };
}
