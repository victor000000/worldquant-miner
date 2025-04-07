import { NextRequest, NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { 
  generateRandomVector, 
  formatMetadata, 
  validateVectorData, 
  validateMetadata,
  chunkArray,
  retryWithBackoff
} from '@/lib/pinecone';

// Initialize the Pinecone client
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
});

// Get the index
const index = pc.index(process.env.PINECONE_INDEX_NAME || 'worldquant-miner');

// Get the index dimension
let indexDimension = 1024; // Default dimension

// Function to get the index dimension
async function getIndexDimension() {
  try {
    const indexDescription = await pc.describeIndex(process.env.PINECONE_INDEX_NAME || 'worldquant-miner');
    if (indexDescription.dimension) {
      indexDimension = indexDescription.dimension;
      console.log(`Pinecone index dimension: ${indexDimension}`);
    }
    return indexDimension;
  } catch (error) {
    console.error('Error getting index dimension:', error);
    return indexDimension; // Return default if there's an error
  }
}

// Initialize the index dimension
getIndexDimension();

// POST handler for Pinecone operations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operation, namespace, data } = body;

    if (!operation) {
      return NextResponse.json({ success: false, error: 'Operation is required' }, { status: 400 });
    }

    switch (operation) {
      case 'upsert': {
        if (!namespace) {
          return NextResponse.json({ success: false, error: 'Namespace is required for upsert operation' }, { status: 400 });
        }

        if (!data || !Array.isArray(data)) {
          return NextResponse.json({ success: false, error: 'Data must be an array for upsert operation' }, { status: 400 });
        }

        // Process vectors
        const vectors = data.map(item => {
          // If the data has the structure with count and results
          if (item.count !== undefined && item.results !== undefined) {
            // Transform the data to the format Pinecone expects
            return item.results.map((result: any) => ({
              id: result.id,
              values: generateRandomVector(indexDimension),
              metadata: formatMetadata({
                description: result.description,
                dataset: result.dataset,
                category: result.category,
                subcategory: result.subcategory,
                region: result.region,
                delay: result.delay,
                universe: result.universe,
                type: result.type,
                coverage: result.coverage,
                userCount: result.userCount,
                alphaCount: result.alphaCount,
                themes: result.themes
              })
            }));
          } else {
            // If the data is already in the correct format, check and adjust dimensions if needed
            if (item.values && item.values.length !== indexDimension) {
              console.log(`Adjusting vector dimension from ${item.values.length} to ${indexDimension}`);
              // If the vector has more dimensions than the index, truncate it
              if (item.values.length > indexDimension) {
                return {
                  ...item,
                  values: item.values.slice(0, indexDimension),
                  metadata: formatMetadata(item.metadata)
                };
              } 
              // If the vector has fewer dimensions than the index, pad it with random values
              else {
                return {
                  ...item,
                  values: [...item.values, ...generateRandomVector(indexDimension - item.values.length)],
                  metadata: formatMetadata(item.metadata)
                };
              }
            }
            return {
              ...item,
              metadata: formatMetadata(item.metadata)
            };
          }
        }).flat();

        // Validate vectors
        for (const vector of vectors) {
          if (!validateVectorData(vector.values)) {
            return NextResponse.json({ success: false, error: 'Invalid vector data' }, { status: 400 });
          }
          if (vector.metadata && !validateMetadata(vector.metadata)) {
            return NextResponse.json({ success: false, error: 'Invalid metadata' }, { status: 400 });
          }
        }

        // Upsert vectors in chunks to avoid rate limits
        const chunks = chunkArray(vectors, 100);
        const results = [];

        for (const chunk of chunks) {
          const result = await retryWithBackoff(() => index.namespace(namespace).upsert(chunk));
          results.push(result);
        }

        return NextResponse.json({ success: true, results });
      }

      case 'query': {
        if (!namespace) {
          return NextResponse.json({ success: false, error: 'Namespace is required for query operation' }, { status: 400 });
        }

        if (!data || !data.vector) {
          return NextResponse.json({ success: false, error: 'Vector is required for query operation' }, { status: 400 });
        }

        const { vector, topK = 5, filter } = data;

        // Validate vector
        if (!validateVectorData(vector)) {
          return NextResponse.json({ success: false, error: 'Invalid vector data' }, { status: 400 });
        }

        // Adjust the query vector dimension if needed
        let adjustedVector = vector;
        if (vector.length !== indexDimension) {
          console.log(`Adjusting query vector dimension from ${vector.length} to ${indexDimension}`);
          if (vector.length > indexDimension) {
            adjustedVector = vector.slice(0, indexDimension);
          } else {
            adjustedVector = [...vector, ...generateRandomVector(indexDimension - vector.length)];
          }
        }

        const response = await retryWithBackoff(() => 
          index.namespace(namespace).query({
            topK,
            vector: adjustedVector,
            includeValues: true,
            includeMetadata: true,
            filter,
          })
        );

        return NextResponse.json({ success: true, response });
      }

      case 'delete': {
        if (!namespace) {
          return NextResponse.json({ success: false, error: 'Namespace is required for delete operation' }, { status: 400 });
        }

        if (!data || !Array.isArray(data.ids)) {
          return NextResponse.json({ success: false, error: 'IDs array is required for delete operation' }, { status: 400 });
        }

        const { ids } = data;

        // Delete vectors in chunks to avoid rate limits
        const chunks = chunkArray(ids, 100);
        const results = [];

        for (const chunk of chunks) {
          const result = await retryWithBackoff(() => index.namespace(namespace).deleteMany(chunk));
          results.push(result);
        }

        return NextResponse.json({ success: true, results });
      }

      case 'deleteAll': {
        if (!namespace) {
          return NextResponse.json({ success: false, error: 'Namespace is required for deleteAll operation' }, { status: 400 });
        }

        const result = await retryWithBackoff(() => index.namespace(namespace).deleteAll());
        return NextResponse.json({ success: true, result });
      }

      default:
        return NextResponse.json({ success: false, error: `Unsupported operation: ${operation}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing Pinecone operation:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
} 