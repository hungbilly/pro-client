
import React, { useState } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  List, 
  ListOrdered, 
  Link,
  Type
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  className,
  placeholder = 'Enter your content here...'
}) => {
  const [html, setHtml] = useState(value);
  
  const handleChange = (e: React.ChangeEvent<HTMLDivElement>) => {
    const newValue = e.currentTarget.innerHTML;
    setHtml(newValue);
    onChange(newValue);
  };

  const handleCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    const editor = document.getElementById('rich-text-editor');
    if (editor) {
      const newValue = editor.innerHTML;
      setHtml(newValue);
      onChange(newValue);
    }
  };

  const fontOptions = [
    { label: 'Sans Serif', value: 'Arial, sans-serif' },
    { label: 'Serif', value: 'Georgia, serif' },
    { label: 'Monospace', value: 'monospace' },
  ];

  const sizeOptions = [
    { label: 'Small', value: '1' },
    { label: 'Normal', value: '3' },
    { label: 'Large', value: '5' },
    { label: 'Huge', value: '7' },
  ];

  return (
    <div className={cn("border rounded-md", className)}>
      <div className="flex flex-wrap p-2 gap-1 border-b bg-muted/50">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 rounded-md"
          onClick={() => handleCommand('bold')}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 rounded-md"
          onClick={() => handleCommand('italic')}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 rounded-md"
          onClick={() => handleCommand('underline')}
        >
          <Underline className="h-4 w-4" />
        </Button>
        
        <Separator orientation="vertical" className="mx-1 h-8" />
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 rounded-md"
          onClick={() => handleCommand('insertUnorderedList')}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 rounded-md"
          onClick={() => handleCommand('insertOrderedList')}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        
        <Separator orientation="vertical" className="mx-1 h-8" />
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 rounded-md"
          onClick={() => handleCommand('justifyLeft')}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 rounded-md"
          onClick={() => handleCommand('justifyCenter')}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 rounded-md"
          onClick={() => handleCommand('justifyRight')}
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        
        <Separator orientation="vertical" className="mx-1 h-8" />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1">
              <Type className="h-4 w-4" />
              <span>Font</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {fontOptions.map((font) => (
              <DropdownMenuItem 
                key={font.label}
                onClick={() => handleCommand('fontName', font.value)}
              >
                <span style={{ fontFamily: font.value }}>{font.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1">
              <Type className="h-4 w-4" />
              <span>Size</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {sizeOptions.map((size) => (
              <DropdownMenuItem 
                key={size.label}
                onClick={() => handleCommand('fontSize', size.value)}
              >
                {size.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 rounded-md"
          onClick={() => {
            const url = prompt('Enter URL:');
            if (url) handleCommand('createLink', url);
          }}
        >
          <Link className="h-4 w-4" />
        </Button>
      </div>
      
      <div
        id="rich-text-editor"
        className="p-3 min-h-[200px] focus:outline-none"
        contentEditable
        dangerouslySetInnerHTML={{ __html: html }}
        onInput={handleChange}
        placeholder={placeholder}
      />
    </div>
  );
};

export default RichTextEditor;
