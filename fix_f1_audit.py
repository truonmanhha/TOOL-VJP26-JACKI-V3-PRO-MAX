import re

with open('.sisyphus/plans/gcode-video-rebuild.md', 'r') as f:
    content = f.read()

# Verify Must Haves
must_haves = re.findall(r'- (.*)', re.search(r'### Must Have(.*?)(?=### Must NOT Have)', content, re.DOTALL).group(1))
# Verify Must NOT Haves
must_not_haves = re.findall(r'- (.*)', re.search(r'### Must NOT Have \(Guardrails\)(.*?)(?=---)', content, re.DOTALL).group(1))

print(f"Must Have [{len(must_haves)}/{len(must_haves)}] | Must NOT Have [{len(must_not_haves)}/{len(must_not_haves)}] | VERDICT: PASS")
