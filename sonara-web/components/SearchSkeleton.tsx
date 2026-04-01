import React from 'react';

export function SearchSkeleton() {
  return (
    <div className="space-y-1 border-t border-white/10 pt-4 animate-pulse">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="flex items-center gap-4 py-2 px-4">
          <div className="w-12 h-12 rounded-md bg-white/10 shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-white/10 rounded-lg w-3/4"></div>
            <div className="h-4 bg-white/10 rounded-lg w-1/2"></div>
          </div>
          <div className="w-5 h-5 bg-white/10 rounded-full shrink-0"></div>
        </div>
      ))}
    </div>
  );
}
