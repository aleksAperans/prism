# Project Entity Schema Migration Guide

This guide walks you through implementing the comprehensive database schema for storing complete Sayari API project entity screening data.

## Overview

The new schema replaces JSON blob storage with proper relational tables, enabling:
- **Rich querying** of risk factors, supply chain, and trade data
- **Performance optimization** with strategic indexes
- **Multi-tenant security** with Row Level Security (RLS)
- **Complete audit trails** for compliance
- **Case management workflows** for flagged entities

## Migration Steps

### 1. Database Schema Update

#### Update Prisma Schema
The new Prisma schema has been updated in `/prisma/schema.prisma` with:
- Core entity tables (`ProjectEntity`, `EntityRiskAssessment`, `EntityRiskFactor`)
- Business context tables (`EntityAddress`, `EntityAttribute`, `EntityMatch`)
- Supply chain tables (`EntitySupplyChain`, `EntityTradeFlow`, `EntityCountryExposure`)
- Audit tables (`EntityDataSource`, `EntityScreeningAudit`, `EntityCase`)

#### Generate and Apply Migration
```bash
# Generate Prisma migration
npx prisma migrate dev --name "comprehensive-entity-schema"

# Apply performance indexes
psql $DATABASE_URL -f database-schema-indexes.sql

# Apply RLS policies (for Supabase)
psql $DATABASE_URL -f supabase-rls-policies.sql
```

### 2. Data Migration Strategy

#### Option A: Gradual Migration (Recommended)
Keep the existing `ScreeningResult` table for backward compatibility while gradually migrating to the new schema:

```typescript
// Migration service to transform existing data
export class EntityDataMigrationService {
  async migrateScreeningResult(screeningResult: ScreeningResult): Promise<ProjectEntity> {
    const projectEntity = await this.createProjectEntity({
      project_id: screeningResult.project_id,
      project_entity_id: `legacy-${screeningResult.id}`,
      entity_name: screeningResult.entity_name,
      entity_type: screeningResult.entity_type,
      match_strength: parseFloat(screeningResult.match_strength || '0'),
      sayari_entity_id: screeningResult.sayari_entity_id,
      screening_status: 'screened'
    });

    // Parse JSON risk factors and create normalized records
    const riskFactors = screeningResult.risk_factors as any[];
    await this.createRiskAssessment(projectEntity.id, riskFactors);

    // Parse full response and extract additional data
    const fullResponse = screeningResult.full_response as SayariEntityResponse;
    await this.extractAndStoreEntityData(projectEntity.id, fullResponse);

    return projectEntity;
  }
}
```

#### Option B: Fresh Start
Drop existing screening data and implement new schema from scratch (only if data loss is acceptable).

### 3. API Integration Updates

#### Update Screening Service
Modify the Sayari API integration to populate the new normalized tables:

```typescript
// Enhanced screening service
export class EntityScreeningService {
  async screenEntity(request: CreateProjectEntityRequest): Promise<ProjectEntity> {
    // 1. Create main entity record
    const entity = await this.createProjectEntity(request);

    // 2. Call Sayari API
    const sayariResponse = await this.sayariClient.screenEntity(request.entity_name);

    // 3. Create risk assessment
    const riskAssessment = await this.createRiskAssessment(entity.id, sayariResponse);

    // 4. Store all related data
    await Promise.all([
      this.storeAddresses(entity.id, sayariResponse.addresses),
      this.storeAttributes(entity.id, sayariResponse.attributes),
      this.storeSupplyChain(entity.id, sayariResponse.supply_chain),
      this.storeTradeFlows(entity.id, sayariResponse.trade_data),
      this.storeDataSources(entity.id, sayariResponse.sources)
    ]);

    // 5. Create audit log
    await this.createAuditLog(entity.id, 'screened', 'Initial screening completed');

    return entity;
  }

  private async createRiskAssessment(
    entityId: string, 
    sayariResponse: SayariEntityResponse
  ): Promise<EntityRiskAssessment> {
    const riskProfile = await this.getRiskProfile(); // Load from YAML
    
    const assessment = await prisma.entityRiskAssessment.create({
      data: {
        project_entity_id: entityId,
        risk_profile_id: riskProfile.id,
        risk_profile_version: riskProfile.version,
        total_risk_score: 0, // Will be calculated
        risk_threshold: riskProfile.riskThreshold,
        total_factors_checked: sayariResponse.risk_factors.length,
        positive_factors_count: sayariResponse.risk_factors.filter(f => f.positive).length,
        critical_factors_count: sayariResponse.risk_factors.filter(f => f.level === 'Critical').length
      }
    });

    // Create individual risk factors
    let totalScore = 0;
    for (const factor of sayariResponse.risk_factors) {
      const riskPoints = riskProfile.riskScores[factor.id] || 0;
      totalScore += factor.positive ? riskPoints : 0;

      await prisma.entityRiskFactor.create({
        data: {
          risk_assessment_id: assessment.id,
          factor_id: factor.id,
          factor_name: factor.name,
          factor_category: factor.category,
          factor_level: factor.level,
          factor_type: factor.type,
          factor_description: factor.description,
          risk_points: riskPoints,
          is_positive: factor.positive,
          confidence_level: factor.confidence,
          source_count: factor.source_count,
          first_seen: factor.first_seen ? new Date(factor.first_seen) : null,
          last_seen: factor.last_seen ? new Date(factor.last_seen) : null
        }
      });
    }

    // Update total score and threshold check
    await prisma.entityRiskAssessment.update({
      where: { id: assessment.id },
      data: {
        total_risk_score: totalScore,
        exceeds_threshold: totalScore >= riskProfile.riskThreshold,
        risk_level: this.calculateRiskLevel(totalScore, riskProfile.riskThreshold)
      }
    });

    return assessment;
  }
}
```

