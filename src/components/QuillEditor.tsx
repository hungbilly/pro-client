
import React, { useEffect, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { cn } from '@/lib/utils';

interface QuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  id?: string;
  readOnly?: boolean;
  alwaysShowToolbar?: boolean;
}

const QuillEditor: React.FC<QuillEditorProps> = ({
  value,
  onChange,
  className,
  placeholder = 'Enter your text here...',
  id,
  readOnly = false,
  alwaysShowToolbar = true
}) => {
  // Keep track of internal value to handle controlled component behavior
  const [internalValue, setInternalValue] = useState(value || '');

  useEffect(() => {
    if (value !== internalValue) {
      setInternalValue(value || '');
    }
  }, [value]);

  const handleChange = (content: string) => {
    setInternalValue(content);
    onChange(content);
  };

  const modules = {
    toolbar: alwaysShowToolbar ? [
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'align': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['clean']
    ] : [],
  };

  const formats = [
    'bold', 'italic', 'underline',
    'list', 'bullet',
    'align', 'size'
  ];

  return (
    <div className={cn("quill-editor-container", readOnly ? "bg-muted/20" : "")}>
      <ReactQuill
        id={id}
        theme="snow"
        value={internalValue}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly}
        className={cn(className)}
      />
      <style dangerouslySetInnerHTML={{ __html: `
        .quill-editor-container .ql-container {
          min-height: 120px;
          font-size: 1rem;
          border-bottom-left-radius: 0.375rem;
          border-bottom-right-radius: 0.375rem;
        }
        
        .quill-editor-container .ql-toolbar {
          border-top-left-radius: 0.375rem;
          border-top-right-radius: 0.375rem;
        }
        
        .quill-editor-container .ql-editor {
          min-height: 120px;
        }
        
        .quill-editor-container.readOnly .ql-toolbar {
          display: none;
        }
      `}} />
    </div>
  );
};

export default QuillEditor;
