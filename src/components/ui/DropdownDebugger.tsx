
import React, { useState, useEffect } from 'react';
import { CountryDropdown } from './country-dropdown';
import { CurrencyDropdown } from './currency-dropdown';
import { Button } from './button';
import { Label } from './label';

export function DropdownDebugger() {
  const [country, setCountry] = useState('hk');
  const [currency, setCurrency] = useState('hkd');
  const [testUndefined, setTestUndefined] = useState(false);

  // Log state changes
  useEffect(() => {
    console.log('DropdownDebugger country:', country);
    console.log('DropdownDebugger currency:', currency);
  }, [country, currency]);

  // Simulate undefined value
  const handleTestUndefined = () => {
    setTestUndefined(true);
    // @ts-ignore - deliberately setting to undefined for testing
    setCountry(undefined);
    // @ts-ignore - deliberately setting to undefined for testing
    setCurrency(undefined);
  };

  // Reset to defined values
  const handleReset = () => {
    setTestUndefined(false);
    setCountry('hk');
    setCurrency('hkd');
  };

  return (
    <div className="space-y-6 p-6 border rounded-lg">
      <h2 className="text-xl font-bold">Dropdown Debugger</h2>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="debug-country">Country Value: {JSON.stringify(country)}</Label>
          <CountryDropdown 
            value={country} 
            onChange={setCountry} 
          />
        </div>
        
        <div>
          <Label htmlFor="debug-currency">Currency Value: {JSON.stringify(currency)}</Label>
          <CurrencyDropdown 
            value={currency}
            onChange={setCurrency}
          />
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button 
          onClick={handleTestUndefined} 
          variant="outline" 
          disabled={testUndefined}
        >
          Set Undefined (Test Error)
        </Button>
        <Button 
          onClick={handleReset}
          disabled={!testUndefined}
        >
          Reset Values
        </Button>
      </div>
      
      {testUndefined && (
        <div className="mt-4 p-4 bg-yellow-100 text-yellow-800 rounded">
          Testing with undefined values. If you see this message and no errors, 
          the issue may be elsewhere in the application.
        </div>
      )}
    </div>
  );
}
