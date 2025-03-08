import { NextRequest, NextResponse } from 'next/server';

// This API exists just to check if API routes are working correctly
export async function GET(request: NextRequest) {
  console.log('API Test Route called');
  
  const searchParams = request.nextUrl.searchParams;
  const testParam = searchParams.get('test');
  
  return NextResponse.json({ 
    message: 'API test route is working',
    receivedParam: testParam,
    timestamp: new Date().toISOString()
  });
} 