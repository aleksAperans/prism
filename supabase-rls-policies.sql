-- Row Level Security (RLS) Policies for Multi-Tenant Project Entity Schema
-- Apply these policies after table creation to ensure proper data isolation

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE project_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_risk_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_supply_chain ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_trade_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_country_exposure ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_screening_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_cases ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROJECT ENTITIES - Core security policies
-- ============================================================================

-- Organization-level isolation
CREATE POLICY project_entities_org_isolation ON project_entities
    FOR ALL USING (
        organization_id = (auth.jwt() ->> 'organization_id')::text
        OR organization_id IS NULL -- Allow for single-tenant setups
    );

-- Project member access
CREATE POLICY project_entities_member_access ON project_entities
    FOR ALL USING (
        project_id IN (
            SELECT project_id FROM project_members 
            WHERE user_id = auth.uid()
        )
    );

-- Admin override
CREATE POLICY project_entities_admin_access ON project_entities
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- ============================================================================
-- ENTITY RISK ASSESSMENTS - Risk data policies
-- ============================================================================

CREATE POLICY entity_risk_assessments_access ON entity_risk_assessments
    FOR ALL USING (
        project_entity_id IN (
            SELECT id FROM project_entities 
            WHERE project_id IN (
                SELECT project_id FROM project_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- ENTITY RISK FACTORS - Factor data policies
-- ============================================================================

CREATE POLICY entity_risk_factors_access ON entity_risk_factors
    FOR ALL USING (
        risk_assessment_id IN (
            SELECT era.id FROM entity_risk_assessments era
            JOIN project_entities pe ON era.project_entity_id = pe.id
            WHERE pe.project_id IN (
                SELECT project_id FROM project_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- ENTITY ADDRESSES - Geographical data policies
-- ============================================================================

CREATE POLICY entity_addresses_access ON entity_addresses
    FOR ALL USING (
        project_entity_id IN (
            SELECT id FROM project_entities 
            WHERE project_id IN (
                SELECT project_id FROM project_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- ENTITY ATTRIBUTES - Business data policies
-- ============================================================================

CREATE POLICY entity_attributes_access ON entity_attributes
    FOR ALL USING (
        project_entity_id IN (
            SELECT id FROM project_entities 
            WHERE project_id IN (
                SELECT project_id FROM project_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- ENTITY MATCHES - Matching data policies
-- ============================================================================

CREATE POLICY entity_matches_access ON entity_matches
    FOR ALL USING (
        project_entity_id IN (
            SELECT id FROM project_entities 
            WHERE project_id IN (
                SELECT project_id FROM project_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- ENTITY SUPPLY CHAIN - Supply chain data policies
-- ============================================================================

CREATE POLICY entity_supply_chain_access ON entity_supply_chain
    FOR ALL USING (
        project_entity_id IN (
            SELECT id FROM project_entities 
            WHERE project_id IN (
                SELECT project_id FROM project_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- ENTITY TRADE FLOWS - Trade data policies
-- ============================================================================

CREATE POLICY entity_trade_flows_access ON entity_trade_flows
    FOR ALL USING (
        project_entity_id IN (
            SELECT id FROM project_entities 
            WHERE project_id IN (
                SELECT project_id FROM project_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- ENTITY COUNTRY EXPOSURE - Country risk policies
-- ============================================================================

CREATE POLICY entity_country_exposure_access ON entity_country_exposure
    FOR ALL USING (
        project_entity_id IN (
            SELECT id FROM project_entities 
            WHERE project_id IN (
                SELECT project_id FROM project_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- ENTITY DATA SOURCES - Source attribution policies
-- ============================================================================

CREATE POLICY entity_data_sources_access ON entity_data_sources
    FOR ALL USING (
        project_entity_id IN (
            SELECT id FROM project_entities 
            WHERE project_id IN (
                SELECT project_id FROM project_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- ENTITY SCREENING AUDIT - Audit trail policies
-- ============================================================================

CREATE POLICY entity_screening_audit_access ON entity_screening_audit
    FOR ALL USING (
        project_entity_id IN (
            SELECT id FROM project_entities 
            WHERE project_id IN (
                SELECT project_id FROM project_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Admins can see all audit logs
CREATE POLICY entity_screening_audit_admin ON entity_screening_audit
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- ============================================================================
-- ENTITY CASES - Case management policies
-- ============================================================================

CREATE POLICY entity_cases_access ON entity_cases
    FOR ALL USING (
        project_entity_id IN (
            SELECT id FROM project_entities 
            WHERE project_id IN (
                SELECT project_id FROM project_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Users can see cases assigned to them across projects
CREATE POLICY entity_cases_assigned ON entity_cases
    FOR ALL USING (
        assigned_to = auth.uid()
    );

-- Case resolvers can see their resolved cases
CREATE POLICY entity_cases_resolved ON entity_cases
    FOR ALL USING (
        resolved_by = auth.uid()
    );

-- ============================================================================
-- ROLE-BASED ACCESS POLICIES
-- ============================================================================

-- Viewer role - read-only access
CREATE POLICY viewer_read_only ON project_entities
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'viewer'
        AND project_id IN (
            SELECT project_id FROM project_members 
            WHERE user_id = auth.uid() AND role = 'viewer'
        )
    );

-- Editor role - can modify entities they have access to
CREATE POLICY editor_modify_access ON project_entities
    FOR UPDATE USING (
        auth.jwt() ->> 'role' IN ('editor', 'admin')
        AND project_id IN (
            SELECT project_id FROM project_members 
            WHERE user_id = auth.uid() AND role IN ('editor', 'admin')
        )
    );

-- Admin role - full access within organization
CREATE POLICY admin_full_access ON project_entities
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- ============================================================================
-- DATA RETENTION POLICIES
-- ============================================================================

-- Create function to check data retention limits
CREATE OR REPLACE FUNCTION check_data_retention(created_date TIMESTAMPTZ)
RETURNS BOOLEAN AS $$
BEGIN
    -- Allow access to data within retention period (e.g., 7 years for compliance)
    RETURN created_date > NOW() - INTERVAL '7 years';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply retention policy to audit logs
CREATE POLICY audit_retention_policy ON entity_screening_audit
    FOR ALL USING (
        check_data_retention(created_at)
    );

-- ============================================================================
-- SECURITY FUNCTIONS
-- ============================================================================

-- Function to get user's organization ID
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS TEXT AS $$
BEGIN
    RETURN (auth.jwt() ->> 'organization_id')::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access project
CREATE OR REPLACE FUNCTION can_access_project(project_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM project_members 
        WHERE project_id = project_uuid 
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has role
CREATE OR REPLACE FUNCTION has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (auth.jwt() ->> 'role') = required_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- AUDIT TRIGGERS
-- ============================================================================

-- Function to log changes to entities
CREATE OR REPLACE FUNCTION log_entity_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the change to audit table
    INSERT INTO entity_screening_audit (
        project_entity_id,
        action_type,
        action_by,
        field_changed,
        old_value,
        new_value,
        created_at
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        auth.uid(),
        'entity_update',
        row_to_json(OLD)::text,
        row_to_json(NEW)::text,
        NOW()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for audit logging
CREATE TRIGGER project_entities_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON project_entities
    FOR EACH ROW EXECUTE FUNCTION log_entity_changes();

CREATE TRIGGER entity_risk_assessments_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON entity_risk_assessments
    FOR EACH ROW EXECUTE FUNCTION log_entity_changes();

-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT DELETE ON entity_cases TO authenticated; -- Allow case deletion
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant read-only access to anonymous users for public data (if needed)
-- GRANT SELECT ON risk_factors TO anon;

-- ============================================================================
-- PERFORMANCE OPTIMIZATION FOR RLS
-- ============================================================================

-- Create indexes to optimize RLS policy queries
CREATE INDEX IF NOT EXISTS idx_project_members_user_lookup 
    ON project_members(user_id, project_id, role);

CREATE INDEX IF NOT EXISTS idx_project_entities_org_lookup 
    ON project_entities(organization_id, project_id) 
    WHERE organization_id IS NOT NULL;

-- ============================================================================
-- POLICY TESTING FUNCTIONS
-- ============================================================================

-- Function to test RLS policies
CREATE OR REPLACE FUNCTION test_rls_policies()
RETURNS TABLE(test_name TEXT, passed BOOLEAN, details TEXT) AS $$
BEGIN
    -- Test organization isolation
    RETURN QUERY
    SELECT 
        'Organization Isolation'::TEXT,
        COUNT(*) = 0,
        'Should not see entities from other organizations'::TEXT
    FROM project_entities 
    WHERE organization_id != get_user_organization_id()
    AND organization_id IS NOT NULL;
    
    -- Add more tests as needed
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Row Level Security policies applied successfully' as status;