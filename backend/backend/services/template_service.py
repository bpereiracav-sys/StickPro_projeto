from pathlib import Path
from typing import Dict, Any


class TemplateService:
    def __init__(self):
        self.base_path = Path(__file__).resolve().parents[1] / "templates"

    def render_template(self, template_path: str, context: Dict[str, Any]) -> str:
        full_path = self.base_path / template_path

        if not full_path.exists():
            raise FileNotFoundError(f"Template não encontrado: {template_path}")

        html = full_path.read_text(encoding="utf-8")

        for key, value in context.items():
            html = html.replace(f"{{{{ {key} }}}}", str(value or ""))
            html = html.replace(f"{{{{{key}}}}}", str(value or ""))

        return html
