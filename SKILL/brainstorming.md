# Brainstorming Skill - Design Ideation Process

## Description
Transform rough ideas into fully formed designs and specs through structured collaborative dialogue. Essential for planning new features and UI improvements in the nesting tool.

## When to Use

Use this skill when:
- Planning new features for the nesting tool
- Designing new UI components
- Refactoring existing functionality
- Exploring different approaches to a problem
- Creating implementation plans

## Anti-Pattern: "This Is Too Simple To Need A Design"

**EVERY project needs design**, even "simple" ones:
- A todo list → needs clear task structure
- A single-function utility → needs user flow
- A config change → needs validation logic

**Unexamined assumptions cause wasted work.** The design can be short, but you MUST create it.

## Brainstorming Process

### Phase 1: Explore Context (10 minutes)
```
1. Check current project state
   - Review existing components
   - Understand current architecture
   - Check recent commits and issues

2. Identify constraints
   - Technical limitations
   - User requirements
   - Time/budget constraints

3. Understand success criteria
   - What does "done" look like?
   - How will we measure success?
   - What are the must-haves vs nice-to-haves?
```

### Phase 2: Ask Clarifying Questions (15 minutes)

**Ask ONE question at a time.** Prefer multiple choice when possible.

**Example Questions for Nesting Tool:**

```
Q1: What's the primary goal of this feature?
   a) Improve user efficiency
   b) Add new capability
   c) Fix existing limitation
   d) Modernize UI/UX

Q2: Who is the target user?
   a) CNC operators (technical)
   b) Production managers (workflow)
   c) Both
   d) New users (onboarding)

Q3: What's the most important constraint?
   a) Performance (must be fast)
   b) Accuracy (must be precise)
   c) Compatibility (must work with existing files)
   d) Ease of use (must be intuitive)

Q4: Should this replace or supplement existing functionality?
   a) Replace existing feature
   b) Add alongside existing feature
   c) Completely new capability

Q5: What's the expected data volume?
   a) Small (< 100 parts)
   b) Medium (100-1000 parts)
   c) Large (> 1000 parts)
   d) Variable/unlimited
```

### Phase 3: Propose 2-3 Approaches (20 minutes)

**Always present multiple options with trade-offs.**

**Example: Adding Batch DXF Import**

```
Option A: Sequential Import
---------------------------
Approach: Import files one by one, showing progress
Pros:
  - Simple to implement
  - Easy error handling per file
  - Low memory usage
Cons:
  - Slower for large batches
  - User waits for each file
  - Less efficient

Option B: Parallel Import with Worker
-------------------------------------
Approach: Use Web Workers to process files in parallel
Pros:
  - Much faster for batches
  - UI remains responsive
  - Scales well
Cons:
  - More complex implementation
  - Higher memory usage
  - Error handling more complex

Option C: Server-Side Processing
--------------------------------
Approach: Upload files to backend, process there
Pros:
  - Fastest processing
  - Minimal client resources
  - Can handle very large files
Cons:
  - Requires backend changes
  - Network dependency
  - Privacy concerns with file uploads

RECOMMENDATION: Option B
Reason: Best balance of performance and complexity for nesting tool use case.
Users typically import 10-100 parts, parallel processing provides good UX without
over-engineering.
```

### Phase 4: Present Design Sections (30 minutes)

**Scale each section to complexity:**
- Simple: 2-3 sentences
- Complex: Up to 200-300 words
- **Get approval after EACH section before proceeding**

**Design Sections:**

```markdown
## 1. Overview (2-3 sentences)
Brief description of what we're building and why.

## 2. User Flow
Step-by-step user journey:
1. User opens feature from menu
2. User interacts with main interface
3. User completes task
4. User sees results/feedback

## 3. UI Components
List of components needed:
- Component A: Purpose and functionality
- Component B: Purpose and functionality

## 4. Data Model
Data structures:
```typescript
interface NewFeature {
  id: string;
  name: string;
  // ...
}
```

## 5. State Management
How state flows:
- Local state (useState)
- Global state (Context/Redux)
- Server state (React Query)

## 6. Error Handling
Possible errors and solutions:
- Error A: Display message X
- Error B: Retry mechanism

## 7. Testing Strategy
What to test:
- Unit tests for utilities
- Integration tests for flows
- E2E tests for critical paths
```

**Example: Nesting Result Export Feature**

```markdown
## 1. Overview
Add ability to export nesting results in multiple formats (PNG, PDF, DXF) 
so users can share results with production team or save for records.

[Wait for approval before continuing...]

## 2. User Flow
1. User completes nesting calculation
2. Clicks "Export" button in toolbar
3. Selects format from dropdown (PNG/PDF/DXF)
4. Chooses options (with/without grid, annotations, etc.)
5. File downloads automatically
6. Toast notification confirms success

[Wait for approval before continuing...]

## 3. UI Components
- ExportButton: Main button with dropdown
- ExportDialog: Options selection modal
- FormatSelector: Radio buttons for format
- OptionsPanel: Checkboxes for export options
- DownloadManager: Handles file generation

[Wait for approval before continuing...]

## 4. Data Model
```typescript
interface ExportOptions {
  format: 'png' | 'pdf' | 'dxf';
  includeGrid: boolean;
  includeAnnotations: boolean;
  includeDimensions: boolean;
  scale: number;
  quality: 'low' | 'medium' | 'high';
}

interface ExportResult {
  url: string;
  filename: string;
  size: number;
  format: string;
}
```

[Continue with remaining sections...]
```

