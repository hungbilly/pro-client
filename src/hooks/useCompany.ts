
import { useCompanyContext } from '@/context/CompanyContext';

export const useCompany = () => {
  const { 
    selectedCompany, 
    selectedCompanyId, 
    companies, 
    loading, 
    setSelectedCompany,
    setSelectedCompanyId
  } = useCompanyContext();

  return { 
    selectedCompany, 
    selectedCompanyId, 
    companies, 
    loading, 
    setSelectedCompany,
    setSelectedCompanyId
  };
};

export default useCompany;
