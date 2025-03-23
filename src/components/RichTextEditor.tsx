
import React, { useState, useRef, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Check, Type } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  onFocus?: () => void;
  alwaysShowToolbar?: boolean;
  onDone?: () => void;
  showDoneButton?: boolean;
  id?: string;
  readOnly?: boolean;
}

const RichTextEditor = memo(({
  value,
  onChange,
  className,
  placeholder = 'Enter your text here...',
  onFocus,
  alwaysShowToolbar = false,
  onDone,
  showDoneButton = false,
  id,
  readOnly = false
}: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showToolbar, setShowToolbar] = useState(alwaysShowToolbar);
  const [internalContent, setInternalContent] = useState(value || '');
  const [isFirstRender, setIsFirstRender] = useState(true);
  const isUpdatingRef = useRef(false);
  const [fontSizePopoverOpen, setFontSizePopoverOpen] = useState(false);

  useEffect(() => {
    if (id === 'contract-terms-editor') {
      console.log('RichTextEditor contract terms value:', {
        valueLength: value?.length || 0,
        preview: value?.substring(0, 100) || 'empty',
        isEmpty: !value || value.length === 0
      });
    }
  }, [value, id]);

  useEffect(() => {
    if (editorRef.current) {
      const ulElements = editorRef.current.querySelectorAll('ul');
      const olElements = editorRef.current.querySelectorAll('ol');
      
      if (ulElements.length > 0 || olElements.length > 0) {
        console.log('List elements found:', { 
          ulCount: ulElements.length, 
          olCount: olElements.length 
        });
        
        if (ulElements.length > 0) {
          const ulStyle = window.getComputedStyle(ulElements[0]);
          console.log('UL computed style:', {
            listStyleType: ulStyle.listStyleType,
            paddingLeft: ulStyle.paddingLeft,
          });
        }
      }
    }
  }, [internalContent]);

  useEffect(() => {
    if (editorRef.current && isFirstRender) {
      editorRef.current.innerHTML = value || '';
      setInternalContent(value || '');
      setIsFirstRender(false);
    }
  }, [value, isFirstRender]);

  useEffect(() => {
    if (value !== internalContent && !isUpdatingRef.current) {
      setInternalContent(value || '');
      if (editorRef.current) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value, internalContent]);

  const saveCursorPosition = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return null;

    const range = selection.getRangeAt(0);
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(editorRef.current);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length;

    return {
      start,
      end: start + range.toString().length
    };
  };

  const restoreCursorPosition = (position: { start: number; end: number } | null) => {
    if (!position || !editorRef.current) return;

    const selection = window.getSelection();
    if (!selection) return;

    let charIndex = 0;
    const range = document.createRange();
    range.setStart(editorRef.current, 0);
    range.collapse(true);

    const nodeStack: Node[] = [editorRef.current];
    let foundStart = false;
    let foundEnd = false;

    while (nodeStack.length > 0 && !(foundStart && foundEnd)) {
      const node = nodeStack.pop()!;
      if (node.nodeType === Node.TEXT_NODE) {
        const textLength = node.textContent?.length || 0;
        if (!foundStart && charIndex + textLength >= position.start) {
          range.setStart(node, position.start - charIndex);
          foundStart = true;
        }
        if (!foundEnd && charIndex + textLength >= position.end) {
          range.setEnd(node, position.end - charIndex);
          foundEnd = true;
        }
        charIndex += textLength;
      } else {
        for (let i = node.childNodes.length - 1; i >= 0; i--) {
          nodeStack.push(node.childNodes[i]);
        }
      }
    }

    selection.removeAllRanges();
    selection.addRange(range);
  };

  const handleCommand = (command: string, value: string | null = null) => {
    if (readOnly) return;

    if (editorRef.current) {
      const cursorPosition = saveCursorPosition();
      editorRef.current.focus();
      document.execCommand(command, false, value);
      updateContent();
      restoreCursorPosition(cursorPosition);
    }
  };

  const handleList = (listType: 'insertUnorderedList' | 'insertOrderedList') => {
    if (readOnly) return;
    if (!editorRef.current) return;

    editorRef.current.focus();
    
    document.execCommand(listType, false, null);
    
    if (editorRef.current) {
      const lists = editorRef.current.querySelectorAll(listType === 'insertUnorderedList' ? 'ul' : 'ol');
      lists.forEach(list => {
        if (list instanceof HTMLElement) {
          list.style.listStylePosition = 'outside';
          list.style.paddingLeft = '1.5em';
          list.style.marginLeft = '0.5em';
          
          const items = list.querySelectorAll('li');
          items.forEach(item => {
            if (item instanceof HTMLElement) {
              item.style.display = 'list-item';
              if (listType === 'insertUnorderedList') {
                item.style.listStyleType = 'disc';
              } else {
                item.style.listStyleType = 'decimal';
              }
            }
          });
        }
      });
    }
    
    updateContent();
    
    setTimeout(() => {
      if (editorRef.current) {
        const lists = editorRef.current.querySelectorAll(listType === 'insertUnorderedList' ? 'ul' : 'ol');
        console.log(`${listType} result:`, {
          listsFound: lists.length,
          html: editorRef.current.innerHTML.substring(0, 200)
        });
      }
    }, 10);
  };

  const handleFontSize = (fontSize: string) => {
    if (readOnly) return;
    if (!editorRef.current) return;

    console.log(`Applying font size: ${fontSize}px`);
    
    // Close the popover
    setFontSizePopoverOpen(false);
    
    // Focus the editor before applying the font size
    editorRef.current.focus();
    
    // Get the current selection
    const selection = window.getSelection();
    const hasSelection = selection && selection.rangeCount > 0 && !selection.getRangeAt(0).collapsed;
    
    if (hasSelection && selection) {
      // Apply font size to the selected text
      document.execCommand('fontSize', false, '7');
      
      // Find all font elements with size 7 (the ones we just created)
      const fontElements = document.querySelectorAll('font[size="7"]');
      fontElements.forEach(element => {
        if (element instanceof HTMLElement) {
          element.removeAttribute('size');
          element.style.fontSize = `${fontSize}px`;
        }
      });
    } else {
      // If no text is selected, create a span with the desired font size at cursor position
      const span = document.createElement('span');
      span.style.fontSize = `${fontSize}px`;
      
      // Insert a zero-width space to make the span visible and selectable
      span.innerHTML = '&#8203;'; // Zero-width space
      
      document.execCommand('insertHTML', false, span.outerHTML);
    }
    
    // Update the content
    setTimeout(() => {
      updateContent();
      console.log(`Applied font size ${fontSize}px successfully`);
    }, 10);
  };

  const updateContent = () => {
    if (!editorRef.current) return;

    const newContent = editorRef.current.innerHTML;
    if (newContent !== internalContent) {
      isUpdatingRef.current = true;
      setInternalContent(newContent);
      onChange(newContent);
      isUpdatingRef.current = false;
    }
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (readOnly) return;

    const cursorPosition = saveCursorPosition();
    updateContent();
    restoreCursorPosition(cursorPosition);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (readOnly) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      document.execCommand('insertParagraph');

      if (editorRef.current) {
        const selection = window.getSelection();
        if (selection) {
          const paragraphs = editorRef.current.querySelectorAll('p');
          const lastParagraph = paragraphs[paragraphs.length - 1] || editorRef.current.lastChild;

          if (lastParagraph) {
            const range = document.createRange();
            
            if (lastParagraph.nodeType === Node.ELEMENT_NODE) {
              range.setStart(lastParagraph, 0);
              range.collapse(true);
            } else {
              range.selectNodeContents(editorRef.current);
              range.collapse(false);
            }

            selection.removeAllRanges();
            selection.addRange(range);

            if (lastParagraph instanceof HTMLElement) {
              lastParagraph.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }
        }
      }

      setTimeout(() => {
        updateContent();
      }, 0);
    }
  };

  const handleFocus = () => {
    if (readOnly) return;

    setShowToolbar(true);
    if (onFocus) {
      onFocus();
    }
  };

  const handleBlur = () => {
    if (readOnly) return;

    if (!alwaysShowToolbar) {
      setTimeout(() => {
        setShowToolbar(false);
      }, 200);
    }
  };

  const handleDone = () => {
    if (onDone) {
      onDone();
    }
    setShowToolbar(false);
  };

  return (
    <div className={cn("rounded-md border rich-text-editor", className)}>
      {showToolbar && !readOnly && (
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

            <Popover open={fontSizePopoverOpen} onOpenChange={setFontSizePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 p-0 px-2 flex items-center gap-1"
                  title="Font Size"
                >
                  <Type className="h-4 w-4" />
                  <span className="text-xs">Size</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[999]" align="start">
                <div className="flex flex-col">
                  <button
                    type="button" 
                    className="px-4 py-2 text-left text-xl hover:bg-accent hover:text-accent-foreground cursor-pointer"
                    onClick={() => handleFontSize('24')}
                    style={{ cursor: 'pointer' }}
                  >
                    24px
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-left text-lg hover:bg-accent hover:text-accent-foreground cursor-pointer"
                    onClick={() => handleFontSize('20')}
                    style={{ cursor: 'pointer' }}
                  >
                    20px
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-left hover:bg-accent hover:text-accent-foreground cursor-pointer"
                    onClick={() => handleFontSize('16')}
                    style={{ cursor: 'pointer' }}
                  >
                    16px
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                    onClick={() => handleFontSize('14')}
                    style={{ cursor: 'pointer' }}
                  >
                    14px
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-left text-xs hover:bg-accent hover:text-accent-foreground cursor-pointer"
                    onClick={() => handleFontSize('12')}
                    style={{ cursor: 'pointer' }}
                  >
                    12px
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleList('insertUnorderedList')}
              className="h-8 w-8 p-0"
              title="Bullet List"
              onMouseDown={(e) => {
                e.preventDefault();
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
                e.preventDefault();
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
        id={id}
        className={cn(
          "min-h-[100px] p-2 focus:outline-none prose prose-sm max-w-none",
          "prose-ul:pl-5 prose-ol:pl-5 prose-ul:my-0 prose-ol:my-0",
          "prose-li:my-1",
          "prose-li:marker:text-foreground",
          "prose-ol:list-decimal prose-ul:list-disc",
          "prose-p:my-1",
          "prose-ul:list-outside prose-ol:list-outside",
          readOnly ? "bg-muted/20 cursor-default" : "",
          className
        )}
        contentEditable={!readOnly}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        data-placeholder={placeholder}
        dir="ltr"
        style={{
          textAlign: 'left',
          direction: 'ltr',
          unicodeBidi: 'isolate',
          writingMode: 'horizontal-tb',
          '--tw-prose-bullets': 'currentColor',
          '--tw-prose-counters': 'currentColor',
          position: 'relative', 
          zIndex: 10
        } as React.CSSProperties}
        suppressContentEditableWarning={true}
      />

      <style>
        {`.rich-text-editor button {
          cursor: pointer !important;
        }`}
      </style>
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
