
import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

interface ThemeColors {
  background: string;
  moduleBackground: string;
  titleBarBackground: string;
  text: string;
  mutedText: string;
  accent: string;
  border: string;
  buttonPrimary: string;
  buttonPrimaryForeground: string;
  hover: string;
}

interface ThemeColorPickerProps {
  colors: ThemeColors;
  onChange: (colorKey: keyof ThemeColors, value: string) => void;
}

const ThemeColorPicker: React.FC<ThemeColorPickerProps> = ({ colors, onChange }) => {
  // Helper to convert HSL string to hex for color input
  const hslToHex = (hslStr: string): string => {
    const hslParts = hslStr.split(' ');
    if (hslParts.length < 3) return '#ffffff';
    
    const h = parseInt(hslParts[0]) / 360;
    const s = parseInt(hslParts[1]) / 100;
    const l = parseInt(hslParts[2]) / 100;
    
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l; // Achromatic
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Helper to convert hex to HSL string
  const hexToHsl = (hex: string): string => {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse hex values
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      
      h /= 6;
    }
    
    // Convert to HSL format used in the app
    const hDegrees = Math.round(h * 360);
    const sPercent = Math.round(s * 100);
    const lPercent = Math.round(l * 100);
    
    return `${hDegrees} ${sPercent}% ${lPercent}%`;
  };

  // Handle color input change
  const handleColorInputChange = (colorKey: keyof ThemeColors, hexValue: string) => {
    const hslValue = hexToHsl(hexValue);
    onChange(colorKey, hslValue);
  };

  const colorInputs = [
    { key: 'background', label: 'Background' },
    { key: 'moduleBackground', label: 'Module Background' },
    { key: 'titleBarBackground', label: 'Title Bar Background' },
    { key: 'text', label: 'Text' },
    { key: 'mutedText', label: 'Muted Text' },
    { key: 'accent', label: 'Accent' },
    { key: 'border', label: 'Border' },
    { key: 'buttonPrimary', label: 'Button Primary' },
    { key: 'buttonPrimaryForeground', label: 'Button Text' },
    { key: 'hover', label: 'Hover' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {colorInputs.map(({ key, label }) => (
          <div key={key} className="flex items-center space-x-3">
            <div 
              className="w-8 h-8 rounded border shadow-sm flex-shrink-0"
              style={{ backgroundColor: `hsl(${colors[key as keyof ThemeColors]})` }}
            />
            <div className="flex-grow">
              <Label htmlFor={`color-${key}`}>{label}</Label>
              <div className="flex space-x-2 items-center mt-1">
                <Input
                  id={`color-${key}`}
                  type="color"
                  className="w-12 h-8 p-0 cursor-pointer"
                  value={hslToHex(colors[key as keyof ThemeColors])}
                  onChange={(e) => handleColorInputChange(key as keyof ThemeColors, e.target.value)}
                />
                <Input 
                  value={colors[key as keyof ThemeColors]} 
                  onChange={(e) => onChange(key as keyof ThemeColors, e.target.value)}
                  placeholder="H S% L%"
                  className="flex-grow"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <Separator />
      
      <div>
        <p className="text-sm text-muted-foreground mb-2">
          Colors are specified in HSL format (Hue Saturation Lightness). You can either use the color picker or directly edit the HSL values.
        </p>
        <p className="text-sm text-muted-foreground">
          Format: <code>H S% L%</code> (e.g., <code>210 50% 40%</code>)
        </p>
      </div>
    </div>
  );
};

export default ThemeColorPicker;
