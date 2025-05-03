'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Play } from 'lucide-react';
import { openDatabase, addSimulation } from '@/lib/indexedDB';
import { Button } from '@/components/ui/button';

interface Simulation {
  id: string;
  alpha_expression: string;
  status: 'queued' | 'simulating' | 'completed' | 'failed';
  progress: number;
  result?: {
    sharpe_ratio: number;
    sortino_ratio: number;
    max_drawdown: number;
    annualized_return: number;
  };
  created_at: number;
  updated_at: number;
}

interface Field {
  id: string;
  description: string;
  type: string;
}

interface AlphaGeneratorProps {
  selectedFields: Field[];
  selectedOperators: string[];
  pdfFile: File | null;
}

export default function AlphaGenerator({ selectedFields, selectedOperators, pdfFile }: AlphaGeneratorProps) {
  const [alphaIdeas, setAlphaIdeas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  console.log(selectedFields);

  const generateAlpha = async () => {
    if (!pdfFile) {
      setError('Please upload a research paper first');
      return;
    }

    if (selectedFields.length === 0 || selectedOperators.length === 0) {
      setError('Please select at least one field and one operator');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('pdf', pdfFile);
      formData.append('fields', JSON.stringify(selectedFields));
      formData.append('operators', JSON.stringify(selectedOperators));
      
      const response = await fetch('/api/generate-alpha', {
        method: 'POST',
        body: formData,
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

  const handleQueueSimulation = async (alpha: string) => {
    try {
      const db = await openDatabase();
      const tx = db.transaction('simulations', 'readwrite');
      const store = tx.objectStore('simulations');
      
      const simulation: Simulation = {
        id: Date.now().toString(),
        alpha_expression: alpha,
        status: 'queued',
        progress: 0,
        created_at: Date.now(),
        updated_at: Date.now()
      };
      
      await store.add(simulation);
      toast.success('Alpha queued for simulation');
    } catch (error) {
      console.error('Error queueing simulation:', error);
      toast.error('Failed to queue simulation');
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
                  key={field.id}
                  className="px-3 py-1 bg-blue-900/30 text-blue-200 rounded-full text-sm"
                >
                  {field.id}
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
            disabled={isLoading || !pdfFile || selectedFields.length === 0 || selectedOperators.length === 0}
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
                <div 
                  key={index} 
                  className="backdrop-blur-sm bg-white/5 p-6 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
                >
                  <h3 className="text-xl font-semibold text-blue-200 mb-3">{idea.title}</h3>
                  <p className="text-blue-100/80 mb-4">{idea.description}</p>
                  
                  <div className="space-y-4">
                    <div className="backdrop-blur-sm bg-white/5 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-300 mb-2">Implementation</h4>
                      <p className="text-blue-100/80">{idea.implementation}</p>
                    </div>
                    
                    <div className="backdrop-blur-sm bg-white/5 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-300 mb-2">Rationale</h4>
                      <p className="text-blue-100/80">{idea.rationale}</p>
                    </div>
                    
                    <div className="backdrop-blur-sm bg-white/5 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-300 mb-2">Risks</h4>
                      <p className="text-blue-100/80">{idea.risks}</p>
                    </div>
                    
                    <div className="backdrop-blur-sm bg-white/5 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-300 mb-2">Alpha Expression</h4>
                      <pre className="bg-black/20 p-4 rounded-lg overflow-x-auto text-sm font-mono text-blue-100/90 border border-white/10">
                        {idea.alpha_expression.split(';').map((line: string, i: number, arr: string[]) => (
                          <span key={i}>
                            {line.trim()}
                            {i < arr.length - 1 ? ';\n' : ''}
                          </span>
                        ))}
                      </pre>
                    </div>
                    
                    <Button 
                      onClick={() => handleQueueSimulation(idea.alpha_expression)}
                      className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-500/30"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Queue for Simulation
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 