from blm_semantic_kernel import (
    BusinessFact,
    BusinessRelationship,
    FactKind,
    InMemoryBusinessSemanticProvider,
    SemanticEntity,
    SemanticaBusinessSemanticProvider,
)
from importlib import import_module


def build_demo_graph() -> InMemoryBusinessSemanticProvider:
    provider = InMemoryBusinessSemanticProvider()
    for entity in [
        SemanticEntity("workspace-a", "org-demo", "Organization", "Demo Agency"),
        SemanticEntity("workspace-a", "client-morganics", "Client", "Morganics"),
        SemanticEntity("workspace-a", "contact-amar", "Person", "Amar"),
        SemanticEntity(
            "workspace-a",
            "service-social",
            "Service",
            "Social Media Management",
        ),
        SemanticEntity(
            "workspace-a",
            "contract-monthly",
            "Document",
            "Monthly Service Contract",
        ),
        SemanticEntity("workspace-b", "client-other", "Client", "Morganics"),
    ]:
        provider.add_entity(entity)
    provider.add_relationship(
        BusinessRelationship(
            "workspace-a",
            "contact-amar",
            "CONTACT_FOR",
            "client-morganics",
            "evidence-contact",
        )
    )
    provider.add_relationship(
        BusinessRelationship(
            "workspace-a",
            "client-morganics",
            "HAS_CONTRACT",
            "contract-monthly",
            "evidence-contract",
        )
    )
    provider.add_relationship(
        BusinessRelationship(
            "workspace-a",
            "contract-monthly",
            "COVERS_SERVICE",
            "service-social",
            "evidence-service",
        )
    )
    return provider


def test_semantica_adapter_health_reports_current_runtime_status() -> None:
    health = SemanticaBusinessSemanticProvider.health()

    if health.import_available:
        assert health.version == "0.6.0"
        assert health.error is None
    else:
        assert "No module named" in (health.error or "")


def test_workspace_semantic_isolation_and_cross_workspace_query_blocked() -> None:
    provider = build_demo_graph()

    assert provider.resolve_entity("workspace-a", "Morganics").entity_id == "client-morganics"
    assert provider.resolve_entity("workspace-b", "Morganics").entity_id == "client-other"
    assert provider.get_neighbors("workspace-b", "client-morganics") == []


def test_relationship_creation_cannot_cross_workspaces() -> None:
    provider = build_demo_graph()

    try:
        provider.add_relationship(
            BusinessRelationship(
                "workspace-a",
                "client-morganics",
                "RELATES_TO",
                "client-other",
            )
        )
        raise AssertionError("cross-workspace relationship was accepted")
    except ValueError as exc:
        assert "cross workspace" in str(exc)


def test_fact_provenance_retained_for_decision_trace() -> None:
    provider = build_demo_graph()
    provider.record_fact(
        BusinessFact(
            workspace_id="workspace-a",
            fact_id="fact-client-resolution",
            subject_entity_id="client-morganics",
            predicate="selected_for_invoice_request",
            value=True,
            fact_kind=FactKind.USER_CONFIRMED_FACT,
            confidence=0.91,
            source="synthetic user confirmation",
            evidence_reference_id="evidence-contract",
        )
    )

    provenance = provider.get_provenance("workspace-a", "fact-client-resolution")

    assert provenance is not None
    assert provenance.evidence_reference_id == "evidence-contract"
    assert provenance.confidence == 0.91


def test_conflicting_facts_are_not_silently_merged() -> None:
    provider = build_demo_graph()
    provider.record_fact(
        BusinessFact(
            "workspace-a",
            "fee-a",
            "client-morganics",
            "monthly_fee_pkr",
            300000,
            FactKind.AI_EXTRACTED_FACT,
            0.8,
            "source-a",
            "evidence-a",
        )
    )
    provider.record_fact(
        BusinessFact(
            "workspace-a",
            "fee-b",
            "client-morganics",
            "monthly_fee_pkr",
            350000,
            FactKind.AI_EXTRACTED_FACT,
            0.8,
            "source-b",
            "evidence-b",
        )
    )

    conflicts = provider.find_conflicts("workspace-a")

    assert len(conflicts) == 1
    assert conflicts[0].values == (300000, 350000)


