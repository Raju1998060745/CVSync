import json
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

def generate_pdf_from_content(content: str, output_pdf_path: str = "resume.pdf"):
    """
    Renders the given resume content (JSON string or dict) to PDF using Jinja2 and WeasyPrint.
    """
    if isinstance(content, str):
        data = json.loads(content)
    else:
        data = content
    env = Environment(loader=FileSystemLoader("."))
    
    template = env.get_template("resume.html")
    rendered_html = template.render(**data)
    HTML(string=rendered_html).write_pdf(output_pdf_path)
    return output_pdf_path
