import { NextResponse } from 'next/server';
import { riskFactorService } from '@/services/api/riskFactors';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    // Load all risk factors
    const allRiskFactors = await riskFactorService.getAllRiskFactors();
    
    // Convert to a simple lookup object
    const riskFactorLookup: Record<string, {
      name: string;
      category: string;
      level: string;
      type: string;
      description: string;
    }> = {};
    
    allRiskFactors.forEach(rf => {
      riskFactorLookup[rf.id] = {
        name: rf.name,
        category: rf.category,
        level: rf.level,
        type: rf.type,
        description: rf.description,
      };
    });
    
    // Write to a static file
    const outputPath = path.join(process.cwd(), 'src/lib/risk-factors-data.json');
    await fs.writeFile(outputPath, JSON.stringify(riskFactorLookup, null, 2));
    
    return NextResponse.json({
      success: true,
      message: `Generated risk factors data file with ${allRiskFactors.length} entries`,
      path: outputPath,
    });
    
  } catch (error) {
    console.error('Failed to generate risk factors data:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate risk factors data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}