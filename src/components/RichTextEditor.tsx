
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  onFocus?: () => void;
  alwaysShowToolbar?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  className,
  placeholder = 'Enter your text here...',
  onFocus,
  alwaysShowToolbar = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(value);
  const [showToolbar, setShowToolbar] = useState(alwaysShowToolbar);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = value;
    }
  }, []);

  useEffect(() => {
    if (editorRef.current && value !== html) {
      editorRef.current.innerHTML = value;
      setHtml(value);
    }
  }, [value]);

  useEffect(() => {
    if (alwaysShowToolbar) {
      setShowToolbar(true);
    }
  }, [alwaysShowToolbar]);

  // Generic command handler for most formatting options
  const handleCommand = (command: string, value: string | null = null) => {
    // First, ensure the editor has focus
    if (editorRef.current) {
      // Store current selection
      const selection = window.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      
      // Focus the editor
      editorRef.current.focus();
      
      // Execute the command
      document.execCommand(command, false, value);
      
      // Restore selection if needed
      if (range && selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      // Update state with new content
      const newContent = editorRef.current.innerHTML;
      setHtml(newContent);
      onChange(newContent);
    }
  };

  // Specialized handler for list operations that ensures proper selection handling
  const handleList = (listType: 'insertUnorderedList' | 'insertOrderedList') => {
    if (editorRef.current) {
      try {
        // Store current selection
        const selection = window.getSelection();
        if (!selection) return;
        
        const hasRange = selection.rangeCount > 0;
        const range = hasRange ? selection.getRangeAt(0) : null;
        
        // Focus the editor element explicitly
        editorRef.current.focus();
        
        // If there's no selection or it's collapsed (cursor), create some content
        if (!hasRange || range?.collapsed) {
          // Create a new list item only if we don't have a selection
          const listItem = document.createElement('li');
          listItem.textContent = '\u200B'; // Zero-width space to ensure item exists
          
          // Insert at cursor position
          document.execCommand('insertHTML', false, listItem.outerHTML);
        }
        
        // Now execute the list command
        document.execCommand(listType, false, null);
        
        // Restore selection if we had one
        if (range && selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
        
        // Update state with new content
        const newContent = editorRef.current.innerHTML;
        setHtml(newContent);
        onChange(newContent);
      } catch (error) {
        console.error('Error applying list formatting:', error);
      }
    }
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const newContent = target.innerHTML;
    setHtml(newContent);
    onChange(newContent);
  };

  const handleFocus = () => {
    if (!alwaysShowToolbar) {
      setShowToolbar(true);
    }
    if (onFocus) {
      onFocus();
    }
  };

  const handleBlur = () => {
    if (!alwaysShowToolbar) {
      setTimeout(() => {
        setShowToolbar(false);
      }, 200);
    }
  };

  return (
    <div className={cn("rounded-md border", className)}>
      {showToolbar && (
        <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleCommand('bold')}
            className="h-8 w-8 p-0"
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleCommand('italic')}
            className="h-8 w-8 p-0"
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleCommand('underline')}
            className="h-8 w-8 p-0"
            title="Underline"
          >
            <Underline className="h-4 w-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleList('insertUnorderedList')}
            className="h-8 w-8 p-0"
            title="Bullet List"
            onMouseDown={(e) => e.preventDefault()} // Prevent losing focus
          >
            <List className="h-4 w-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleList('insertOrderedList')}
            className="h-8 w-8 p-0"
            title="Numbered List"
            onMouseDown={(e) => e.preventDefault()} // Prevent losing focus
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          
          <span className="border-r mx-1 h-8"></span>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleCommand('justifyLeft')}
            className="h-8 w-8 p-0"
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleCommand('justifyCenter')}
            className="h-8 w-8 p-0"
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleCommand('justifyRight')}
            className="h-8 w-8 p-0"
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      <div
        ref={editorRef}
        id="editor"
        className={cn(
          "min-h-[100px] p-2 focus:outline-none",
          className
        )}
        contentEditable={true}
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}  
        data-placeholder={placeholder}
        dir="ltr"
        style={{ textAlign: 'left' }}
      />
    </div>
  );
};

export default RichTextEditor;
