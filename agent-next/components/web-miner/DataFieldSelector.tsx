'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { IconSearch, IconFilter, IconCheck, IconX, IconDatabase, IconChartBar, IconCode, IconWorld, IconBrain } from '@tabler/icons-react';

interface DataField {
  id: string;
  name: string;
  description: string;
  category: string;
  dataset: string;
}

interface Operator {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface DataFieldSelectorProps {
  onFieldsSelected: (selectedFields: string[]) => void;
  onOperatorsLoaded: (operators: Operator[]) => void;
}

export function DataFieldSelector({ onFieldsSelected, onOperatorsLoaded }: DataFieldSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOperators, setIsLoadingOperators] = useState(true);
  const [dataFields, setDataFields] = useState<DataField[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [datasets, setDatasets] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [operatorError, setOperatorError] = useState<string | null>(null);

  // Fetch data fields from WorldQuant API
  useEffect(() => {
    const fetchDataFields = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Create EventSource for server-sent events
        const eventSource = new EventSource('/api/worldquant/stream?endpoint=data-fields&limit=100');
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Handle different message types
            if (data.error) {
              setError(data.error);
              eventSource.close();
              setIsLoading(false);
              return;
            }
            
            if (data.status === 'connected') {
              console.log('Connected to WorldQuant API');
            }
            
            // Process the actual data fields
            if (data.results && Array.isArray(data.results)) {
              const fields = data.results.map((field: any) => ({
                id: field.id,
                name: field.name || field.id,
                description: field.description || `Field from ${field.dataset || 'unknown dataset'}`,
                category: field.category || 'Uncategorized',
                dataset: field.dataset || 'unknown'
              }));
              
              setDataFields(fields);
              
              // Extract unique categories and datasets
              const uniqueCategories = Array.from(new Set(fields.map((field: DataField) => field.category))) as string[];
              const uniqueDatasets = Array.from(new Set(fields.map((field: DataField) => field.dataset))) as string[];
              
              setCategories(uniqueCategories);
              setDatasets(uniqueDatasets);
              
              // Close the connection after receiving data
              eventSource.close();
              setIsLoading(false);
            }
          } catch (error) {
            console.error('Error parsing SSE data:', error);
            setError('Failed to parse data from WorldQuant API');
            eventSource.close();
            setIsLoading(false);
          }
        };
        
        eventSource.onerror = (error) => {
          console.error('EventSource error:', error);
          setError('Connection to WorldQuant API failed');
          eventSource.close();
          setIsLoading(false);
        };
        
        // Clean up on unmount
        return () => {
          eventSource.close();
        };
      } catch (error) {
        console.error('Error setting up EventSource:', error);
        setError('Failed to connect to WorldQuant API');
        setIsLoading(false);
      }
    };
    
    fetchDataFields();
  }, []);
  
  // Fetch operators from WorldQuant API
  useEffect(() => {
    const fetchOperators = async () => {
      setIsLoadingOperators(true);
      setOperatorError(null);
      
      try {
        // Create EventSource for server-sent events
        const eventSource = new EventSource('/api/worldquant/stream?endpoint=operators');
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Handle different message types
            if (data.error) {
              setOperatorError(data.error);
              eventSource.close();
              setIsLoadingOperators(false);
              return;
            }
            
            if (data.status === 'connected') {
              console.log('Connected to WorldQuant API for operators');
            }
            
            // Process the actual operators
            if (Array.isArray(data)) {
              const operatorsList = data.map((op: any) => ({
                id: op.id,
                name: op.name || op.id,
                description: op.description || `Operator for ${op.category || 'general use'}`,
                category: op.category || 'Uncategorized'
              }));
              
              setOperators(operatorsList);
              onOperatorsLoaded(operatorsList);
              
              // Close the connection after receiving data
              eventSource.close();
              setIsLoadingOperators(false);
            } else if (data.results && Array.isArray(data.results)) {
              const operatorsList = data.results.map((op: any) => ({
                id: op.id,
                name: op.name || op.id,
                description: op.description || `Operator for ${op.category || 'general use'}`,
                category: op.category || 'Uncategorized'
              }));
              
              setOperators(operatorsList);
              onOperatorsLoaded(operatorsList);
              
              // Close the connection after receiving data
              eventSource.close();
              setIsLoadingOperators(false);
            }
          } catch (error) {
            console.error('Error parsing SSE data for operators:', error);
            setOperatorError('Failed to parse operators from WorldQuant API');
            eventSource.close();
            setIsLoadingOperators(false);
          }
        };
        
        eventSource.onerror = (error) => {
          console.error('EventSource error for operators:', error);
          setOperatorError('Connection to WorldQuant API for operators failed');
          eventSource.close();
          setIsLoadingOperators(false);
        };
        
        // Clean up on unmount
        return () => {
          eventSource.close();
        };
      } catch (error) {
        console.error('Error setting up EventSource for operators:', error);
        setOperatorError('Failed to connect to WorldQuant API for operators');
        setIsLoadingOperators(false);
      }
    };
    
    fetchOperators();
  }, [onOperatorsLoaded]);

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev => {
      const newSelection = prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId];
      
      onFieldsSelected(newSelection);
      return newSelection;
    });
  };

  const handleSelectAll = () => {
    if (selectedFields.length === filteredFields.length) {
      setSelectedFields([]);
      onFieldsSelected([]);
    } else {
      setSelectedFields(filteredFields.map(field => field.id));
      onFieldsSelected(filteredFields.map(field => field.id));
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'fundamental':
        return <IconDatabase className="h-4 w-4" />;
      case 'analyst':
        return <IconChartBar className="h-4 w-4" />;
      case 'model':
        return <IconCode className="h-4 w-4" />;
      case 'news':
        return <IconWorld className="h-4 w-4" />;
      case 'operator':
        return <IconBrain className="h-4 w-4" />;
      default:
        return <IconDatabase className="h-4 w-4" />;
    }
  };

  const filteredFields = dataFields.filter(field => {
    const matchesSearch = field.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         field.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || field.category === selectedCategory;
    const matchesDataset = !selectedDataset || field.dataset === selectedDataset;
    
    return matchesSearch && matchesCategory && matchesDataset;
  });

  return (
    <motion.div
      className="backdrop-blur-md bg-white/10 p-6 rounded-xl border border-white/20"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="text-lg font-bold mb-4">Data Fields</h3>
      
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search data fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="backdrop-blur-md bg-white/10 p-3 pl-10 rounded-xl border border-white/20 w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <IconSearch className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-200" />
        </div>
        
        <div className="flex gap-2">
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="backdrop-blur-md bg-white/10 p-3 rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          
          <select
            value={selectedDataset || ''}
            onChange={(e) => setSelectedDataset(e.target.value || null)}
            className="backdrop-blur-md bg-white/10 p-3 rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="">All Datasets</option>
            {datasets.map(dataset => (
              <option key={dataset} value={dataset}>{dataset}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-blue-200">
          {filteredFields.length} fields found
        </div>
        <button
          onClick={handleSelectAll}
          className="text-sm text-blue-300 hover:text-blue-200 transition-colors"
        >
          {selectedFields.length === filteredFields.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      
      {error && (
        <div className="p-4 mb-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
          <p className="font-medium">Error loading data fields</p>
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto pr-2 space-y-2">
          {filteredFields.map((field) => (
            <motion.div
              key={field.id}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                selectedFields.includes(field.id)
                  ? 'bg-blue-500/20 border-blue-500/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
              onClick={() => handleFieldToggle(field.id)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-start gap-3">
                <div className={`p-1.5 rounded-full ${
                  selectedFields.includes(field.id)
                    ? 'bg-blue-500/30 text-blue-300'
                    : 'bg-white/10 text-blue-200'
                }`}>
                  {getCategoryIcon(field.category)}
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">{field.name}</h4>
                    <div className="text-xs px-2 py-0.5 rounded-full bg-white/10">
                      {field.dataset}
                    </div>
                  </div>
                  <p className="text-sm text-blue-200 mt-1">{field.description}</p>
                </div>
                
                <div className={`p-1 rounded-full ${
                  selectedFields.includes(field.id)
                    ? 'bg-blue-500/30 text-blue-300'
                    : 'bg-white/10 text-blue-200'
                }`}>
                  {selectedFields.includes(field.id) ? (
                    <IconCheck className="h-4 w-4" />
                  ) : (
                    <IconX className="h-4 w-4" />
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      
      {selectedFields.length > 0 && (
        <motion.div
          className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-sm"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {selectedFields.length} field{selectedFields.length !== 1 ? 's' : ''} selected
        </motion.div>
      )}
      
      {/* Operators section */}
      <div className="mt-8 pt-6 border-t border-white/10">
        <h3 className="text-lg font-bold mb-4">Operators</h3>
        
        {operatorError && (
          <div className="p-4 mb-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
            <p className="font-medium">Error loading operators</p>
            <p className="text-sm">{operatorError}</p>
          </div>
        )}
        
        {isLoadingOperators ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {operators.slice(0, 10).map((operator) => (
              <motion.div
                key={operator.id}
                className="p-3 rounded-lg border bg-white/5 border-white/10"
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-full bg-white/10 text-blue-200">
                    <IconBrain className="h-4 w-4" />
                  </div>
                  
                  <div>
                    <h4 className="font-medium">{operator.name}</h4>
                    <p className="text-sm text-blue-200 mt-1">{operator.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
} 