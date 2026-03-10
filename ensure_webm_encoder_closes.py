import re

with open("services/WebMEncoder.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Make sure we wait for init to finish before we finalize too
finish_old = """  public async finish(): Promise<Blob> {
    if (this.finalizedBlob) {"""
finish_new = """  public async finish(): Promise<Blob> {
    if (this.initPromise) {
      await this.initPromise;
      this.initPromise = null;
    }
    if (this.finalizedBlob) {"""
content = content.replace(finish_old, finish_new)

with open("services/WebMEncoder.ts", "w", encoding="utf-8") as f:
    f.write(content)
