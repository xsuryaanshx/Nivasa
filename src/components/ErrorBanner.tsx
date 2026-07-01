import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBannerProps {
  error?: Error | null | unknown;
  onRetry?: () => void;
  message?: string;
}

export function ErrorBanner({ error, onRetry, message = "Failed to load data. Please try again." }: ErrorBannerProps) {
  // Try to extract a readable message if possible
  const errorMessage = error instanceof Error 
    ? error.message 
    : typeof error === 'string' 
      ? error 
      : null;

  return (
    <div className="w-full rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm my-4 dark:border-red-900/50 dark:bg-red-900/10">
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-red-100 p-2 text-red-600 dark:bg-red-900/30 dark:text-red-400">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
            {message}
          </h3>
          {errorMessage && (
            <p className="mt-1 text-sm text-red-700/80 dark:text-red-300/80 line-clamp-2">
              {errorMessage}
            </p>
          )}
          {onRetry && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="h-8 gap-1.5 border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-800 dark:bg-transparent dark:text-red-300 dark:hover:bg-red-900/30"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
