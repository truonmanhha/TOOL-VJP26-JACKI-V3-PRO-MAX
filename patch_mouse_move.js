const fs = require('fs');
let code = fs.readFileSync('components/NestingAX/Workspace.tsx', 'utf8');

// The issue might be that React state is updated too frequently during pan/zoom.
// We can throttle handleMouseMoveInternal and handleWheel

if (!code.includes('import { debounce, throttle } from "lodash"')) {
    code = code.replace("import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';", 
    "import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';\nimport { throttle } from 'lodash';");
}

fs.writeFileSync('components/NestingAX/Workspace.tsx', code);
console.log("Patched");