### 4. Frontend Component Updates

#### Update Entity Display Components
Modify existing components to use the new normalized data:

```typescript
// Enhanced entity table component
export function ProjectEntitiesTable() {
  const { data: entities } = useQuery({
    queryKey: ['project-entities', projectId],
    queryFn: () => api.getProjectEntities(projectId, {
      include: {
        risk_assessments: true,
        addresses: true,
        country_exposures: true
      }
    })
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Entity Name</TableHead>
          <TableHead>Risk Score</TableHead>
          <TableHead>Countries</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entities?.map(entity => (
          <TableRow key={entity.id}>
            <TableCell>{entity.entity_name}</TableCell>
            <TableCell>
              <RiskScoreBadge 
                score={entity.risk_assessments?.[0]?.total_risk_score || 0}
                threshold={entity.risk_assessments?.[0]?.risk_threshold || 5}
              />
            </TableCell>
            <TableCell>
              <CountryBadgeList
                countries={entity.country_exposures?.map(ce => ({
                  code: ce.country_code,
                  name: ce.country_name
                })) || []}
              />
            </TableCell>
            <TableCell>
              <StatusBadge status={entity.screening_status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### 5. API Endpoint Updates

#### Create New RESTful Endpoints
Replace JSON blob queries with proper relational queries:

```typescript
// /api/project-entities/[id]/route.ts
export async function GET(
  request: Request, 
  { params }: { params: { id: string } }
) {
  const entity = await prisma.projectEntity.findUnique({
    where: { id: params.id },
    include: {
      risk_assessments: {
        include: {
          risk_factors: true
        }
      },
      addresses: true,
      attributes: true,
      supply_chain: true,
      trade_flows: true,
      country_exposures: true,
      cases: true
    }
  });

  return NextResponse.json(entity);
}

