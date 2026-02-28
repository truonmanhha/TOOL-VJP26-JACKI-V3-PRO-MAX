# Playwright Skill - Browser Automation for Nesting Tool

## Description
MUST USE for any browser-related tasks. Browser automation via Playwright MCP - verification, browsing, information gathering, web scraping, testing, and all browser interactions.

## Use Cases
- Automated testing of nesting tool UI components
- Taking screenshots of canvas/drawing areas
- Verifying DXF preview rendering
- Testing user interactions (clicks, drags, selections)
- E2E testing for nesting workflows

## Capabilities
1. Navigate to development server (localhost:5173)
2. Interact with React components
3. Test canvas drawing operations
4. Verify Three.js 3D rendering
5. Capture screenshots for debugging
6. Test file upload (DXF files)
7. Form filling and validation testing

## Example Usage

### Testing Nesting Workspace
```typescript
// Navigate to app
await page.goto('http://localhost:5173');

// Test drawing tools
await page.click('[data-testid="draw-rectangle"]');
await page.mouse.move(100, 100);
await page.mouse.down();
await page.mouse.move(300, 300);
await page.mouse.up();

// Take screenshot
await page.screenshot({ path: 'drawing-test.png' });

// Verify DXF upload
const input = await page.$('input[type="file"]');
await input.setInputFiles('test.dxf');

// Wait for preview
await page.waitForSelector('.dxf-preview');
```

### Testing Sheet Manager
```typescript
// Open sheet dialog
await page.click('[data-testid="add-sheet"]');
await page.fill('[name="width"]', '1200');
await page.fill('[name="height"]', '2400');
await page.click('[data-testid="save-sheet"]');
```

## Best Practices
1. Always use data-testid attributes for reliable selectors
2. Wait for async operations (DXF parsing, nesting calculations)
3. Use screenshots for visual regression testing
4. Test both happy path and error cases
5. Clean up state between tests

## Common Patterns

### Canvas Interaction
```typescript
const canvas = await page.$('canvas');
const box = await canvas.boundingBox();
await page.mouse.move(box.x + 50, box.y + 50);
await page.mouse.down();
await page.mouse.move(box.x + 150, box.y + 150);
await page.mouse.up();
```

### Waiting for API Responses
```typescript
await Promise.all([
  page.waitForResponse(resp => resp.url().includes('/api/nesting')),
  page.click('[data-testid="start-nesting"]')
]);
```

## Troubleshooting
- Canvas elements: Use coordinates relative to bounding box
- File uploads: Ensure file paths are absolute
- Async operations: Always add explicit waits
- Three.js: May need extra time for WebGL initialization
