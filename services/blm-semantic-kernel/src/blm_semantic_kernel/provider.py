from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from importlib import import_module
from time import perf_counter
from typing import Any


class FactKind(str, Enum):
    FACT = "FACT"
    INFERENCE = "INFERENCE"
    ASSUMPTION = "ASSUMPTION"
    RECOMMENDATION = "RECOMMENDATION"
    USER_CONFIRMED_FACT = "USER_CONFIRMED_FACT"
    AI_EXTRACTED_FACT = "AI_EXTRACTED_FACT"


@dataclass(frozen=True)
class SemanticEntity:
    workspace_id: str
    entity_id: str
    entity_type: str
    label: str
    organization_id: str | None = None
    properties: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class BusinessRelationship:
    workspace_id: str
    source_entity_id: str
    relationship_type: str
    target_entity_id: str
    evidence_reference_id: str | None = None


@dataclass(frozen=True)
class BusinessFact:
    workspace_id: str
    fact_id: str
    subject_entity_id: str
    predicate: str
    value: Any
    fact_kind: FactKind
    confidence: float
    source: str
    evidence_reference_id: str | None = None
    valid_from: str | None = None
    valid_to: str | None = None


@dataclass(frozen=True)
class SemanticConflict:
    workspace_id: str
    subject_entity_id: str
    predicate: str
    fact_ids: tuple[str, ...]
    values: tuple[Any, ...]


@dataclass(frozen=True)
class SemanticaHealth:
    import_available: bool
    version: str | None
    error: str | None
    native_graph_available: bool = False
    native_graph_error: str | None = None


CONTROLLED_RELATIONSHIPS = {
    "BELONGS_TO",
    "MEMBER_OF",
    "HAS_ROLE",
    "OWNS",
    "REQUIRES_PERMISSION",
    "ENABLES",
    "RELATES_TO",
    "BASED_ON",
    "EVIDENCED_BY",
    "DECIDED_BY",
    "AFFECTS",
    "CONTACT_FOR",
    "HAS_CONTRACT",
    "COVERS_SERVICE",
}


class InMemoryBusinessSemanticProvider:
    def __init__(self) -> None:
        self._entities: dict[str, dict[str, SemanticEntity]] = {}
        self._relationships: dict[str, list[BusinessRelationship]] = {}
        self._facts: dict[str, list[BusinessFact]] = {}

    def add_entity(self, entity: SemanticEntity) -> SemanticEntity:
        self._entities.setdefault(entity.workspace_id, {})[entity.entity_id] = entity
        return entity

    def add_relationship(
        self, relationship: BusinessRelationship
    ) -> BusinessRelationship:
        if relationship.relationship_type not in CONTROLLED_RELATIONSHIPS:
            raise ValueError("Relationship type is not controlled vocabulary.")
        workspace_entities = self._entities.get(relationship.workspace_id, {})
        if (
            relationship.source_entity_id not in workspace_entities
            or relationship.target_entity_id not in workspace_entities
        ):
            raise ValueError("Relationship cannot cross workspace boundaries.")
        self._relationships.setdefault(relationship.workspace_id, []).append(relationship)
        return relationship

    def resolve_entity(self, workspace_id: str, label: str) -> SemanticEntity | None:
        normalized = label.casefold()
        return next(
            (
                entity
                for entity in self._entities.get(workspace_id, {}).values()
                if entity.label.casefold() == normalized
            ),
            None,
        )

    def get_neighbors(
        self, workspace_id: str, entity_id: str
    ) -> list[BusinessRelationship]:
        return [
            relationship
            for relationship in self._relationships.get(workspace_id, [])
            if relationship.source_entity_id == entity_id
            or relationship.target_entity_id == entity_id
        ]

    def record_fact(self, fact: BusinessFact) -> BusinessFact:
        if not 0 <= fact.confidence <= 1:
            raise ValueError("Fact confidence must be between 0 and 1.")
        if fact.subject_entity_id not in self._entities.get(fact.workspace_id, {}):
            raise ValueError("Fact subject must exist inside the workspace.")
        self._facts.setdefault(fact.workspace_id, []).append(fact)
        return fact

    def get_provenance(self, workspace_id: str, fact_id: str) -> BusinessFact | None:
        return next(
            (
                fact
                for fact in self._facts.get(workspace_id, [])
                if fact.fact_id == fact_id
            ),
            None,
        )

    def find_conflicts(self, workspace_id: str) -> list[SemanticConflict]:
        grouped: dict[tuple[str, str], list[BusinessFact]] = {}
        for fact in self._facts.get(workspace_id, []):
            grouped.setdefault((fact.subject_entity_id, fact.predicate), []).append(fact)

        conflicts: list[SemanticConflict] = []
        for (subject, predicate), facts in grouped.items():
            active_facts = [fact for fact in facts if fact.valid_from is None]
            values = {fact.value for fact in active_facts}
            if len(values) > 1:
                conflicts.append(
                    SemanticConflict(
                        workspace_id=workspace_id,
                        subject_entity_id=subject,
                        predicate=predicate,
                        fact_ids=tuple(fact.fact_id for fact in active_facts),
                        values=tuple(sorted(values)),
                    )
                )
        return conflicts

    def measure_latency(self, workspace_id: str, entity_id: str) -> dict[str, float]:
        start = perf_counter()
        self.get_neighbors(workspace_id, entity_id)
        graph_lookup_ms = (perf_counter() - start) * 1000
        start = perf_counter()
        self.find_conflicts(workspace_id)
        conflict_lookup_ms = (perf_counter() - start) * 1000
        return {
            "graph_lookup_ms": graph_lookup_ms,
            "conflict_lookup_ms": conflict_lookup_ms,
        }


