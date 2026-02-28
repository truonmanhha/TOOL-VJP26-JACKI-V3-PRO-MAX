# Dev Browser Skill - Browser Automation with Persistent State

## Description
Browser automation with persistent page state. Use when users ask to navigate websites, fill forms, take screenshots, extract web data, test web apps, or automate browser workflows.

## Use Cases
- Testing nesting tool in browser
- Automating DXF file uploads
- Taking screenshots of nesting results
- Extracting data from web UIs
- Testing responsive layouts
- Validating canvas rendering

## Capabilities
1. Persistent browser sessions
2. Page navigation and interaction
3. Form filling and submission
4. Screenshot capture
5. Element selection and manipulation
6. Network monitoring
7. Console log capture
8. File downloads

## Basic Usage

### Initialize Browser
```typescript
// Launch browser (happens automatically)
// Page persists between operations

// Navigate to development server
await page.goto('http://localhost:5173');
```

### Taking Screenshots
```typescript
// Full page screenshot
await page.screenshot({ 
  path: 'full-page.png',
  fullPage: true 
});

// Element screenshot
const element = await page.$('.nesting-canvas');
await element.screenshot({ path: 'canvas.png' });

// Specific region
await page.screenshot({
  path: 'region.png',
  clip: { x: 0, y: 0, width: 800, height: 600 }
});
```

### Interacting with Elements

#### Click Operations
```typescript
// Simple click
await page.click('button#start-nesting');

// Wait and click
await page.waitForSelector('[data-testid="add-sheet"]');
await page.click('[data-testid="add-sheet"]');

// Click with options
await page.click('.menu-item', {
  button: 'right',  // Right click
  clickCount: 2,    // Double click
  delay: 100        // Delay between clicks
});
```

#### Form Input
```typescript
// Fill text input
await page.fill('input[name="sheet-width"]', '1200');
await page.fill('input[name="sheet-height"]', '2400');

// Clear and fill
await page.fill('input[name="material"]', '', { timeout: 5000 });
await page.fill('input[name="material"]', 'Steel');

// Type character by character (for testing autocomplete)
await page.type('input[name="search"]', 'part-001', { delay: 100 });

// Select from dropdown
await page.selectOption('select[name="thickness"]', '10');
```

#### File Upload
```typescript
// Upload DXF file
const input = await page.$('input[type="file"]');
await input.setInputFiles('/path/to/part.dxf');

// Upload multiple files
await input.setInputFiles([
  '/path/to/part1.dxf',
  '/path/to/part2.dxf'
]);

// Wait for upload processing
await page.waitForSelector('.upload-success');
```

### Canvas Interactions

#### Drawing Operations
```typescript
// Get canvas position
const canvas = await page.$('canvas.nesting-canvas');
const box = await canvas.boundingBox();

// Draw rectangle
await page.mouse.move(box.x + 100, box.y + 100);
await page.mouse.down();
await page.mouse.move(box.x + 300, box.y + 200);
await page.mouse.up();

// Click on canvas
await page.mouse.click(box.x + 150, box.y + 150);

// Drag operation
await page.mouse.move(box.x + 50, box.y + 50);
await page.mouse.down();
await page.mouse.move(box.x + 200, box.y + 200, { steps: 10 });
await page.mouse.up();
```

### Waiting Strategies

```typescript
// Wait for element to appear
await page.waitForSelector('.nesting-result');

// Wait for element to be visible
await page.waitForSelector('.progress-bar', { 
  state: 'visible',
  timeout: 10000 
});

// Wait for element to be hidden
await page.waitForSelector('.loading', { state: 'hidden' });

// Wait for text
await page.waitForSelector('text=Nesting Complete');

// Wait for function
await page.waitForFunction(() => {
  return document.querySelector('.parts-count').textContent === '5';
});

// Wait for network idle
await page.waitForLoadState('networkidle');

// Wait for API response
await page.waitForResponse(response => 
  response.url().includes('/api/nesting') && 
  response.status() === 200
);
```

### Network Monitoring

