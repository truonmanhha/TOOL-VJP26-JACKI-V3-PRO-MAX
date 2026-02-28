# Skill Package - VJP26 Nesting Tool

## Overview
This skill package contains specialized skills for developing the VJP26 JACKI PRO nesting tool.

## Directory Structure

```
SKILL/
├── README.md                    # This file
├── playwright.md               # Browser automation skill
├── frontend-ui-ux.md           # UI/UX design skill
├── ui-ux-pro-max.md            # Professional UI/UX guidelines
├── audit-website.md            # SEO & Performance audit
├── brainstorming.md            # Design ideation process
├── ui-bug-report.md            # Mô tả lỗi UI không cần ảnh (NEW)
├── git-master.md               # Git operations skill
├── dev-browser.md              # Browser automation with state
├── nesting-domain.md           # CNC nesting domain knowledge
└── typescript-react.md         # TypeScript/React patterns
```

## Skill Descriptions

### 1. playwright.md
**Use for**: Browser automation, testing, screenshots, web scraping
- Automated testing of nesting UI
- Canvas interaction testing
- DXF upload testing
- E2E workflow testing

### 2. frontend-ui-ux.md
**Use for**: UI design, component styling, layout
- Dark theme CAD interface design
- Component patterns (buttons, panels, dialogs)
- Framer Motion animations
- Industrial aesthetic guidelines

### 3. ui-ux-pro-max.md ⭐ NEW
**Use for**: Professional UI/UX standards and accessibility
- **CRITICAL**: Accessibility guidelines (WCAG compliance)
- **CRITICAL**: Touch & interaction patterns
- **HIGH**: Performance optimization
- **HIGH**: Layout & responsive design
- **MEDIUM**: Typography & color systems
- **MEDIUM**: Animation guidelines
- Pre-delivery checklists
- CAD interface specific patterns

### 4. audit-website.md ⭐ NEW
**Use for**: SEO, performance, accessibility, and security auditing
- **CRITICAL**: SEO optimization (meta tags, structured data)
- **CRITICAL**: Security headers and HTTPS
- **HIGH**: Performance optimization (Core Web Vitals)
- **HIGH**: Accessibility audit (WCAG compliance)
- Content quality checks
- Broken link detection
- Pre-deployment checklists

### 5. brainstorming.md ⭐ NEW
**Use for**: Design ideation and feature planning
- Structured brainstorming process
- Context exploration
- Clarifying questions framework
- Multiple approach comparison
- Design documentation templates
- YAGNI principle enforcement
- Approval-driven design workflow

### 6. ui-bug-report.md ⭐ NEW
**Use for**: Mô tả lỗi UI khi không thể gửi ảnh
- 7 phương pháp mô tả UI không cần hình ảnh
- Template báo cáo bug chi tiết
- ASCII art diagrams
- CSS selector extraction
- Console snippets để lấy thông tin
- Tips mô tả hiệu quả

### 7. git-master.md
**Use for**: All git operations
- Commit conventions
- Branch management
- History search (blame, bisect, log)
- Rebase and squash operations

### 7. dev-browser.md
**Use for**: Browser automation with persistent state
- Page navigation and interaction
- Form filling
- Screenshot capture
- Network monitoring
- File uploads

### 8. nesting-domain.md
**Use for**: Domain-specific nesting operations
- DXF parsing and entity processing
- Nesting algorithms (BL, Genetic, Shelf)
- Geometry operations (convex hull, MBR)
- GCode generation
- Three.js visualization

### 9. typescript-react.md
**Use for**: Code patterns and architecture
- TypeScript strict typing
- React component patterns
- Custom hooks
- Performance optimization
- State management

## How to Use These Skills

When delegating tasks, specify which skills to load:

```typescript
task(
  category="visual-engineering",
  load_skills=["frontend-ui-ux", "typescript-react"],
  prompt="Create a new component for..."
);

task(
  category="deep",
  load_skills=["nesting-domain", "typescript-react"],
  prompt="Implement genetic nesting algorithm..."
);

task(
  category="quick",
  load_skills=["git-master"],
  prompt="Commit recent changes with proper message..."
);

// NEW: For professional UI with accessibility
task(
  category="visual-engineering",
  load_skills=["ui-ux-pro-max", "frontend-ui-ux", "typescript-react"],
  prompt="Create a new dialog component with proper accessibility..."
);

// NEW: For UI audit/review
task(
  category="quick",
  load_skills=["ui-ux-pro-max"],
  prompt="Review this component for accessibility and UX issues..."
);

// NEW: For website audit
task(
  category="quick",
  load_skills=["audit-website"],
  prompt="Audit localhost:5173 for SEO and performance issues..."
);

// NEW: For feature brainstorming
task(
  category="deep",
  load_skills=["brainstorming"],
  prompt="I want to add a history feature for nesting results. Let's brainstorm..."
);

// NEW: For reporting UI bug without screenshot
task(
  category="quick",
  load_skills=["ui-bug-report"],
  prompt="Help me describe a UI bug: The Export button disappears when I have more than 5 parts in the list. It's supposed to be in the toolbar next to the 'Start Nesting' button..."
);
```

## Skill Combinations by Task Type

| Task Type | Recommended Skills |
|-----------|-------------------|
| UI Development | frontend-ui-ux, ui-ux-pro-max, typescript-react |
| Algorithm Implementation | nesting-domain, typescript-react |
| Testing | playwright, dev-browser |
| Git Operations | git-master |
| DXF/GCode Work | nesting-domain |
| Accessibility Audit | ui-ux-pro-max, audit-website |
| Professional UI Review | ui-ux-pro-max, frontend-ui-ux |
| SEO/Performance Audit | audit-website |
| Feature Planning | brainstorming |
| New Feature Design | brainstorming, frontend-ui-ux |
| Pre-deployment Check | audit-website, ui-ux-pro-max |
| Bug Report (no screenshot) | ui-bug-report |
| Full Feature | All skills |

## Project Context

These skills are tailored for:
- **Framework**: Vite + React + TypeScript
- **Visualization**: Three.js for 3D, Canvas API for 2D
- **Backend**: Python FastAPI
- **Domain**: CNC nesting, DXF/GCode processing
- **UI**: Dark theme, industrial CAD style

## Updating Skills

To add or modify skills:
1. Edit the relevant .md file in SKILL/ directory
2. Follow the existing format and structure
3. Include code examples and best practices
4. Update this README if adding new skills

## Notes

- Skills are loaded by the `load_skills` parameter in task delegation
- Multiple skills can be loaded for complex tasks
- Skills provide context and patterns but don't replace agent reasoning
- Always verify output matches your requirements
