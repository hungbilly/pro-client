import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Check } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  onFocus?: () => void;
  alwaysShowToolbar?: boolean;
  onDone?: () => void;
  showDoneButton?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  className,
  placeholder = 'Enter your text here...',
  onFocus,
  alwaysShowToolbar = false,
  onDone,
  showDoneButton = false,
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
    console.log('RichTextEditor value changed:', value);
    console.log('RichTextEditor html state:', html);
    if (editorRef.current && value !== html) {
      console.log('Updating editorRef.current.innerHTML with value');
      editorRef.current.innerHTML = value;
      setHtml(value);
    }
  }, [value, html]);

  useEffect(() => {
    console.log('alwaysShowToolbar changed:', alwaysShowToolbar);
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
      if (!editorRef.current) return;
      
      // Process all list items to ensure they have proper styles
      const listItems = editorRef.current.querySelectorAll('li');
      listItems.forEach(li => {
        // Remove text-align from list items as it can interfere with markers
        li.style.textAlign = '';
        
        // Handle span elements with background color inside list items
        const spans = li.querySelectorAll('span[style*="background-color"]');
        spans.forEach(span => {
          const style = span.getAttribute('style');
          if (style) {
            // Remove background-color style but preserve other styles
            const newStyle = style.replace(/background-color:[^;]+;?/g, '');
            if (newStyle.trim()) {
              span.setAttribute('style', newStyle);
            } else {
              // If no style left, unwrap the span content
              const parent = span.parentNode;
              if (parent) {
                while (span.firstChild) {
                  parent.insertBefore(span.firstChild, span);
                }
                parent.removeChild(span);
              }
            }
          }
        });
        
        // Ensure list items have proper text color for visibility
        if (!li.style.color) {
          li.style.color = 'currentColor';
        }
      });
      
      // Ensure list containers have proper styling
      const lists = editorRef.current.querySelectorAll('ol, ul');
      lists.forEach(list => {
        // Explicitly set the list style type
        if (list.tagName === 'OL') {
          (list as HTMLElement).style.listStyleType = 'decimal';
        } else if (list.tagName === 'UL') {
          (list as HTMLElement).style.listStyleType = 'disc';
        }
        
        // Ensure proper padding for marker visibility
        (list as HTMLElement).style.paddingLeft = '1.5em';
        (list as HTMLElement).style.margin = '0.5em 0';
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
    console.log('Editor input detected, new content:', newContent);
    setHtml(newContent);
    onChange(newContent);
  };

  const handleFocus = () => {
    console.log('Editor focused, alwaysShowToolbar:', alwaysShowToolbar);
    setShowToolbar(true);
    if (onFocus) {
      onFocus();
    }
  };

  const handleBlur = () => {
    console.log('Editor blurred, alwaysShowToolbar:', alwaysShowToolbar);
    if (!alwaysShowToolbar) {
      setTimeout(() => {
        setShowToolbar(false);
      }, 200);
    }
  };

  const handleDone = () => {
    console.log('Done button clicked');
    if (onDone) {
      onDone();
    }
    setShowToolbar(false);
  };

  console.log('RichTextEditor rendering with:', {
    showToolbar,
    alwaysShowToolbar,
    showDoneButton,
    hasValue: !!value,
    valueLength: value?.length || 0
  });

  return (
    <div className={cn("rounded-md border", className)}>
      {showToolbar && (
        <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30 justify-between">
          <div className="flex flex-wrap gap-1">
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
          
          {showDoneButton && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDone}
              className="ml-auto"
              title="Done"
            >
              <Check className="h-4 w-4 mr-1" />
              Done
            </Button>
          )}
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
        style={{ 
          textAlign: 'left',
          // Add explicit CSS for list styling
          '--tw-prose-bullets': 'currentColor',
          '--tw-prose-counters': 'currentColor',
        } as React.CSSProperties}
      />
      
      <style>
        {`
        /* Additional list styling for editor content */
        #editor ol {
          list-style-type: decimal !important;
          list-style-position: outside !important;
          padding-left: 1.5em !important;
        }
        
        #editor ul {
          list-style-type: disc !important;
          list-style-position: outside !important;
          padding-left: 1.5em !important;
        }
        
        #editor li {
          display: list-item !important;
          margin: 0.25em 0 !important;
        }
        
        #editor li::marker {
          color: currentColor !important;
        }
        `}
      </style>
    </div>
  );
};

export default RichTextEditor;