class SemanticaBusinessSemanticProvider(InMemoryBusinessSemanticProvider):
    """Flow adapter boundary.

    Semantica-specific imports are contained here. When Semantica is available
    on Python 3.11+, this adapter mirrors Flow entities and relationships into
    its ContextGraph. Flow still owns tenant isolation and deterministic facts.
    """

    def __init__(self, use_native: bool = True) -> None:
        super().__init__()
        self._native_graph: Any | None = None
        self._native_provenance: Any | None = None
        self._native_error: str | None = None
        if use_native:
            self._initialize_native()

    @staticmethod
    def health() -> SemanticaHealth:
        try:
            module = import_module("semantica")
            version = getattr(module, "__version__", None)
        except Exception as exc:  # pragma: no cover - exact import failure varies.
            return SemanticaHealth(
                import_available=False,
                version=None,
                error=f"{type(exc).__name__}: {exc}",
            )

        try:
            import_module("semantica.context.context_graph")
            return SemanticaHealth(
                import_available=True,
                version=version,
                error=None,
                native_graph_available=True,
            )
        except Exception as exc:  # pragma: no cover - exact import failure varies.
            return SemanticaHealth(
                import_available=True,
                version=version,
                error=None,
                native_graph_available=False,
                native_graph_error=f"{type(exc).__name__}: {exc}",
            )

    @property
    def native_enabled(self) -> bool:
        return self._native_graph is not None

    @property
    def native_error(self) -> str | None:
        return self._native_error

    def add_entity(self, entity: SemanticEntity) -> SemanticEntity:
        stored = super().add_entity(entity)
        if self._native_graph is not None:
            self._native_graph.add_node(
                node_id=entity.entity_id,
                node_type=entity.entity_type,
                content=entity.label,
                workspace_id=entity.workspace_id,
                organization_id=entity.organization_id,
                **entity.properties,
            )
        return stored

    def add_relationship(
        self, relationship: BusinessRelationship
    ) -> BusinessRelationship:
        stored = super().add_relationship(relationship)
        if self._native_graph is not None:
            properties: dict[str, Any] = {}
            if relationship.evidence_reference_id:
                properties["evidence_reference_id"] = relationship.evidence_reference_id
            self._native_graph.add_edge(
                source_id=relationship.source_entity_id,
                target_id=relationship.target_entity_id,
                edge_type=relationship.relationship_type,
                **properties,
            )
            if self._native_provenance is not None and relationship.evidence_reference_id:
                self._native_provenance.track_relationship(
                    relationship_id=(
                        f"{relationship.source_entity_id}:"
                        f"{relationship.relationship_type}:"
                        f"{relationship.target_entity_id}"
                    ),
                    source=relationship.evidence_reference_id,
                    metadata={"workspace_id": relationship.workspace_id},
                )
        return stored

    def record_fact(self, fact: BusinessFact) -> BusinessFact:
        stored = super().record_fact(fact)
        if self._native_provenance is not None:
            self._native_provenance.track_entity(
                entity_id=fact.fact_id,
                source=fact.evidence_reference_id or fact.source,
                entity_type="business_fact",
                confidence=fact.confidence,
                metadata={
                    "workspace_id": fact.workspace_id,
                    "subject_entity_id": fact.subject_entity_id,
                    "predicate": fact.predicate,
                    "value": fact.value,
                    "fact_kind": fact.fact_kind.value,
                    "valid_from": fact.valid_from,
                    "valid_to": fact.valid_to,
                },
            )
        return stored

    def native_graph_summary(self) -> dict[str, Any]:
        if self._native_graph is None:
            return {"available": False, "error": self._native_error}
        state = self._native_graph.state_at("2026-08-10")
        return {
            "available": True,
            "nodes": len(state.get("nodes", [])),
            "edges": len(state.get("edges", [])),
            "decisions": len(state.get("decisions", [])),
        }

    def native_query(self, query: str) -> list[dict[str, Any]]:
        if self._native_graph is None:
            return []
        return list(self._native_graph.query(query))

    def native_provenance(self, fact_id: str) -> dict[str, Any] | None:
        if self._native_provenance is None:
            return None
        return self._native_provenance.get_provenance(fact_id)

    def record_native_decision(
        self,
        category: str,
        scenario: str,
        reasoning: str,
        outcome: str,
        confidence: float,
        entity_ids: list[str],
    ) -> str:
        if self._native_graph is None:
            raise RuntimeError("Semantica native graph is unavailable.")
        return self._native_graph.record_decision(
            category=category,
            scenario=scenario,
            reasoning=reasoning,
            outcome=outcome,
            confidence=confidence,
            entities=entity_ids,
            decision_maker="flow-blm-adapter",
        )

    def _initialize_native(self) -> None:
        try:
            context_graph_module = import_module("semantica.context.context_graph")
            provenance_module = import_module("semantica.provenance")
            self._native_graph = context_graph_module.ContextGraph(
                advanced_analytics=False
            )
            self._native_provenance = provenance_module.ProvenanceManager()
        except Exception as exc:  # pragma: no cover - exact import failure varies.
            self._native_graph = None
            self._native_provenance = None
            self._native_error = f"{type(exc).__name__}: {exc}"
