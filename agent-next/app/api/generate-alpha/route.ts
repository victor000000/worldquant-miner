import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Extract the JWT token and other parameters from the request body
    const { jwtToken, fields, operators } = await request.json();
    
    if (!jwtToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    if (!fields || !operators || fields.length === 0 || operators.length === 0) {
      return NextResponse.json({ error: 'Fields and operators are required' }, { status: 400 });
    }
    
    // Make the request to the WorldQuant API
    const response = await fetch('https://api.worldquantbrain.com/generate-alpha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `t=${jwtToken}`,
      },
      body: JSON.stringify({
        fields,
        operators,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('WorldQuant API error:', errorText);
      return NextResponse.json({ error: 'Failed to generate alpha ideas' }, { status: response.status });
    }
    
    const data = await response.json();
    
    // Add CORS headers to the response
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    return NextResponse.json(data, { headers });
  } catch (error) {
    console.error('Error in generate-alpha API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 