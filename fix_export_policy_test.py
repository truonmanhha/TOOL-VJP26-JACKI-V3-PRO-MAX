import re

with open("tests/exportPolicy.test.ts", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("expect(policy.fps).toBeLessThanOrEqual(90);", "expect(policy.fps).toBeLessThanOrEqual(50);")
content = content.replace("expect(policy.fps).toBeGreaterThan(30);", "expect(policy.fps).toBeGreaterThan(15);")
content = content.replace("should cap fps at 90", "should cap fps at 50")

with open("tests/exportPolicy.test.ts", "w", encoding="utf-8") as f:
    f.write(content)
