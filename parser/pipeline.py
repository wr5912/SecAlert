"""Three-tier parsing pipeline: Template -> Drain -> LLM."""
import json
import yaml
from pathlib import Path
from typing import Optional

from drain3.drain import Drain
from parser.registry import TemplateRegistry


class ThreeTierParser:
    """Three-tier parser pipeline for security event processing."""

    def __init__(
        self,
        template_dir: str = "parser/templates",
        drain_config: str = "parser/drain/config.yaml"
    ):
        # Tier 1: Template matcher
        self.registry = TemplateRegistry(template_dir)

        # Tier 2: Drain clustering - import and instantiate drain3's Drain class
        with open(drain_config) as f:
            drain_cfg = yaml.safe_load(f)["drain"]

        self.drain_clusterer = Drain(
            depth=drain_cfg.get("max_depth", 4),
            max_children=drain_cfg.get("max_children", 100),
            extra_delimiters=tuple(drain_cfg.get("extra_delimiters", []))
        )

        # Tier 3: DSPy/LLM parser (lazy import to avoid hard dependency)
        self.llm_parser = None

    def parse(self, raw_log: str, source_type: str) -> dict:
        """Parse raw log through three tiers."""
        # Try to parse as JSON first (for structured logs like Suricata EVE)
        try:
            event = json.loads(raw_log)
        except json.JSONDecodeError:
            event = {"raw": raw_log}

        # Tier 1: Template matching
        if template := self.registry.match_template(event, source_type):
            return self._apply_template(event, template)

        # Tier 2: Drain clustering
        if hasattr(self.drain_clusterer, 'match'):
            result = self.drain_clusterer.match(raw_log)
            if result:
                return self._drain_result_to_event(result)

        # Tier 3: LLM fallback (not implemented in Phase 1)
        return {
            "source_type": source_type,
            "raw_event": event,
            "parse_status": "fallback",
            "note": "LLM parsing not yet configured"
        }

    def _apply_template(self, event: dict, template: dict) -> dict:
        """Apply template field mappings to event."""
        result = {"source_type": template.get("source_type", "unknown")}
        fields = template.get("fields", {})
        # Handle fields as dict {field_name: {path: ..., type: ...}}
        for field_name, field_def in fields.items():
            # Handle nested paths like "alert.signature"
            value = event
            for part in field_def.get("path", field_name).split("."):
                if isinstance(value, dict):
                    value = value.get(part, {})
                else:
                    value = None
                    break
            if isinstance(value, dict):
                value = None
            result[field_name] = value
        return result

    def _drain_result_to_event(self, drain_result) -> dict:
        """Convert Drain clustering result to event dict."""
        return {
            "source_type": "unknown",
            "cluster_id": str(drain_result),
            "parse_status": "drain_clustered"
        }