### Phase 5: Document Design (15 minutes)

**Save validated design to:**
```
docs/plans/YYYY-MM-DD-<feature-name>-design.md
```

**Template:**
```markdown
# Design: [Feature Name]

**Date:** 2026-02-16  
**Status:** Approved  
**Author:** [Name]  

## 1. Overview
[Brief description]

## 2. User Flow
[Step-by-step journey]

## 3. UI Components
[Component list with descriptions]

## 4. Data Model
[TypeScript interfaces]

## 5. State Management
[State flow description]

## 6. Error Handling
[Error scenarios and solutions]

## 7. Testing Strategy
[Testing approach]

## 8. Open Questions
[Any unresolved issues]

## 9. Approval
- [ ] Technical review
- [ ] UX review  
- [ ] Product review
```

## Brainstorming Templates

### Template: New Feature
```
1. What's the user problem we're solving?
2. How do users currently solve this?
3. What does success look like?
4. What are the constraints?
5. What are 3 possible approaches?
6. Which approach do you recommend and why?
```

### Template: UI Component
```
1. What problem does this component solve?
2. Where will it be used?
3. What are the key props/interface?
4. What states does it have?
5. What interactions does it support?
6. How does it handle errors?
```

### Template: Refactoring
```
1. What's wrong with the current code?
2. What are the risks of changing it?
3. What's the target state?
4. What's the migration path?
5. How do we ensure nothing breaks?
```

## Key Principles

### 1. One Question at a Time
❌ DON'T:
```
"What's the goal, who's the user, and what are the constraints?"
```

✅ DO:
```
"What's the primary goal of this feature?"
[Wait for answer]

"Who is the target user?"
[Wait for answer]

"What are the main constraints?"
[Wait for answer]
```

### 2. Multiple Choice Preferred
❌ DON'T:
```
"What style should we use?"
```

✅ DO:
```
"Which style direction fits best?
  a) Minimal and clean
  b) Rich and detailed  
  c) Professional and technical
  d) Modern and playful"
```

### 3. YAGNI Ruthlessly
Remove unnecessary features from ALL designs.

**Example:**
```
Initial idea: Export to PNG, PDF, DXF, SVG, CSV, Excel
After YAGNI: Export to PNG, PDF (covers 90% of use cases)
```

### 4. Explore Alternatives
Always propose 2-3 approaches before settling.

### 5. Incremental Validation
Present design → Get approval → Continue

### 6. Be Flexible
Go back and clarify when something doesn't make sense.

## Example: Complete Brainstorming Session

**User:** "Tôi muốn thêm tính năng xem lại lịch sử nesting"

**Agent:** "Tuyệt vời! Để hiểu rõ hơn, tôi muốn hỏi vài câu:

Q1: Mục đích chính của tính năng này là gì?
  a) Xem lại kết quả cũ để so sánh
  b) Tái sử dụng thiết lập nesting trước đó
  c) Theo dõi hiệu suất theo thời gian
  d) Tất cả các trên"

**User:** "d) Tất cả các trên"

**Agent:** "Q2: Dữ liệu lịch sử nên lưu ở đâu?
  a) LocalStorage (chỉ trên máy hiện tại)
  b) Backend database (đồng bộ mọi nơi)
  c) File export (người dùng tự quản lý)"

**User:** "b) Backend database"

**Agent:** "Q3: Tôi đề xuất 3 cách tiếp cận:

Option A: Simple List View
- Hiển thị danh sách nesting cũ
- Click để xem chi tiết
- Ưu: Đơn giản, dễ implement
- Nhược: Khó so sánh, không tái sử dụng

Option B: Card Grid with Actions
- Hiển thị dạng card có preview
- Có nút 'Tải lại', 'Xóa', 'Xuất'
- Ưu: Trực quan, dễ tái sử dụng
- Nhược: Cần thumbnail generation

Option C: Full Dashboard
- Biểu đồ hiệu suất theo thời gian
- Bộ lọc và tìm kiếm nâng cao
- Ưu: Mạnh mẽ, phân tích được
- Nhược: Phức tạp, tốn thời gian

Tôi recommend Option B - cân bằng giữa tính năng và độ phức tạp.
Bạn thấy sao?"

**User:** "Đồng ý với Option B"

**Agent:** "Tuyệt! Tôi sẽ thiết kế chi tiết:

## 1. Overview
Tính năng History cho phép xem, tải lại, và quản lý các phiên nesting trước đó.

[Bạn thấy ổn chưa?]"

[Continue with remaining sections...]

## Tips for Effective Brainstorming

1. **Start Broad, Then Narrow**: Begin with open questions, then get specific
2. **Use Visual Aids**: Sketch rough wireframes if helpful
3. **Time Box**: Limit each phase to keep momentum
4. **Document Decisions**: Write down why choices were made
5. **Embrace Constraints**: Constraints often lead to better solutions
6. **Stay User-Focused**: Always ask "how does this help the user?"
7. **Prototype Fast**: Create quick mockups to validate ideas
8. **Iterate**: First design is rarely the best - refine it

## Common Pitfalls to Avoid

1. **Solution Looking for a Problem**: Ensure there's a real user need
2. **Over-Engineering**: Start simple, add complexity only when needed
3. **Ignoring Edge Cases**: Consider error states and unusual scenarios
4. **No Success Metrics**: Define how you'll measure success
5. **Skipping Validation**: Don't assume - test with users
6. **Feature Creep**: Stick to core functionality, save extras for later