// /api/project-entities/search/route.ts
export async function POST(request: Request) {
  const filters: ProjectEntityFilters = await request.json();
  
  const entities = await prisma.projectEntity.findMany({
    where: {
      project_id: filters.project_id,
      screening_status: filters.screening_status ? {
        in: filters.screening_status
      } : undefined,
      risk_assessments: filters.risk_score_min || filters.risk_score_max ? {
        some: {
          total_risk_score: {
            gte: filters.risk_score_min,
            lte: filters.risk_score_max
          }
        }
      } : undefined,
      country_exposures: filters.country_exposure ? {
        some: {
          country_code: {
            in: filters.country_exposure
          }
        }
      } : undefined
    },
    include: {
      risk_assessments: true,
      country_exposures: true
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  return NextResponse.json(entities);
}
```

### 6. Analytics and Reporting

#### Risk Assessment Dashboard
Create comprehensive risk analytics using the normalized data:

```typescript
export async function generateRiskReport(projectId: string): Promise<RiskAssessmentSummary> {
  const [
    totalEntities,
    highRiskEntities,
    thresholdBreaches,
    avgRiskScore,
    topRiskFactors,
    countryBreakdown
  ] = await Promise.all([
    prisma.projectEntity.count({ where: { project_id: projectId } }),
    
    prisma.projectEntity.count({
      where: {
        project_id: projectId,
        risk_assessments: {
          some: { risk_level: 'high' }
        }
      }
    }),
    
    prisma.entityRiskAssessment.count({
      where: {
        project_entity: { project_id: projectId },
        exceeds_threshold: true
      }
    }),
    
    prisma.entityRiskAssessment.aggregate({
      where: { project_entity: { project_id: projectId } },
      _avg: { total_risk_score: true }
    }),
    
    prisma.entityRiskFactor.groupBy({
      by: ['factor_id', 'factor_name'],
      where: {
        risk_assessment: {
          project_entity: { project_id: projectId }
        },
        is_positive: true
      },
      _count: { factor_id: true },
      orderBy: { _count: { factor_id: 'desc' } },
      take: 10
    }),
    
    prisma.entityCountryExposure.groupBy({
      by: ['country_code', 'country_name'],
      where: {
        project_entity: { project_id: projectId }
      },
      _count: { country_code: true },
      _avg: { country_risk_score: true },
      orderBy: { _count: { country_code: 'desc' } }
    })
  ]);

  return {
    total_entities: totalEntities,
    high_risk_entities: highRiskEntities,
    threshold_breaches: thresholdBreaches,
    avg_risk_score: avgRiskScore._avg.total_risk_score || 0,
    top_risk_factors: topRiskFactors.map(tf => ({
      factor_id: tf.factor_id,
      factor_name: tf.factor_name,
      entity_count: tf._count.factor_id
    })),
    country_risk_breakdown: countryBreakdown.map(cb => ({
      country_code: cb.country_code,
      country_name: cb.country_name,
      entity_count: cb._count.country_code,
      avg_risk_score: cb._avg.country_risk_score || 0
    }))
  };
}
```

## Key Benefits After Migration

### 1. **Performance Improvements**
- **Indexed queries**: Fast lookups by risk factors, countries, dates
- **Aggregation queries**: Real-time analytics on risk scores and exposure
- **Filtered searches**: Complex multi-criteria entity filtering

### 2. **Rich Analytics**
- **Supply chain mapping**: Multi-tier upstream/downstream relationships
- **Trade flow analysis**: Import/export patterns with HS codes
- **Country exposure reports**: Geographical risk assessment
- **Risk factor trending**: Historical risk factor analysis

### 3. **Compliance Features**
- **Complete audit trails**: Every action logged with user attribution
- **Case management**: Workflow for reviewing flagged entities
- **Data provenance**: Source attribution for all data points
- **Retention policies**: Automated data lifecycle management

### 4. **Multi-Tenant Security**
- **Organization isolation**: RLS policies prevent cross-tenant data access
- **Role-based access**: Viewer, editor, admin permissions
- **Project-level security**: Access control at project level

## Testing the Migration

### 1. Data Integrity Tests
```bash
# Compare record counts before/after migration
npm run test:migration-integrity

# Verify risk score calculations
npm run test:risk-calculations

# Check foreign key relationships
npm run test:referential-integrity
```

### 2. Performance Tests
```bash
# Test query performance on large datasets
npm run test:query-performance

# Load test API endpoints
npm run test:api-load

# Verify index effectiveness
npm run test:index-usage
```

### 3. Security Tests
```bash
# Test RLS policies
npm run test:row-level-security

# Verify role-based access
npm run test:rbac

# Check audit trail completeness
npm run test:audit-trails
```

## Rollback Plan

If issues arise during migration:

1. **Keep Legacy Tables**: The old `ScreeningResult` table remains for rollback
2. **Feature Flags**: Use feature flags to switch between old/new implementations
3. **Data Sync**: Implement bidirectional sync during transition period
4. **Gradual Cutover**: Migrate projects one at a time

## Support and Troubleshooting

### Common Issues

1. **Migration Timeout**: Large datasets may require chunked migration
2. **Foreign Key Violations**: Ensure proper relationship setup
3. **Performance Degradation**: Monitor query performance and adjust indexes
4. **RLS Policy Issues**: Test policies thoroughly in development

### Monitoring

Set up monitoring for:
- Database query performance
- API response times
- Error rates during migration
- Data consistency checks

This migration provides a solid foundation for comprehensive entity screening data management while maintaining performance and security.