def test_temporal_price_change_is_not_reported_as_same_time_conflict() -> None:
    provider = build_demo_graph()
    provider.record_fact(
        BusinessFact(
            "workspace-a",
            "fee-old",
            "client-morganics",
            "monthly_fee_pkr",
            300000,
            FactKind.USER_CONFIRMED_FACT,
            0.95,
            "old contract",
            "evidence-old",
            valid_from="2026-01-01",
            valid_to="2026-06-30",
        )
    )
    provider.record_fact(
        BusinessFact(
            "workspace-a",
            "fee-new",
            "client-morganics",
            "monthly_fee_pkr",
            350000,
            FactKind.USER_CONFIRMED_FACT,
            0.95,
            "new contract",
            "evidence-new",
            valid_from="2026-07-01",
        )
    )

    assert provider.find_conflicts("workspace-a") == []


def test_no_cloud_llm_credentials_required(monkeypatch) -> None:
    for key in ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY"]:
        monkeypatch.delenv(key, raising=False)

    provider = build_demo_graph()

    assert provider.resolve_entity("workspace-a", "Amar").entity_id == "contact-amar"


def test_semantica_native_graph_mirror_when_available() -> None:
    health = SemanticaBusinessSemanticProvider.health()
    if not health.native_graph_available:
        return

    provider = SemanticaBusinessSemanticProvider()
    provider.add_entity(SemanticEntity("workspace-a", "client-morganics", "Client", "Morganics"))
    provider.add_entity(SemanticEntity("workspace-a", "contact-amar", "Person", "Amar"))
    provider.add_relationship(
        BusinessRelationship(
            "workspace-a",
            "contact-amar",
            "CONTACT_FOR",
            "client-morganics",
            "evidence-contact",
        )
    )

    assert provider.native_enabled is True
    assert provider.native_error is None
    assert provider.native_graph_summary() == {
        "available": True,
        "nodes": 2,
        "edges": 1,
        "decisions": 0,
    }
    assert provider.native_query("Morganics")[0]["content"] == "Morganics"


def test_semantica_native_provenance_and_decision_trace_when_available() -> None:
    health = SemanticaBusinessSemanticProvider.health()
    if not health.native_graph_available:
        return

    provider = SemanticaBusinessSemanticProvider()
    provider.add_entity(SemanticEntity("workspace-a", "client-morganics", "Client", "Morganics"))
    provider.record_fact(
        BusinessFact(
            workspace_id="workspace-a",
            fact_id="fact-client-resolution",
            subject_entity_id="client-morganics",
            predicate="selected_for_invoice_request",
            value=True,
            fact_kind=FactKind.USER_CONFIRMED_FACT,
            confidence=0.91,
            source="synthetic user confirmation",
            evidence_reference_id="evidence-contract",
        )
    )
    decision_id = provider.record_native_decision(
        category="invoice_resolution",
        scenario="Resolve client for invoice request",
        reasoning="User-confirmed fact links Morganics to current invoice request.",
        outcome="client-morganics",
        confidence=0.91,
        entity_ids=["client-morganics"],
    )

    provenance = provider.native_provenance("fact-client-resolution")

    assert provenance is not None
    assert provenance["source_document"] == "evidence-contract"
    assert provenance["metadata"]["workspace_id"] == "workspace-a"
    assert decision_id
    assert provider.native_graph_summary()["decisions"] == 1


def test_semantica_native_conflict_detector_when_available() -> None:
    health = SemanticaBusinessSemanticProvider.health()
    if not health.native_graph_available:
        return

    conflict_module = import_module("semantica.conflicts.conflict_detector")
    detector = conflict_module.ConflictDetector()

    conflicts = detector.detect_value_conflicts(
        [
            {"id": "client-morganics", "monthly_fee_pkr": 300000},
            {"id": "client-morganics", "monthly_fee_pkr": 350000},
        ],
        "monthly_fee_pkr",
    )

    assert len(conflicts) == 1
    assert conflicts[0].entity_id == "client-morganics"


def test_semantica_native_temporal_query_when_available() -> None:
    health = SemanticaBusinessSemanticProvider.health()
    if not health.native_graph_available:
        return

    temporal_module = import_module("semantica.kg.temporal_query")
    query = temporal_module.TemporalGraphQuery()
    graph = {
        "entities": [{"id": "client-morganics"}, {"id": "service-social"}],
        "relationships": [
            {
                "source": "client-morganics",
                "target": "service-social",
                "type": "COVERS_SERVICE",
                "valid_from": "2026-01-01",
                "valid_until": "2026-06-30",
            }
        ],
    }

    active = query.query_at_time(graph, "covered services", "2026-03-01")
    inactive = query.query_at_time(graph, "covered services", "2026-08-01")

    assert active["num_relationships"] == 1
    assert inactive["num_relationships"] == 0
