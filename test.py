import json
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

# ---- 1. Load data ----------------------------------------------------------
data = json.load(open("resume.json", "r", encoding="utf-8"))
contact = json.load(open("test.json", "r", encoding="utf-8"))

# ---- 2. Render HTML with Jinja2 -------------------------------------------
env = Environment(loader=FileSystemLoader("."))          # template in current dir
template = env.get_template("resume.html")
rendered_html = template.render(**data, **contact)

# ---- 3. Convert HTML → PDF -------------------------------------------------
HTML(string=rendered_html).write_pdf("resume.pdf")

print("Generated resume.pdf")
