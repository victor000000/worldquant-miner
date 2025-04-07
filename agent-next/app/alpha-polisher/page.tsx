'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredJWT } from '../../lib/auth';
import { createChatCompletion } from '../../lib/deepseek';
import DataFieldSelector from '../../components/DataFieldSelector';
import OperatorSelector from '../../components/OperatorSelector';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Loader2, Check, X } from 'lucide-react';
import { FloatingDock } from '../../components/ui/floating-dock';
import { sharedNavItems } from '../../components/ui/shared-navigation';

// Constants for token limits
const MAX_TOKENS = 4000; // Approximate token limit for DeepSeek
const TOKENS_PER_CHAR = 0.25; // Approximate tokens per character

export default function AlphaPolisherPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [selectedOperators, setSelectedOperators] = useState<string[]>([]);
  const [expression, setExpression] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [generatedIdeas, setGeneratedIdeas] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('expression');
  const [isMounted, setIsMounted] = useState(false);
  const [allFields, setAllFields] = useState<string[]>([]);
  const [allOperators, setAllOperators] = useState<string[]>([]);
  const [isUsingRAG, setIsUsingRAG] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const checkAuth = async () => {
      const jwtToken = getStoredJWT();
      if (!jwtToken) {
        router.push('/login');
        return;
      }
      setIsAuthenticated(true);
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  // Fetch all available fields and operators on component mount
  useEffect(() => {
    const fetchAllFieldsAndOperators = async () => {
      try {
        // Get the JWT token
        const jwtToken = getStoredJWT();
        
        if (!jwtToken) {
          return;
        }
        
        // Fetch operators
        const operatorsResponse = await fetch('/api/operators', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jwtToken,
          }),
        });
        
        if (operatorsResponse.ok) {
          const operatorsData = await operatorsResponse.json();
          const operatorNames = operatorsData.map((op: any) => op.name);
          setAllOperators(operatorNames);
          // Select all operators by default
          setSelectedOperators(operatorNames);
        }
        
        // Fetch data fields - get all fields by using a large limit
        const fieldsResponse = await fetch('/api/data-fields', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jwtToken,
            dataset: 'fundamental6',
            limit: '100', // Fetch a larger number of fields
            instrumentType: 'EQUITY',
            region: 'USA',
            universe: 'TOP3000',
            delay: '1',
          }),
        });
        
        if (fieldsResponse.ok) {
          const fieldsData = await fieldsResponse.json();
          const fieldIds = fieldsData.results.map((field: any) => field.id);
          setAllFields(fieldIds);
          // Select all fields by default
          setSelectedFields(fieldIds);
        }
      } catch (error) {
        console.error('Error fetching fields and operators:', error);
      }
    };

    if (isAuthenticated) {
      fetchAllFieldsAndOperators();
    }
  }, [isAuthenticated]);

  const handleFieldsSelected = (fields: string[]) => {
    setSelectedFields(fields);
  };

  const handleOperatorsSelected = (operators: string[]) => {
    setSelectedOperators(operators);
  };

  // Handle select all fields
  const handleSelectAllFields = () => {
    setSelectedFields(allFields);
  };

  // Handle deselect all fields
  const handleDeselectAllFields = () => {
    setSelectedFields([]);
  };

  // Handle select all operators
  const handleSelectAllOperators = () => {
    setSelectedOperators(allOperators);
  };

  // Handle deselect all operators
  const handleDeselectAllOperators = () => {
    setSelectedOperators([]);
  };

  // Estimate token count for the prompt
  const estimateTokenCount = (text: string): number => {
    return Math.ceil(text.length * TOKENS_PER_CHAR);
  };

  // Implement RAG (Retrieval-Augmented Generation) for large inputs
  const implementRAG = async (prompt: string): Promise<string> => {
    // This is a simplified RAG implementation
    // In a real application, you would:
    // 1. Split the prompt into chunks
    // 2. Process each chunk separately
    // 3. Combine the results
    
    // For now, we'll just split the prompt into smaller parts
    const chunks = splitIntoChunks(prompt, MAX_TOKENS);
    const results: string[] = [];
    
    for (const chunk of chunks) {
      const response = await createChatCompletion([
        { role: 'system', content: 'You are an expert in quantitative finance and alpha generation for the WorldQuant platform.' },
        { role: 'user', content: chunk }
      ]);
      results.push(response);
    }
    
    // Combine the results
    return results.join('\n\n');
  };

  // Split text into chunks based on token limit
  const splitIntoChunks = (text: string, maxTokens: number): string[] => {
    const chunks: string[] = [];
    const maxChars = Math.floor(maxTokens / TOKENS_PER_CHAR);
    
    // Simple splitting by paragraphs
    const paragraphs = text.split('\n\n');
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      if (estimateTokenCount(currentChunk + paragraph) > maxTokens) {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = paragraph;
        } else {
          // If a single paragraph exceeds the limit, split it by sentences
          const sentences = paragraph.split('. ');
          currentChunk = '';
          
          for (const sentence of sentences) {
            if (estimateTokenCount(currentChunk + sentence) > maxTokens) {
              if (currentChunk) {
                chunks.push(currentChunk);
                currentChunk = sentence;
              } else {
                // If a single sentence exceeds the limit, just add it
                chunks.push(sentence);
                currentChunk = '';
              }
            } else {
              currentChunk += (currentChunk ? '. ' : '') + sentence;
            }
          }
        }
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  };

  const generateAlphaIdeas = async () => {
    if (!expression && !suggestions) {
      alert('Please provide an expression or suggestions');
      return;
    }

    setIsGenerating(true);
    setIsUsingRAG(false);
    
    try {
      const systemPrompt = `You are an expert in quantitative finance and alpha generation for the WorldQuant platform. 
Your task is to generate alpha ideas based on the provided information. 
Focus on creating alphas that are likely to be profitable, statistically significant, and economically sound.`;

      let userPrompt = '';
      
      if (activeTab === 'expression') {
        userPrompt = `I have an alpha expression: "${expression}"
        
Selected data fields: ${selectedFields.join(', ')}
Selected operators: ${selectedOperators.join(', ')}

Please analyze this expression and suggest 5 improvements or variations that might improve its performance. 
For each suggestion, explain the reasoning behind it and potential benefits.`;
      } else {
        userPrompt = `I want to create alpha ideas based on these suggestions: "${suggestions}"
        
Selected data fields: ${selectedFields.join(', ')}
Selected operators: ${selectedOperators.join(', ')}

Please generate 5 alpha expressions based on these suggestions, using the selected data fields and operators where appropriate. 
For each alpha, explain the reasoning behind it and potential benefits.`;
      }

      // Estimate token count
      const estimatedTokens = estimateTokenCount(systemPrompt + userPrompt);
      
      let response: string;
      
      if (estimatedTokens > MAX_TOKENS) {
        // Use RAG for large inputs
        setIsUsingRAG(true);
        response = await implementRAG(userPrompt);
      } else {
        // Use standard approach for smaller inputs
        response = await createChatCompletion([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]);
      }

      // Parse the response into individual alpha ideas
      const ideas = response.split('\n\n').filter(idea => idea.trim().length > 0);
      setGeneratedIdeas(ideas);
    } catch (error) {
      console.error('Error generating alpha ideas:', error);
      alert('Failed to generate alpha ideas. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Alpha Polisher</h1>
      <p className="text-muted-foreground mb-8">
        Use this tool to polish your alpha expressions or generate new ideas based on your suggestions.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Data Fields</CardTitle>
            <CardDescription>Select the data fields you want to use in your alpha</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSelectAllFields}
                className="flex items-center"
              >
                <Check className="h-4 w-4 mr-1" />
                Select All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDeselectAllFields}
                className="flex items-center"
              >
                <X className="h-4 w-4 mr-1" />
                Deselect All
              </Button>
            </div>
            <DataFieldSelector 
              onFieldsSelected={handleFieldsSelected} 
              selectedFields={selectedFields}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operators</CardTitle>
            <CardDescription>Select the operators you want to use in your alpha</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSelectAllOperators}
                className="flex items-center"
              >
                <Check className="h-4 w-4 mr-1" />
                Select All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDeselectAllOperators}
                className="flex items-center"
              >
                <X className="h-4 w-4 mr-1" />
                Deselect All
              </Button>
            </div>
            <OperatorSelector 
              onOperatorsSelected={handleOperatorsSelected} 
              selectedOperators={selectedOperators}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Alpha Input</CardTitle>
          <CardDescription>Enter your alpha expression or suggestions</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="expression">Expression</TabsTrigger>
              <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
            </TabsList>
            <TabsContent value="expression">
              <Textarea
                placeholder="Enter your alpha expression here..."
                className="min-h-[150px]"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
              />
            </TabsContent>
            <TabsContent value="suggestions">
              <Textarea
                placeholder="Enter your suggestions for alpha ideas..."
                className="min-h-[150px]"
                value={suggestions}
                onChange={(e) => setSuggestions(e.target.value)}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={generateAlphaIdeas} 
            disabled={isGenerating || (!expression && !suggestions)}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isUsingRAG ? 'Using RAG for large input...' : 'Generating...'}
              </>
            ) : (
              'Generate Alpha Ideas'
            )}
          </Button>
        </CardFooter>
      </Card>

      {generatedIdeas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Alpha Ideas</CardTitle>
            <CardDescription>Here are some ideas based on your input</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {generatedIdeas.map((idea, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="prose max-w-none">
                    {idea.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Floating Navigation Dock */}
      {isMounted && (
        <FloatingDock items={sharedNavItems} />
      )}
    </div>
  );
} 