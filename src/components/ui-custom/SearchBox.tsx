
import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchBoxProps {
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

const SearchBox = ({ 
  placeholder = "Search...", 
  value, 
  onChange, 
  className = "" 
}: SearchBoxProps) => {
  return (
    <div className={`relative ${className}`}>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="pr-10"
      />
      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
    </div>
  );
};

export default SearchBox;
