-- Split commercial FOR ALL write policies into INSERT/UPDATE/DELETE so SELECT
-- remains covered only by *_read membership policies.

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and policyname in (
        'catalog_services_write',
        'catalog_cost_write',
        'catalog_questionnaire_write',
        'catalog_responses_write',
        'crm_clients_write',
        'crm_contacts_write',
        'crm_opportunities_write',
        'discovery_sessions_write',
        'discovery_sources_write',
        'extracted_facts_write',
        'opportunity_children_write',
        'opportunity_deliverables_write',
        'opportunity_budget_write',
        'opportunity_timeline_write',
        'opportunity_risks_write',
        'follow_up_write',
        'briefs_write',
        'brief_versions_write',
        'brief_sections_write',
        'evidence_write'
      )
  loop
    execute format('drop policy if exists %I on public.%I', policy_record.policyname, policy_record.tablename);
  end loop;
end
$$;

create policy catalog_services_insert
  on public.catalog_services for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'catalog.manage'));

create policy catalog_services_update
  on public.catalog_services for update to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'catalog.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'catalog.manage'));

create policy catalog_services_delete
  on public.catalog_services for delete to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'catalog.manage'));

create policy catalog_cost_insert
  on public.catalog_service_cost_components for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'catalog.manage'));

create policy catalog_cost_update
  on public.catalog_service_cost_components for update to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'catalog.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'catalog.manage'));

create policy catalog_cost_delete
  on public.catalog_service_cost_components for delete to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'catalog.manage'));

create policy catalog_questionnaire_insert
  on public.catalog_questionnaire_versions for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'catalog.manage'));

create policy catalog_questionnaire_update
  on public.catalog_questionnaire_versions for update to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'catalog.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'catalog.manage'));

create policy catalog_questionnaire_delete
  on public.catalog_questionnaire_versions for delete to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'catalog.manage'));

create policy catalog_responses_insert
  on public.catalog_questionnaire_responses for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy catalog_responses_update
  on public.catalog_questionnaire_responses for update to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy catalog_responses_delete
  on public.catalog_questionnaire_responses for delete to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy crm_clients_insert
  on public.crm_clients for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'client.manage'));

create policy crm_clients_update
  on public.crm_clients for update to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'client.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'client.manage'));

create policy crm_clients_delete
  on public.crm_clients for delete to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'client.manage'));

create policy crm_contacts_insert
  on public.crm_contacts for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'client.manage'));

create policy crm_contacts_update
  on public.crm_contacts for update to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'client.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'client.manage'));

create policy crm_contacts_delete
  on public.crm_contacts for delete to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'client.manage'));

create policy crm_opportunities_insert
  on public.crm_opportunities for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy crm_opportunities_update
  on public.crm_opportunities for update to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy crm_opportunities_delete
  on public.crm_opportunities for delete to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy discovery_sessions_insert
  on public.discovery_sessions for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'discovery.manage'));

create policy discovery_sessions_update
  on public.discovery_sessions for update to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'discovery.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'discovery.manage'));

create policy discovery_sessions_delete
  on public.discovery_sessions for delete to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'discovery.manage'));

create policy discovery_sources_insert
  on public.discovery_sources for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'discovery.manage'));

create policy discovery_sources_update
  on public.discovery_sources for update to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'discovery.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'discovery.manage'));

create policy discovery_sources_delete
  on public.discovery_sources for delete to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'discovery.manage'));

create policy extracted_facts_insert
  on public.extracted_facts for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'discovery.manage'));

create policy extracted_facts_update_manage
  on public.extracted_facts for update to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'discovery.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'discovery.manage'));

create policy extracted_facts_delete
  on public.extracted_facts for delete to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'discovery.manage'));

create policy opportunity_children_insert
  on public.opportunity_requirements for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy opportunity_children_update
  on public.opportunity_requirements for update to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy opportunity_children_delete
  on public.opportunity_requirements for delete to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy opportunity_deliverables_insert
  on public.opportunity_deliverables for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy opportunity_deliverables_update
  on public.opportunity_deliverables for update to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy opportunity_deliverables_delete
  on public.opportunity_deliverables for delete to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy opportunity_budget_insert
  on public.opportunity_budget_constraints for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy opportunity_budget_update
  on public.opportunity_budget_constraints for update to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy opportunity_budget_delete
  on public.opportunity_budget_constraints for delete to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy opportunity_timeline_insert
  on public.opportunity_timeline_constraints for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy opportunity_timeline_update
  on public.opportunity_timeline_constraints for update to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy opportunity_timeline_delete
  on public.opportunity_timeline_constraints for delete to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy opportunity_risks_insert
  on public.opportunity_risks for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy opportunity_risks_update
  on public.opportunity_risks for update to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy opportunity_risks_delete
  on public.opportunity_risks for delete to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy follow_up_insert
  on public.follow_up_questions for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy follow_up_update
  on public.follow_up_questions for update to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy follow_up_delete
  on public.follow_up_questions for delete to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy briefs_insert
  on public.briefs for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'brief.manage'));

create policy briefs_update
  on public.briefs for update to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'brief.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'brief.manage'));

create policy briefs_delete
  on public.briefs for delete to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'brief.manage'));

create policy brief_versions_insert
  on public.brief_versions for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'brief.manage'));

create policy brief_versions_update
  on public.brief_versions for update to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'brief.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'brief.manage'));

create policy brief_versions_delete
  on public.brief_versions for delete to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'brief.manage'));

create policy brief_sections_insert
  on public.brief_sections for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'brief.manage'));

create policy brief_sections_update
  on public.brief_sections for update to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'brief.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'brief.manage'));

create policy brief_sections_delete
  on public.brief_sections for delete to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'brief.manage'));

create policy evidence_insert
  on public.evidence_references for insert to authenticated
  with check (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy evidence_update
  on public.evidence_references for update to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'))
  with check (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));

create policy evidence_delete
  on public.evidence_references for delete to authenticated
  using (flow_private.has_workspace_permission(workspace_id, 'opportunity.manage'));
