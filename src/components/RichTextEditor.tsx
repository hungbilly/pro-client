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
  }, [value, html]);

  useEffect(() => {
    if (alwaysShowToolbar) {
      setShowToolbar(true);
    }
  }, [alwaysShowToolbar]);

  const handleCommand = (command: string, value: string | null = null) => {
    if (editorRef.current) {
      console.log(`Executing command: ${command} with value: ${value}`);
      editorRef.current.focus();
      document.execCommand(command, false, value);
      const newContent = editorRef.current.innerHTML;
      console.log(`After command ${command}, new content:`, newContent);
      setHtml(newContent);
      onChange(newContent);
    }
  };

  const handleList = (listType: 'insertUnorderedList' | 'insertOrderedList') => {
    if (!editorRef.current) {
      console.log('Editor ref is null, cannot create list');
      return;
    }
    
    console.log(`Starting list operation: ${listType}`);
    
    // Store selection
    const selection = window.getSelection();
    if (!selection) {
      console.log('No selection available');
      return;
    }
    
    console.log('Selection before focus:', {
      rangeCount: selection.rangeCount,
      anchorNode: selection.anchorNode?.nodeName,
      focusNode: selection.focusNode?.nodeName,
      isCollapsed: selection.isCollapsed
    });
    
    // Focus the editor
    editorRef.current.focus();
    
    console.log('Editor content before list creation:', editorRef.current.innerHTML);
    console.log('Editor textContent:', editorRef.current.textContent);
    
    // We need to ensure there's content to make a list from
    const hasContent = editorRef.current.textContent?.trim().length > 0;
    const isSelectionInEditor = editorRef.current.contains(selection.anchorNode);
    
    console.log({
      hasContent,
      isSelectionInEditor,
      editorHtml: editorRef.current.innerHTML
    });
    
    // Clean up any problematic styling that might interfere with list display
    const cleanupStyling = () => {
      // If we have styled spans that might interfere with list display, clean them up
      const styledSpans = editorRef.current?.querySelectorAll('span[style*="background-color"]');
      styledSpans?.forEach(span => {
        // Remove background-color style but keep other formatting like bold/italic
        const style = span.getAttribute('style');
        if (style) {
          const newStyle = style.replace(/background-color:[^;]+;?/g, '');
          if (newStyle.trim()) {
            span.setAttribute('style', newStyle);
          } else {
            // If no style left, unwrap the span content
            const parent = span.parentNode;
            while (span.firstChild) {
              parent?.insertBefore(span.firstChild, span);
            }
            parent?.removeChild(span);
          }
        }
      });
    };
    
    if (!hasContent && !selection.rangeCount) {
      console.log('No content and no selection, inserting placeholder...');
      // If there's no content and no selection, insert a placeholder
      document.execCommand('insertHTML', false, '<li>New list item</li>');
    } else if (!isSelectionInEditor) {
      console.log('Selection outside editor, placing cursor in editor...');
      // If selection is outside editor, place cursor in editor
      const range = document.createRange();
      range.setStart(editorRef.current, 0);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    console.log('About to execute list command:', listType);
    
    // Apply the list format
    const success = document.execCommand(listType, false, null);
    console.log(`List command execution ${success ? 'succeeded' : 'failed'}`);
    
    // Clean up problematic styling after list creation
    cleanupStyling();
    
    // Update content state
    const newContent = editorRef.current.innerHTML;
    console.log('Content after list creation:', newContent);
    setHtml(newContent);
    onChange(newContent);
    
    // Check for list elements
    console.log('List elements in editor:', {
      ul: editorRef.current.querySelectorAll('ul').length,
      ol: editorRef.current.querySelectorAll('ol').length,
      li: editorRef.current.querySelectorAll('li').length
    });
    
    // Ensure editor retains focus
    editorRef.current.focus();
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const newContent = target.innerHTML;
    setHtml(newContent);
    onChange(newContent);
  };

  const handleFocus = () => {
    console.log('Editor focused');
    if (!alwaysShowToolbar) {
      setShowToolbar(true);
    }
    if (onFocus) {
      onFocus();
    }
  };

  const handleBlur = () => {
    console.log('Editor blurred');
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
            onMouseDown={(e) => {
              e.preventDefault(); // Prevent focus loss
              console.log('Bullet list button pressed');
            }}
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
            onMouseDown={(e) => {
              e.preventDefault(); // Prevent focus loss
              console.log('Numbered list button pressed');
            }}
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
          "min-h-[100px] p-2 focus:outline-none prose prose-sm max-w-none",
          "prose-ul:pl-5 prose-ol:pl-5 prose-ul:my-0 prose-ol:my-0", // Add proper list spacing
          "prose-li:my-1", // Ensure proper list item spacing
          "prose-li:marker:text-foreground", // Make list markers (bullets/numbers) visible
          "prose-ol:list-decimal prose-ul:list-disc", // Explicitly set list style types
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
