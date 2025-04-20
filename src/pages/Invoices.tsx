
// When importing getInvoices
const { data: invoices = [], isLoading } = useQuery({
  queryKey: ['invoices'],
  queryFn: () => getInvoices(),
  enabled: !!selectedCompanyId,
});
