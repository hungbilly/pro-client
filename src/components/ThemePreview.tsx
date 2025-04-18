
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

interface ThemePreviewProps {
  colors: ThemeColors;
  themeName: string;
}

const ThemePreview: React.FC<ThemePreviewProps> = ({ colors, themeName }) => {
  // Apply the theme colors to the preview
  const applyThemeToPreview = () => {
    const previewRoot = document.getElementById('theme-preview-container');
    if (!previewRoot) return;
    
    // Apply CSS custom properties using HSL values
    previewRoot.style.setProperty('--preview-background', colors.background);
    previewRoot.style.setProperty('--preview-module-background', colors.moduleBackground);
    previewRoot.style.setProperty('--preview-title-bar-background', colors.titleBarBackground);
    previewRoot.style.setProperty('--preview-text', colors.text);
    previewRoot.style.setProperty('--preview-muted-text', colors.mutedText);
    previewRoot.style.setProperty('--preview-accent', colors.accent);
    previewRoot.style.setProperty('--preview-border', colors.border);
    previewRoot.style.setProperty('--preview-button-primary', colors.buttonPrimary);
    previewRoot.style.setProperty('--preview-button-primary-foreground', colors.buttonPrimaryForeground);
    previewRoot.style.setProperty('--preview-hover', colors.hover);
  };

  // Apply theme on mount and when colors change
  React.useEffect(() => {
    applyThemeToPreview();
  }, [colors]);

  return (
    <div 
      id="theme-preview-container" 
      className="rounded-lg overflow-hidden shadow"
      style={{
        '--preview-background': colors.background,
        '--preview-module-background': colors.moduleBackground,
        '--preview-title-bar-background': colors.titleBarBackground,
        '--preview-text': colors.text,
        '--preview-muted-text': colors.mutedText,
        '--preview-accent': colors.accent,
        '--preview-border': colors.border,
        '--preview-button-primary': colors.buttonPrimary,
        '--preview-button-primary-foreground': colors.buttonPrimaryForeground,
        '--preview-hover': colors.hover,
      } as React.CSSProperties}
    >
      <style>
        {`
          #theme-preview-container {
            background-color: hsl(var(--preview-background));
            color: hsl(var(--preview-text));
          }
          #theme-preview-container .preview-card {
            background-color: hsl(var(--preview-module-background));
            border-color: hsl(var(--preview-border));
          }
          #theme-preview-container .preview-header {
            background-color: hsl(var(--preview-title-bar-background));
          }
          #theme-preview-container .preview-muted {
            color: hsl(var(--preview-muted-text));
          }
          #theme-preview-container .preview-btn-primary {
            background-color: hsl(var(--preview-button-primary));
            color: hsl(var(--preview-button-primary-foreground));
          }
          #theme-preview-container .preview-btn-primary:hover {
            background-color: hsl(var(--preview-hover));
          }
          #theme-preview-container .preview-input {
            border-color: hsl(var(--preview-border));
          }
          #theme-preview-container .preview-accent {
            color: hsl(var(--preview-accent));
          }
          #theme-preview-container .preview-border {
            border-color: hsl(var(--preview-border));
          }
          #theme-preview-container .preview-link:hover {
            color: hsl(var(--preview-accent));
          }
        `}
      </style>
      
      <div className="preview-header px-4 py-3 flex justify-between items-center">
        <div className="font-bold">{themeName || 'Theme Preview'}</div>
        <div className="flex space-x-2">
          <div className="preview-btn-primary px-2 py-1 rounded text-sm cursor-pointer">
            Action
          </div>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        <div className="preview-card rounded-lg border p-4 shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Form Elements</h3>
          <div className="space-y-3">
            <div>
              <Label className="block mb-1">Input Field</Label>
              <Input className="preview-input w-full" placeholder="Input example" />
            </div>
            
            <div>
              <Label className="block mb-1">Dropdown</Label>
              <Select>
                <SelectTrigger className="preview-input w-full">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="option1">Option 1</SelectItem>
                  <SelectItem value="option2">Option 2</SelectItem>
                  <SelectItem value="option3">Option 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox id="preview-checkbox" />
              <Label htmlFor="preview-checkbox">Remember me</Label>
            </div>
          </div>
        </div>
        
        <div className="preview-card rounded-lg border p-4 shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Content Preview</h3>
          <p className="mb-2">This is how regular text appears in this theme.</p>
          <p className="preview-muted mb-2">This text is muted and less prominent.</p>
          <p className="mb-2">
            <a className="preview-accent cursor-pointer">This is a link</a>
            {' '}that follows the accent color.
          </p>
          
          <div className="flex flex-wrap gap-2 mt-3">
            <button className="preview-btn-primary px-3 py-1 rounded">
              Primary Button
            </button>
            <button className="border preview-border px-3 py-1 rounded">
              Secondary Button
            </button>
          </div>
        </div>
        
        <div className="preview-card rounded-lg border p-0 overflow-hidden shadow-sm">
          <Tabs defaultValue="tab1">
            <TabsList className="w-full border-b preview-border">
              <TabsTrigger value="tab1" className="flex-1">Tab 1</TabsTrigger>
              <TabsTrigger value="tab2" className="flex-1">Tab 2</TabsTrigger>
              <TabsTrigger value="tab3" className="flex-1">Tab 3</TabsTrigger>
            </TabsList>
            <div className="p-4">
              <TabsContent value="tab1">
                <h4>Tab Content 1</h4>
                <p className="preview-muted">This is the content for tab 1.</p>
              </TabsContent>
              <TabsContent value="tab2">
                <h4>Tab Content 2</h4>
                <p className="preview-muted">This is the content for tab 2.</p>
              </TabsContent>
              <TabsContent value="tab3">
                <h4>Tab Content 3</h4>
                <p className="preview-muted">This is the content for tab 3.</p>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ThemePreview;
