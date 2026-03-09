import re

with open('components/GCodeViewer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure react-dom createPortal is imported
if 'import { createPortal } from "react-dom";' not in content and 'import { createPortal }' not in content:
    content = 'import { createPortal } from "react-dom";\n' + content

block_start = "{showBorderFlash && ("
block_end = "        )}"
start_idx = content.find(block_start)
end_idx = content.find(block_end, start_idx) + len(block_end)

if start_idx != -1 and end_idx != -1:
    old_block = content[start_idx:end_idx]
    
    # Force replacement to Portal
    new_block = """{showBorderFlash && createPortal(
          <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 99999}}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 0.15, 0.1, 0] }} transition={{ duration: 2.5, times: [0, 0.2, 0.6, 1], ease: "easeInOut" }} className="fixed inset-0 bg-cyan-500/10 z-[99998] pointer-events-none" />
            <motion.div initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: [0, 1, 0] }} transition={{ duration: 2.5, times: [0, 0.3, 1], ease: "circOut" }} className="fixed left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent z-[99999] shadow-[0_0_20px_#22d3ee] pointer-events-none" style={{ transformOrigin: 'left' }} />
            <motion.div initial={{ height: 0, top: 0, opacity: 0 }} animate={{ height: ['0%', '100%', '100%', '100%'], opacity: [0, 1, 1, 0], boxShadow: ['0 0 8px #22d3ee', '0 0 20px #22d3ee', '0 0 20px #22d3ee', '0 0 0px #22d3ee'] }} transition={{ duration: 2.5, times: [0, 0.3, 0.6, 1], ease: "circOut", delay: 0.15 }} className="fixed left-0 w-[2px] bg-gradient-to-b from-cyan-400 via-white to-transparent z-[99999] mix-blend-screen pointer-events-none" />
            <motion.div initial={{ height: 0, top: 0, opacity: 0 }} animate={{ height: ['0%', '100%', '100%', '100%'], opacity: [0, 1, 1, 0], boxShadow: ['0 0 8px #22d3ee', '0 0 20px #22d3ee', '0 0 20px #22d3ee', '0 0 0px #22d3ee'] }} transition={{ duration: 2.5, times: [0, 0.3, 0.6, 1], ease: "circOut", delay: 0.15 }} className="fixed right-0 w-[2px] bg-gradient-to-b from-cyan-400 via-white to-transparent z-[99999] mix-blend-screen pointer-events-none" />
            <motion.div initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: [0, 1, 0] }} transition={{ duration: 2.5, times: [0, 0.3, 1], ease: "circOut", delay: 0.3 }} className="fixed left-0 right-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent z-[99999] shadow-[0_0_20px_#22d3ee] pointer-events-none" style={{ transformOrigin: 'left' }} />
          </div>,
          document.body
        )}"""
    
    content = content[:start_idx] + new_block + content[end_idx:]

with open('components/GCodeViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Forced portal update")
