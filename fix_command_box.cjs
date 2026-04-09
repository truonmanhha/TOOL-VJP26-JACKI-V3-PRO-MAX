const fs = require('fs');
let content = fs.readFileSync('components/NestingAX/Workspace.tsx', 'utf8');

// The original prompt box from before we edited it, let's make sure it looks like it did in the previous commit
// Wait, I already reverted it. We want it to be EXACTLY like it was.
// The user says "chỉ đưa cái khung command về như cũ thôi" (just bring the command box back to how it was)
// The problem is that in my previous patches, I reverted the whole Workspace.tsx file.
// Let's check what it looks like now.
