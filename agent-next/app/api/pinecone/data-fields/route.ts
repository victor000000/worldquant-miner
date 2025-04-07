import { NextRequest, NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { generateRandomVector, formatMetadata, retryWithBackoff } from '@/lib/pinecone';

// Initialize the Pinecone client
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
});

// Get the index
const index = pc.index(process.env.PINECONE_INDEX_NAME || 'worldquant-miner');

// Base data field data
const baseDataFields = [
  {
    id: 'df1',
    name: 'Price Data',
    category: 'Market Data',
    description: 'Historical price data for various assets',
    status: 'Pending',
    lastUploaded: null,
    vectorCount: 0,
    namespace: 'data_fields'
  },
  {
    id: 'df2',
    name: 'Volume Data',
    category: 'Market Data',
    description: 'Historical volume data for various assets',
    status: 'Pending',
    lastUploaded: null,
    vectorCount: 0,
    namespace: 'data_fields'
  },
  {
    id: 'df3',
    name: 'Fundamental Data',
    category: 'Fundamental',
    description: 'Fundamental data for various assets',
    status: 'Pending',
    lastUploaded: null,
    vectorCount: 0,
    namespace: 'data_fields'
  }
];

// GET handler to list all data fields
export async function GET() {
  try {
    // Get vector count for each data field from Pinecone
    const updatedDataFields = await Promise.all(
      baseDataFields.map(async (dataField) => {
        try {
          // Query the namespace to get vector count
          const stats = await retryWithBackoff(() => index.namespace(dataField.namespace).describeIndexStats());
          const vectorCount = stats.namespaces?.[dataField.namespace]?.recordCount || 0;
          
          // Determine status based on vector count
          let status: 'Pending' | 'In Progress' | 'Uploaded' | 'Error' = 'Pending';
          if (vectorCount > 0) {
            status = 'Uploaded';
          }
          
          return {
            ...dataField,
            status,
            vectorCount,
            lastUploaded: vectorCount > 0 ? new Date().toISOString() : null
          };
        } catch (error) {
          console.error(`Error getting vector count for data field ${dataField.id}:`, error);
          return dataField;
        }
      })
    );
    
    return NextResponse.json({ success: true, dataFields: updatedDataFields });
  } catch (error) {
    console.error('Error getting data fields:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST handler to upload data field data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dataFieldId } = body;

    if (!dataFieldId) {
      return NextResponse.json({ success: false, error: 'Data field ID is required' }, { status: 400 });
    }

    // Find the data field
    const dataField = baseDataFields.find(df => df.id === dataFieldId);
    if (!dataField) {
      return NextResponse.json({ success: false, error: 'Data field not found' }, { status: 404 });
    }

    // Create mock vectors for demonstration
    const mockVectors = Array.from({ length: 15 }, (_, i) => ({
      id: `${dataFieldId}-${i}`,
      values: generateRandomVector(1536),
      metadata: formatMetadata({
        name: dataField.name,
        category: dataField.category,
        description: dataField.description,
        type: 'data_field'
      })
    }));

    // Upload the vectors to Pinecone
    const result = await retryWithBackoff(() => index.namespace(dataField.namespace).upsert(mockVectors));
    
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Error uploading data field to Pinecone:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
} 