```typescript
// Listen for requests
page.on('request', request => {
  console.log('Request:', request.url());
});

// Listen for responses
page.on('response', response => {
  console.log('Response:', response.url(), response.status());
});

// Capture specific API call
const [response] = await Promise.all([
  page.waitForResponse(resp => 
    resp.url().includes('/api/calculate-nesting')
  ),
  page.click('button#calculate')
]);

const data = await response.json();
console.log('Nesting result:', data);
```

### Console and Errors

```typescript
// Listen to console
page.on('console', msg => {
  console.log(`[${msg.type()}] ${msg.text()}`);
});

// Listen to errors
page.on('pageerror', error => {
  console.error('Page error:', error.message);
});

// Listen to request failures
page.on('requestfailed', request => {
  console.error('Request failed:', request.url());
});
```

### Common Patterns for Nesting Tool

#### Test Complete Nesting Workflow
```typescript
// 1. Navigate to app
await page.goto('http://localhost:5173');

// 2. Add sheet
await page.click('[data-testid="add-sheet"]');
await page.fill('[name="width"]', '1200');
await page.fill('[name="height"]', '2400');
await page.click('[data-testid="save-sheet"]');

// 3. Upload DXF
const input = await page.$('input[type="file"]');
await input.setInputFiles('test-part.dxf');

// 4. Wait for parsing
await page.waitForSelector('.part-preview');

// 5. Start nesting
await page.click('[data-testid="start-nesting"]');

// 6. Wait for completion
await page.waitForSelector('.nesting-complete', { timeout: 60000 });

// 7. Take screenshot
await page.screenshot({ path: 'nesting-result.png' });

// 8. Download GCode
await page.click('[data-testid="download-gcode"]');
```

#### Test Drawing Tools
```typescript
// Select rectangle tool
await page.click('[data-testid="tool-rectangle"]');

// Draw on canvas
const canvas = await page.$('.drawing-canvas');
const box = await canvas.boundingBox();

await page.mouse.move(box.x + 100, box.y + 100);
await page.mouse.down();
await page.mouse.move(box.x + 400, box.y + 300);
await page.mouse.up();

// Verify shape created
await page.waitForSelector('.shape-rectangle');

// Take screenshot
await page.screenshot({ path: 'drawing-test.png' });
```

#### Test Responsive Layout
```typescript
// Test different viewports
const viewports = [
  { width: 1920, height: 1080, name: 'desktop' },
  { width: 1366, height: 768, name: 'laptop' },
  { width: 1024, height: 768, name: 'tablet' }
];

for (const viewport of viewports) {
  await page.setViewportSize({
    width: viewport.width,
    height: viewport.height
  });
  
  await page.goto('http://localhost:5173');
  await page.screenshot({ 
    path: `responsive-${viewport.name}.png`,
    fullPage: true 
  });
}
```

### Best Practices

1. **Use Data Attributes**: Add `data-testid` to elements for reliable selection
2. **Wait Appropriately**: Always wait for elements before interacting
3. **Handle Async Operations**: Nesting calculations may take time
4. **Clean State**: Reset state between tests if needed
5. **Screenshots for Debugging**: Take screenshots on failure
6. **Network Monitoring**: Watch for API errors
7. **Console Logging**: Check for JavaScript errors

### Troubleshooting

#### Element Not Found
```typescript
// Try different selectors
await page.waitForSelector('.btn-primary', { timeout: 5000 });
await page.click('.btn-primary');

// Or use text content
await page.click('text=Start Nesting');
```

#### Timing Issues
```typescript
// Increase timeout for slow operations
await page.waitForSelector('.result', { timeout: 120000 });

// Or wait for specific condition
await page.waitForFunction(() => {
  const el = document.querySelector('.progress');
  return el && el.textContent === '100%';
}, { timeout: 120000 });
```

#### Canvas Issues
```typescript
// Ensure canvas is ready
await page.waitForSelector('canvas');
await page.waitForFunction(() => {
  const canvas = document.querySelector('canvas');
  return canvas && canvas.width > 0;
});
```
