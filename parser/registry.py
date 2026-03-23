"""Template registry for tier-1 parser - manages parsing templates."""
import yaml
from pathlib import Path
from typing import Optional


class TemplateRegistry:
    """Registry for parsing templates by source type."""

    def __init__(self, template_dir: str = "parser/templates"):
        self.template_dir = Path(template_dir)
        self._templates = {}

    def load_template(self, source_type: str, template_name: str) -> Optional[dict]:
        """Load a specific template file."""
        template_path = self.template_dir / f"{source_type}_{template_name}.yaml"
        if not template_path.exists():
            return None
        with open(template_path) as f:
            return yaml.safe_load(f)

    def load_templates_for_source(self, source_type: str) -> dict:
        """Load all templates for a given source type."""
        if source_type in self._templates:
            return self._templates[source_type]

        templates = {}
        for template_file in self.template_dir.glob(f"{source_type}_*.yaml"):
            with open(template_file) as f:
                template_data = yaml.safe_load(f)
                if template_data and "templates" in template_data:
                    for t in template_data["templates"]:
                        templates[t["name"]] = t
        self._templates[source_type] = templates
        return templates

    def match_template(self, event: dict, source_type: str) -> Optional[dict]:
        """Find matching template for an event based on match criteria."""
        templates = self.load_templates_for_source(source_type)
        for template in templates.values():
            match_criteria = template.get("match", {})
            if all(event.get(k) == v for k, v in match_criteria.items()):
                return template
        return None
