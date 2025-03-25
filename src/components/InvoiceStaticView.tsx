
import React from 'react';
import { Invoice, Client, Job } from '@/types';

interface CompanyData {
  name: string;
  logo_url?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface InvoiceStaticViewProps {
  invoice: Invoice;
  client: Client;
  company: CompanyData;
  job?: Job | null;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

const InvoiceStaticView: React.FC<InvoiceStaticViewProps> = ({ 
  invoice, 
  client, 
  company, 
  job 
}) => {
  // Status badge colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return '#9ca3af';
      case 'sent': return '#3b82f6';
      case 'accepted': return '#22c55e';
      case 'paid': return '#8b5cf6';
      default: return '#9ca3af';
    }
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      {/* Header with logo and invoice info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
        <div style={{ flex: '1' }}>
          {company.logo_url ? (
            <img 
              src={company.logo_url} 
              alt={`${company.name} Logo`} 
              style={{ maxHeight: '120px', maxWidth: '200px' }}
            />
          ) : (
            <div style={{ height: '80px', width: '80px', backgroundColor: '#f3f4f6', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '30px', color: '#9ca3af' }}>🏢</div>
            </div>
          )}
          
          <div style={{ marginTop: '20px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>INVOICE</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}># {invoice.number}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', marginBottom: '2px' }}>INVOICE ISSUE DATE</div>
            <div style={{ fontSize: '14px' }}>{new Date(invoice.date).toLocaleDateString()}</div>
            <div style={{ marginTop: '8px' }}>
              <span style={{ 
                padding: '4px 8px', 
                borderRadius: '4px', 
                backgroundColor: getStatusColor(invoice.status), 
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {invoice.status.toUpperCase()}
              </span>
              
              {invoice.contractStatus === 'accepted' && (
                <span style={{ 
                  marginLeft: '8px',
                  padding: '4px 8px', 
                  borderRadius: '4px', 
                  backgroundColor: '#22c55e', 
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  CONTRACT ACCEPTED ✓
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div style={{ flex: '1', textAlign: 'right' }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>FROM</div>
            <div style={{ fontWeight: 'bold' }}>{company.name || 'Company'}</div>
            {company.email && <div style={{ fontSize: '14px' }}>{company.email}</div>}
            {company.phone && <div style={{ fontSize: '14px' }}>{company.phone}</div>}
            {company.address && <div style={{ fontSize: '14px' }}>{company.address}</div>}
          </div>
          
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>INVOICE FOR</div>
            {job && <div style={{ fontWeight: 'bold' }}>{job.title}</div>}
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '4px' }}>Client: {client.name}</div>
            {client.email && <div style={{ fontSize: '14px' }}>✉️ {client.email}</div>}
            {client.phone && <div style={{ fontSize: '14px' }}>📞 {client.phone}</div>}
            {client.address && <div style={{ fontSize: '14px' }}>📍 {client.address}</div>}
          </div>
          
          {job?.date && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>JOB DATE</div>
              <div style={{ fontSize: '14px' }}>{job.date}</div>
            </div>
          )}
        </div>
      </div>
      
      <hr style={{ border: '0', height: '1px', backgroundColor: '#e5e7eb', margin: '20px 0' }} />
      
      {/* Invoice Content */}
      <div>
        <h3 style={{ display: 'flex', alignItems: 'center', fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
          <span style={{ marginRight: '8px' }}>📦</span> Products / Packages
        </h3>
        
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: '#f9fafb' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '16px', fontSize: '14px', color: '#6b7280', fontWeight: 'bold' }}>
            <div style={{ flex: '1' }}>Package Name</div>
            <div style={{ flex: '1' }}>Description</div>
            <div style={{ width: '80px', textAlign: 'right' }}>Quantity</div>
            <div style={{ width: '100px', textAlign: 'right' }}>Unit Price</div>
            <div style={{ width: '100px', textAlign: 'right' }}>Amount</div>
          </div>
          
          {invoice.items && invoice.items.length > 0 ? (
            invoice.items.map((item, index) => (
              <div 
                key={item.id} 
                style={{ 
                  display: 'flex', 
                  borderBottom: index < invoice.items.length - 1 ? '1px solid #e5e7eb' : 'none',
                  paddingBottom: '12px',
                  marginBottom: '12px'
                }}
              >
                <div style={{ flex: '1' }}>
                  <div style={{ fontWeight: 'bold' }}>{item.name || 'Unnamed Package'}</div>
                </div>
                
                <div style={{ flex: '1' }}>
                  {item.description && (
                    <div style={{ fontSize: '14px' }} dangerouslySetInnerHTML={{ __html: item.description }} />
                  )}
                </div>
                
                <div style={{ width: '80px', textAlign: 'right', fontSize: '14px', color: '#6b7280' }}>
                  {item.quantity}
                </div>
                
                <div style={{ width: '100px', textAlign: 'right', fontSize: '14px', color: '#6b7280' }}>
                  {formatCurrency(item.rate)}
                </div>
                
                <div style={{ width: '100px', textAlign: 'right', fontWeight: 'bold' }}>
                  {formatCurrency(item.amount)}
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: '#6b7280' }}>No items in this invoice.</p>
          )}
          
          <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
            <span>Total</span>
            <span>{formatCurrency(invoice.amount)}</span>
          </div>
        </div>
      </div>
      
      {/* Invoice Notes */}
      {invoice.notes && (
        <div style={{ marginTop: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>Notes</h3>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }} dangerouslySetInnerHTML={{ __html: invoice.notes }} />
        </div>
      )}
      
      <hr style={{ border: '0', height: '1px', backgroundColor: '#e5e7eb', margin: '32px 0' }} />
      
      {/* Payment Schedule */}
      <div>
        <h3 style={{ display: 'flex', alignItems: 'center', fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
          <span style={{ marginRight: '8px' }}>📅</span> Payment Schedule
        </h3>
        
        {Array.isArray(invoice.paymentSchedules) && invoice.paymentSchedules.length > 0 ? (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px' }}>Description</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px' }}>Due Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px' }}>Amount</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoice.paymentSchedules.map((schedule, index) => {
                  const amount = (invoice.amount * schedule.percentage) / 100;
                  return (
                    <tr 
                      key={schedule.id} 
                      style={{ 
                        borderBottom: index < invoice.paymentSchedules.length - 1 ? '1px solid #e5e7eb' : 'none' 
                      }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        {schedule.description || `Payment ${index + 1}`}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {new Date(schedule.dueDate).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {formatCurrency(amount)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          backgroundColor: schedule.status === 'paid' ? '#22c55e' : '#f59e0b', 
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          {schedule.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: '#f9fafb', color: '#6b7280' }}>
            Full payment of {formatCurrency(invoice.amount)} due on {new Date(invoice.dueDate).toLocaleDateString()}
          </div>
        )}
      </div>
      
      {/* Contract Terms */}
      {invoice.contractTerms && (
        <div style={{ marginTop: '32px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
            <span style={{ marginRight: '8px' }}>📄</span> Contract Terms
          </h3>
          
          {invoice.contractStatus === 'accepted' && (
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '8px', color: '#22c55e', fontWeight: 'bold' }}>✓</span>
              <span style={{ color: '#166534' }}>This contract has been accepted</span>
            </div>
          )}
          
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }} dangerouslySetInnerHTML={{ __html: invoice.contractTerms }} />
        </div>
      )}
      
      <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '12px', color: '#9ca3af' }}>
        This invoice was generated automatically. Please contact us if you have any questions.
      </div>
    </div>
  );
};

export default InvoiceStaticView;
