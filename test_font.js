const fs = require('fs');

// We will fix DxfPreview.tsx once and for all by rendering vector text using paths.
// Since we don't have a vector font engine, we will calculate the absolute screen pixels!
