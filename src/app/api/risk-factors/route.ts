import { NextRequest, NextResponse } from 'next/server';
import { riskFactorService } from '@/services/api/riskFactors';

// GET /api/risk-factors - Get risk factors by IDs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const idsParam = searchParams.get('ids');
    const singleId = searchParams.get('id');
    
    if (singleId) {
      // Single risk factor lookup
      const riskFactor = await riskFactorService.getRiskFactor(singleId);
      
      return NextResponse.json({
        success: true,
        data: riskFactor || null,
      });
    }
    
    if (idsParam) {
      // Multiple risk factors lookup
      const ids = idsParam.split(',').filter(id => id.trim());
      const riskFactors = await riskFactorService.getRiskFactors(ids);
      
      return NextResponse.json({
        success: true,
        data: riskFactors,
      });
    }
    
    // No IDs provided - return all risk factors
    const allRiskFactors = await riskFactorService.getAllRiskFactors();
    
    return NextResponse.json({
      success: true,
      data: allRiskFactors,
    });
    
  } catch (error) {
    console.error('Failed to fetch risk factors:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch risk factors',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}