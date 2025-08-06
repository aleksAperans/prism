import { NextRequest, NextResponse } from 'next/server';
import { projectService } from '@/services/api/projects';
import { screeningService } from '@/services/api/screening';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { loadDefaultRiskProfile, loadRiskProfileById, filterRiskFactorsByProfile, calculateEntityRiskScore } from '@/lib/risk-scoring';
import { readGlobalSettings } from '@/lib/global-settings';
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

    // Comprehensive request validation
    const validationErrors: string[] = [];
    
    // Required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      validationErrors.push('Entity name is required and must be a non-empty string');
    }
    
    if (!body.project_id || typeof body.project_id !== 'string') {
      validationErrors.push('Project ID is required and must be a string');
    }
    
    if (!body.type || !['company', 'person'].includes(body.type)) {
      validationErrors.push('Entity type is required and must be either "company" or "person"');
    }
    
    // Note: Profile is now read from global settings, not from request body
    
    // Optional field validation
    if (body.address && (typeof body.address !== 'string' || body.address.trim() === '')) {
      validationErrors.push('Address must be a non-empty string if provided');
    }
    
    if (body.country && (typeof body.country !== 'string' || body.country.length !== 3)) {
      validationErrors.push('Country must be a 3-letter ISO country code if provided');
    }
    
    if (body.date_of_birth && body.type === 'person') {
      // Basic date format validation for persons
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(body.date_of_birth)) {
        validationErrors.push('Date of birth must be in YYYY-MM-DD format for persons');
      }
    }
    
    if (body.identifier && (typeof body.identifier !== 'string' || body.identifier.trim() === '')) {
      validationErrors.push('Identifier must be a non-empty string if provided');
    }
    
    if (validationErrors.length > 0) {
      console.error('❌ Request validation errors:', validationErrors);
      return NextResponse.json(
        { 
          error: 'Request validation failed',
          details: validationErrors
        },
        { status: 400 }
      );
    }
    
    console.log('✅ Request validation passed for entity:', body.name);

    // Read global settings to get the default match profile
    const globalSettings = await readGlobalSettings();
    const matchProfile = globalSettings.default_match_profile;
    console.log('📋 Using match profile from global settings:', matchProfile);

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

    // Load risk profile configuration
    let riskProfile;
    try {
      // Use the selected risk profile if provided, otherwise load the default
      if (body.risk_profile) {
        console.log('🎯 Loading selected risk profile:', body.risk_profile);
        riskProfile = await loadRiskProfileById(body.risk_profile);
      }
      
      // Fall back to default if the selected profile couldn't be loaded
      if (!riskProfile) {
        console.log('📋 Loading default risk profile as fallback');
        riskProfile = await loadDefaultRiskProfile();
      }
      
      if (riskProfile) {
        console.log('✅ Loaded risk profile:', riskProfile.name);
        console.log('📊 Risk scoring enabled:', riskProfile.riskScoringEnabled);
        console.log('📊 Enabled factors:', riskProfile.enabledFactors.length);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load risk profile, proceeding without filtering:', error);
    }

    // Perform entity analysis
    try {
      const entityAttributes = {
        name: [body.name], // Convert to array as Sayari expects
        type: body.type as 'person' | 'company',
        ...(body.address && { address: [body.address] }), // Use 'address' as per EntityAttributes interface
        ...(body.country && { country: [body.country] }), // Convert to array as Sayari expects
        ...(body.identifier && { identifier: [body.identifier] }), // Add identifier support
        ...(body.date_of_birth && { date_of_birth: body.date_of_birth }),
        // Profile is passed separately to screenEntity method, not as part of attributes
      };
      
      console.log('🎯 Analyzing entity with attributes:', entityAttributes);
      console.log('📋 Using Sayari profile:', matchProfile);
      console.log('🔍 Using risk profile:', body.risk_profile || 'default');
      console.log('🏗️ Project ID:', projectId);
      console.log('📝 Exact Sayari request format:', {
        projectId,
        entityAttributes,
        profile: matchProfile
      });
      
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
          matchProfile // Use the profile from global settings
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

      const combinedRiskFactors = Array.from(allRiskFactors).map(id => ({ id: id as string }));

      console.log('🔍 Combined risk factors count (before filtering):', combinedRiskFactors.length);
      console.log('📊 Parent risk factors:', screeningResult.risk_factors?.length || 0);
      console.log('🎯 Match count:', screeningResult.matches?.length || 0);

      // Filter risk factors based on risk profile if available
      const filteredRiskFactors = riskProfile 
        ? filterRiskFactorsByProfile(combinedRiskFactors, riskProfile)
        : combinedRiskFactors;

      console.log('🔍 Combined risk factors count (after filtering):', filteredRiskFactors.length);

      // Calculate risk score if risk scoring is enabled
      let riskScore = null;
      if (riskProfile && riskProfile.riskScoringEnabled) {
        const riskFactorIds = filteredRiskFactors.map(rf => rf.id);
        riskScore = calculateEntityRiskScore(riskFactorIds, riskProfile);
        console.log('📊 Risk score calculated:', {
          totalScore: riskScore.totalScore,
          thresholdExceeded: riskScore.meetsThreshold,
          threshold: riskScore.threshold
        });
      }

      return NextResponse.json({
        success: true,
        already_exists: alreadyExists,
        result: {
          id: savedResult.id,
          entity_id: screeningResult.project_entity_id,
          entity_name: body.name,
          entity_type: body.type,
          match_strength: screeningResult.strength || 'unknown',
          risk_factors: filteredRiskFactors, // Use filtered risk factors
          matches: screeningResult.matches || [],
          created_at: savedResult.created_at,
          sayari_url: screeningResult.matches?.[0]?.sayari_entity_id ? `https://sayari.com/entity/${screeningResult.matches[0].sayari_entity_id}` : undefined,
          // Include risk scoring information
          risk_score: riskScore,
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