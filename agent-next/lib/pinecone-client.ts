// Client-side utility to interact with the Pinecone API

/**
 * Upsert vectors to a namespace in Pinecone
 * @param namespace The namespace to upsert vectors to
 * @param vectors The vectors to upsert
 * @returns The result of the upsert operation
 */
export async function upsertVectors(namespace: string, vectors: any[]) {
  try {
    // Check if the data has the structure with count and results
    if (vectors.length === 1 && vectors[0].count !== undefined && vectors[0].results !== undefined) {
      console.log('Detected data with count and results structure. Transforming for Pinecone...');
    }
    
    const response = await fetch('/api/pinecone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'upsert',
        namespace,
        data: vectors,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upsert vectors');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error upserting vectors:', error);
    throw error;
  }
}

/**
 * Query vectors from a namespace in Pinecone
 * @param namespace The namespace to query vectors from
 * @param vector The vector to query
 * @param topK The number of results to return
 * @param filter Optional filter to apply to the query
 * @returns The result of the query operation
 */
export async function queryVectors(
  namespace: string,
  vector: number[],
  topK: number = 5,
  filter?: any
) {
  try {
    const response = await fetch('/api/pinecone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'query',
        namespace,
        data: {
          vector,
          topK,
          filter,
        },
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to query vectors');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error querying vectors:', error);
    throw error;
  }
}

/**
 * Delete vectors from a namespace in Pinecone
 * @param namespace The namespace to delete vectors from
 * @param ids The IDs of the vectors to delete
 * @returns The result of the delete operation
 */
export async function deleteVectors(namespace: string, ids: string[]) {
  try {
    const response = await fetch('/api/pinecone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'delete',
        namespace,
        data: ids,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete vectors');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error deleting vectors:', error);
    throw error;
  }
}

/**
 * Delete all vectors from a namespace in Pinecone
 * @param namespace The namespace to delete all vectors from
 * @returns The result of the deleteAll operation
 */
export async function deleteAllVectors(namespace: string) {
  try {
    const response = await fetch('/api/pinecone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'deleteAll',
        namespace,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete all vectors');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error deleting all vectors:', error);
    throw error;
  }
}

export default {
  upsertVectors,
  queryVectors,
  deleteVectors,
  deleteAllVectors,
}; 