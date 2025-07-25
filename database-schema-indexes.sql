-- Performance Indexes for Comprehensive Project Entity Schema
-- Run this after the Prisma migration to add performance optimizations

-- ============================================================================
-- PROJECT ENTITIES - Core table indexes
-- ============================================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_project_entities_project_org 
    ON project_entities(project_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_project_entities_sayari_id 
    ON project_entities(sayari_entity_id) 
    WHERE sayari_entity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_project_entities_status 
    ON project_entities(screening_status);

CREATE INDEX IF NOT EXISTS idx_project_entities_workflow 
    ON project_entities(workflow_state);

CREATE INDEX IF NOT EXISTS idx_project_entities_assigned 
    ON project_entities(assigned_to) 
    WHERE assigned_to IS NOT NULL;

-- Temporal indexes
CREATE INDEX IF NOT EXISTS idx_project_entities_screened_at 
    ON project_entities(screened_at) 
    WHERE screened_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_project_entities_created_at 
    ON project_entities(created_at);

-- ============================================================================
-- RISK ASSESSMENTS - Risk scoring indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_risk_assessments_entity 
    ON entity_risk_assessments(project_entity_id);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_score 
    ON entity_risk_assessments(total_risk_score);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_threshold 
    ON entity_risk_assessments(exceeds_threshold);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_risk_level 
    ON entity_risk_assessments(risk_level) 
    WHERE risk_level IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_risk_assessments_profile 
    ON entity_risk_assessments(risk_profile_id);

-- ============================================================================
-- RISK FACTORS - Factor analysis indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_risk_factors_assessment 
    ON entity_risk_factors(risk_assessment_id);

CREATE INDEX IF NOT EXISTS idx_risk_factors_category 
    ON entity_risk_factors(factor_category);

CREATE INDEX IF NOT EXISTS idx_risk_factors_level 
    ON entity_risk_factors(factor_level);

CREATE INDEX IF NOT EXISTS idx_risk_factors_positive 
    ON entity_risk_factors(is_positive);

CREATE INDEX IF NOT EXISTS idx_risk_factors_factor_id 
    ON entity_risk_factors(factor_id);

CREATE INDEX IF NOT EXISTS idx_risk_factors_points 
    ON entity_risk_factors(risk_points) 
    WHERE risk_points > 0;

-- ============================================================================
-- ADDRESSES - Geographical indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_addresses_entity 
    ON entity_addresses(project_entity_id);

CREATE INDEX IF NOT EXISTS idx_addresses_country 
    ON entity_addresses(country_code) 
    WHERE country_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_addresses_primary 
    ON entity_addresses(project_entity_id, is_primary) 
    WHERE is_primary = true;

-- Geospatial index for location-based queries
CREATE INDEX IF NOT EXISTS idx_addresses_coords 
    ON entity_addresses(latitude, longitude) 
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ============================================================================
-- ATTRIBUTES - Business data indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_attributes_entity 
    ON entity_attributes(project_entity_id);

CREATE INDEX IF NOT EXISTS idx_attributes_key 
    ON entity_attributes(attribute_key);

CREATE INDEX IF NOT EXISTS idx_attributes_industry 
    ON entity_attributes(industry_code) 
    WHERE industry_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_attributes_country 
    ON entity_attributes(incorporation_country) 
    WHERE incorporation_country IS NOT NULL;

-- ============================================================================
-- MATCHES - Entity matching indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_matches_entity 
    ON entity_matches(project_entity_id);

CREATE INDEX IF NOT EXISTS idx_matches_confidence 
    ON entity_matches(match_confidence) 
    WHERE match_confidence IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_matches_type 
    ON entity_matches(match_type) 
    WHERE match_type IS NOT NULL;

-- ============================================================================
-- SUPPLY CHAIN - Relationship indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_supply_chain_entity 
    ON entity_supply_chain(project_entity_id);

CREATE INDEX IF NOT EXISTS idx_supply_chain_related 
    ON entity_supply_chain(related_entity_id) 
    WHERE related_entity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_supply_chain_type 
    ON entity_supply_chain(relationship_type) 
    WHERE relationship_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_supply_chain_tier 
    ON entity_supply_chain(tier_level) 
    WHERE tier_level IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_supply_chain_status 
    ON entity_supply_chain(relationship_status) 
    WHERE relationship_status IS NOT NULL;

-- ============================================================================
-- TRADE FLOWS - Trade analysis indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_trade_flows_entity 
    ON entity_trade_flows(project_entity_id);

CREATE INDEX IF NOT EXISTS idx_trade_flows_country 
    ON entity_trade_flows(partner_country_code) 
    WHERE partner_country_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trade_flows_hs_code 
    ON entity_trade_flows(hs_code) 
    WHERE hs_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trade_flows_year 
    ON entity_trade_flows(trade_year) 
    WHERE trade_year IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trade_flows_type 
    ON entity_trade_flows(trade_type);

-- Composite index for trade analysis
CREATE INDEX IF NOT EXISTS idx_trade_flows_year_country 
    ON entity_trade_flows(trade_year, partner_country_code) 
    WHERE trade_year IS NOT NULL AND partner_country_code IS NOT NULL;

-- ============================================================================
-- COUNTRY EXPOSURE - Geographical risk indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_country_exposure_entity 
    ON entity_country_exposure(project_entity_id);

CREATE INDEX IF NOT EXISTS idx_country_exposure_country 
    ON entity_country_exposure(country_code);

CREATE INDEX IF NOT EXISTS idx_country_exposure_type 
    ON entity_country_exposure(exposure_type);

CREATE INDEX IF NOT EXISTS idx_country_exposure_risk 
    ON entity_country_exposure(sanctions_risk, export_control_risk);

CREATE INDEX IF NOT EXISTS idx_country_exposure_trade_volume 
    ON entity_country_exposure(total_trade_value) 
    WHERE total_trade_value > 0;

-- ============================================================================
-- DATA SOURCES - Provenance indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_data_sources_entity 
    ON entity_data_sources(project_entity_id);

CREATE INDEX IF NOT EXISTS idx_data_sources_source_id 
    ON entity_data_sources(source_id);

CREATE INDEX IF NOT EXISTS idx_data_sources_type 
    ON entity_data_sources(source_type) 
    WHERE source_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_data_sources_country 
    ON entity_data_sources(source_country) 
    WHERE source_country IS NOT NULL;

-- ============================================================================
-- AUDIT TRAIL - Compliance indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_screening_audit_entity 
    ON entity_screening_audit(project_entity_id);

CREATE INDEX IF NOT EXISTS idx_screening_audit_action 
    ON entity_screening_audit(action_type, created_at);

CREATE INDEX IF NOT EXISTS idx_screening_audit_user 
    ON entity_screening_audit(action_by) 
    WHERE action_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_screening_audit_created 
    ON entity_screening_audit(created_at);

-- ============================================================================
-- CASE MANAGEMENT - Workflow indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_cases_entity 
    ON entity_cases(project_entity_id);

CREATE INDEX IF NOT EXISTS idx_cases_status 
    ON entity_cases(case_status, case_priority);

CREATE INDEX IF NOT EXISTS idx_cases_assigned 
    ON entity_cases(assigned_to) 
    WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cases_due_date 
    ON entity_cases(due_date) 
    WHERE due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cases_escalation 
    ON entity_cases(escalation_level) 
    WHERE escalation_level > 0;

-- ============================================================================
-- COMPOSITE INDEXES - Complex query optimization
-- ============================================================================

-- Entity status with risk level
CREATE INDEX IF NOT EXISTS idx_entity_status_risk 
    ON project_entities(project_id, screening_status) 
    INCLUDE (entity_name, created_at);

-- Risk assessment with threshold breach
CREATE INDEX IF NOT EXISTS idx_risk_threshold_breach 
    ON entity_risk_assessments(project_entity_id, exceeds_threshold, total_risk_score) 
    WHERE exceeds_threshold = true;

-- Country risk analysis
CREATE INDEX IF NOT EXISTS idx_country_risk_analysis 
    ON entity_country_exposure(country_code, sanctions_risk, export_control_risk, total_trade_value);

-- Trade flow time series
CREATE INDEX IF NOT EXISTS idx_trade_time_series 
    ON entity_trade_flows(project_entity_id, trade_year, trade_month) 
    WHERE trade_year IS NOT NULL;

-- ============================================================================
-- FULL TEXT SEARCH INDEXES
-- ============================================================================

-- Entity names and descriptions for search
CREATE INDEX IF NOT EXISTS idx_entity_name_search 
    ON project_entities USING GIN (to_tsvector('english', entity_name));

-- Case resolution notes search
CREATE INDEX IF NOT EXISTS idx_case_notes_search 
    ON entity_cases USING GIN (to_tsvector('english', resolution_notes)) 
    WHERE resolution_notes IS NOT NULL;

-- ============================================================================
-- ANALYZE TABLES - Update statistics for query planner
-- ============================================================================

ANALYZE project_entities;
ANALYZE entity_risk_assessments;
ANALYZE entity_risk_factors;
ANALYZE entity_addresses;
ANALYZE entity_attributes;
ANALYZE entity_matches;
ANALYZE entity_supply_chain;
ANALYZE entity_trade_flows;
ANALYZE entity_country_exposure;
ANALYZE entity_data_sources;
ANALYZE entity_screening_audit;
ANALYZE entity_cases;

-- ============================================================================
-- COMMENTS - Table and column documentation
-- ============================================================================

COMMENT ON TABLE project_entities IS 'Main table for storing project entity screening data with comprehensive fields from Sayari API';
COMMENT ON TABLE entity_risk_assessments IS 'Risk assessment results and scoring for each entity';
COMMENT ON TABLE entity_risk_factors IS 'Individual risk factors identified for entities';
COMMENT ON TABLE entity_addresses IS 'Geographical addresses and location data for entities';
COMMENT ON TABLE entity_attributes IS 'Business attributes, classification, and corporate structure data';
COMMENT ON TABLE entity_matches IS 'Alternative names and identifiers for entity matching';
COMMENT ON TABLE entity_supply_chain IS 'Supply chain relationships and trade connections';
COMMENT ON TABLE entity_trade_flows IS 'Import/export trade data with product details';
COMMENT ON TABLE entity_country_exposure IS 'Country-level exposure and geographical risk assessment';
COMMENT ON TABLE entity_data_sources IS 'Data source provenance and attribution';
COMMENT ON TABLE entity_screening_audit IS 'Complete audit trail of all screening actions';
COMMENT ON TABLE entity_cases IS 'Case management for flagged entities requiring review';

-- Performance optimization complete
SELECT 'Database schema indexes and optimizations applied successfully' as status;