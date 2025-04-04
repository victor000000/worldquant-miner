'use client';

import { useState } from 'react';
import { getStoredJWT } from '../lib/auth';

interface AlphaGeneratorProps {
  selectedFields: string[];
  selectedOperators: string[];
}

export default function AlphaGenerator({ selectedFields, selectedOperators }: AlphaGeneratorProps) {
  const [alphaIdeas, setAlphaIdeas] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAlpha = async () => {
    if (selectedFields.length === 0 || selectedOperators.length === 0) {
      setError('Please select at least one field and one operator');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Get the JWT token
      const jwtToken = getStoredJWT();
      
      if (!jwtToken) {
        setError('Authentication required. Please log in again.');
        setIsLoading(false);
        return;
      }
      
      const response = await fetch('/api/generate-alpha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jwtToken,
          fields: selectedFields,
          operators: selectedOperators,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate alpha ideas');
      }
      
      const data = await response.json();
      setAlphaIdeas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate alpha ideas');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="backdrop-blur-md bg-white/10 p-6 rounded-xl border border-white/20">
      <h2 className="text-xl font-semibold mb-4">Generate Alpha Ideas</h2>
      
      <div className="space-y-6">
        <div className="flex flex-col space-y-4">
          <div>
            <h3 className="text-sm font-medium text-blue-200 mb-2">Selected Fields</h3>
            <div className="flex flex-wrap gap-2">
              {selectedFields.map((field) => (
                <span
                  key={field}
                  className="px-3 py-1 bg-blue-900/30 text-blue-200 rounded-full text-sm"
                >
                  {field}
                </span>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-blue-200 mb-2">Selected Operators</h3>
            <div className="flex flex-wrap gap-2">
              {selectedOperators.map((operator) => (
                <span
                  key={operator}
                  className="px-3 py-1 bg-blue-900/30 text-blue-200 rounded-full text-sm"
                >
                  {operator}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <button
            onClick={generateAlpha}
            disabled={isLoading || selectedFields.length === 0 || selectedOperators.length === 0}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </span>
            ) : (
              'Generate Alpha Ideas'
            )}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-900/50 text-red-200 rounded">
            {error}
          </div>
        )}

        {alphaIdeas.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Generated Alpha Ideas</h3>
            <div className="space-y-3">
              {alphaIdeas.map((idea, index) => (
                <div key={index} className="p-4 bg-white/5 rounded-lg">
                  <p className="text-blue-200">{idea}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 