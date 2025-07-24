import { NextRequest, NextResponse } from 'next/server';
import { projectService } from '@/services/api/projects';
import { screeningService } from '@/services/api/screening';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import type { EntityFormData } from '@/types/app.types';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: EntityFormData = await request.json();

    // Validate required fields
    if (!body.name || !body.project_id) {
      return NextResponse.json(
        { error: 'Entity name and project ID are required' },
        { status: 400 }
      );
    }

    // Use the selected project from the form
    const projectId = body.project_id;
    
    let verifiedProject;
    try {
      console.log('🎯 Using selected project for screening:', projectId);
      
      // Verify the project exists and is accessible
      verifiedProject = await projectService.getProject(projectId);
      console.log('✅ Project verified:', { id: verifiedProject.id, label: verifiedProject.label });
    } catch (error) {
      console.error('❌ Project management error:', error);
      if (error instanceof Error) {
        console.error('Error stack:', error.stack);
      }
      return NextResponse.json(
        { 
          error: 'Failed to manage screening project',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    // Perform entity analysis
    try {
      const entityAttributes = {
        name: [body.name], // Convert to array
        type: body.type as 'person' | 'company',
        ...(body.address && { addresses: [body.address] }),
        ...(body.country && { country: [body.country] }), // Convert to array
        ...(body.date_of_birth && { date_of_birth: body.date_of_birth }),
      };
      
      console.log('🎯 Analyzing entity with attributes:', entityAttributes);
      console.log('📋 Using profile:', body.profile || 'corporate');
      console.log('🏗️ Project ID:', projectId);
      
      // Check if entity already exists
      console.log('🔍 Checking if entity already exists...');
      const existsCheck = await screeningService.checkEntityExists(projectId, entityAttributes);
      
      let screeningResult;
      let alreadyExists = false;
      
      if (existsCheck.exists && existsCheck.project_entity_id) {
        // Entity already exists, fetch the existing entity
        console.log('✅ Entity already exists with ID:', existsCheck.project_entity_id);
        screeningResult = await screeningService.getProjectEntity(projectId, existsCheck.project_entity_id);
        alreadyExists = true;
      } else {
        // Entity doesn't exist, create new one
        console.log('➕ Entity does not exist, creating new one...');
        screeningResult = await screeningService.screenEntity(
          projectId,
          entityAttributes,
          (body.profile || 'corporate') as 'corporate' | 'suppliers' | 'search' | 'screen'
        );
      }

      // Save result to database (fallback to mock if database unavailable)
      let savedResult;
      try {
        savedResult = await prisma.screeningResult.create({
          data: {
            project_id: (verifiedProject as { id: string }).id,
            sayari_entity_id: screeningResult.project_entity_id,
            entity_name: body.name,
            entity_type: body.type || 'company',
            match_strength: screeningResult.strength || 'unknown',
            risk_factors: JSON.parse(JSON.stringify(screeningResult.risk_factors || [])),
            full_response: JSON.parse(JSON.stringify(screeningResult)),
            created_by: session.user.id
          },
        });
        console.log('💾 Result saved to database with ID:', savedResult.id);
      } catch (dbError) {
        console.warn('⚠️ Database unavailable, using mock result:', dbError instanceof Error ? dbError.message : 'Unknown error');
        // Mock saved result for demo purposes
        savedResult = {
          id: `mock-${Date.now()}`,
          created_at: new Date(),
        };
      }

      // Combine parent-level and match-level risk factors
      const allRiskFactors = new Set();
      
      // Add parent-level risk factors
      screeningResult.risk_factors?.forEach(rf => allRiskFactors.add(rf.id));
      
      // Add risk factors from all matches
      screeningResult.matches?.forEach(match => {
        match.risk_factors?.forEach(rf => allRiskFactors.add(rf.id));
      });

      const combinedRiskFactors = Array.from(allRiskFactors).map(id => ({ id }));

      console.log('🔍 Combined risk factors count:', combinedRiskFactors.length);
      console.log('📊 Parent risk factors:', screeningResult.risk_factors?.length || 0);
      console.log('🎯 Match count:', screeningResult.matches?.length || 0);

      return NextResponse.json({
        success: true,
        already_exists: alreadyExists,
        result: {
          id: savedResult.id,
          entity_id: screeningResult.project_entity_id,
          entity_name: body.name,
          entity_type: body.type,
          match_strength: screeningResult.strength || 'unknown',
          risk_factors: combinedRiskFactors,
          matches: screeningResult.matches || [],
          created_at: savedResult.created_at,
          sayari_url: screeningResult.matches?.[0]?.sayari_entity_id ? `https://sayari.com/entity/${screeningResult.matches[0].sayari_entity_id}` : undefined,
          // Include full screening result for debugging
          full_result: {
            project_id: projectId,
            project_entity_id: screeningResult.project_entity_id,
            label: screeningResult.label,
            strength: screeningResult.strength,
            countries: screeningResult.countries,
            parent_risk_factors: screeningResult.risk_factors,
            match_count: screeningResult.matches?.length || 0,
          }
        },
      });

    } catch (screeningError) {
      console.error('Entity screening error:', screeningError);
      return NextResponse.json(
        { error: 'Failed to screen entity' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Screening API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const results = await prisma.screeningResult.findMany({
      take: limit,
      skip: offset,
      orderBy: {
        created_at: 'desc',
      },
      select: {
        id: true,
        entity_name: true,
        entity_type: true,
        match_strength: true,
        risk_factors: true,
        created_at: true,
        sayari_entity_id: true,
      },
    });

    const total = await prisma.screeningResult.count();

    return NextResponse.json({
      success: true,
      results,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + limit < total,
      },
    });

  } catch (error) {
    console.error('Get screening results error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch screening results' },
      { status: 500 }
    );
  }
}