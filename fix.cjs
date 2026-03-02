const fs = require('fs');
const file = '../TOOL-VJP26-JACKI-V3-PRO-MAX-nesting-autocad/components/NestingAXApp.tsx';
let code = fs.readFileSync(file, 'utf8');

// Find renderModals
const startIndex = code.indexOf('const renderModals = () => {');
if (startIndex !== -1) {
  // Check if it's returning empty fragment or null previously
  const returnNullStr = 'return null;\n  };';
  if (code.includes(returnNullStr)) {
     // Already fixed or doesn't have the issue
  } else {
    // Revert the previous bad patch block manually
    code = code.replace(
      'return null;\n  };\n</>\n    );\n  };', 
      'return null;\n    };\n  };\n'
    );
  }
}

// Let's just fix the closing tags that my script broke
const lines = code.split('\n');
const lastLines = lines.slice(-10);
console.log('Last lines of the file:');
console.log(lastLines.join('\n'));

