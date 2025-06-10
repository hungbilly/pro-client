
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import VersionControlPanel from '@/components/version-control/VersionControlPanel';
import TopNavbar from '@/components/TopNavbar';
import PageTransition from '@/components/ui-custom/PageTransition';

const VersionControl = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only allow admins to access version control
    if (!isAdmin) {
      navigate('/');
      return;
    }
  }, [isAdmin, navigate]);

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <TopNavbar />
      <PageTransition>
        <VersionControlPanel />
      </PageTransition>
    </>
  );
};

export default VersionControl;
