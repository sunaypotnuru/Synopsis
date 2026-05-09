import { AlertCircle, XCircle } from 'lucide-react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  variant?: 'error' | 'warning';
  className?: string;
}

export function ErrorMessage({ 
  title, 
  message, 
  variant = 'error', 
  className = '' 
}: ErrorMessageProps) {
  const isError = variant === 'error';
  
  return (
    <div className={`rounded-lg p-4 ${
      isError ? 'bg-red-50 text-red-800 border border-red-100' : 'bg-amber-50 text-amber-800 border border-amber-100'
    } ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {isError ? (
            <XCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-400" aria-hidden="true" />
          )}
        </div>
        <div className="ml-3">
          {title && <h3 className="text-sm font-semibold">{title}</h3>}
          <div className={`text-sm ${title ? 'mt-1' : ''}`}>
            <p>{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
