import { NextResponse } from 'next/server';
import { getStoredJWT } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { alpha_expression, jwtToken } = await request.json();

    const simulationData = {
      type: 'REGULAR',
      settings: {
        instrumentType: 'EQUITY',
        region: 'USA',
        universe: 'TOP3000',
        delay: 1,
        decay: 0,
        neutralization: 'INDUSTRY',
        truncation: 0.08,
        pasteurization: 'ON',
        unitHandling: 'VERIFY',
        nanHandling: 'OFF',
        language: 'FASTEXPR',
        visualization: false,
      },
      regular: alpha_expression
    };

    const response = await fetch('https://api.worldquantbrain.com/simulations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
        'Cookie': `t=${jwtToken}`
      },
      body: JSON.stringify(simulationData),
    });

    if (response.status === 401) {
      return NextResponse.json({ error: 'Authentication expired' }, { status: 401 });
    }

    if (response.status !== 201) {
      return NextResponse.json({ error: await response.text() }, { status: response.status });
    }

    const progressUrl = response.headers.get('location');
    if (!progressUrl) {
      return NextResponse.json({ error: 'No progress URL received' }, { status: 500 });
    }

    return NextResponse.json({ progress_url: progressUrl });
  } catch (error) {
    console.error('Error submitting simulation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 