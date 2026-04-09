import re

with open('components/GCodeViewer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace toggleFullScreen
old_toggle = "const toggleFullScreen = () => { setIs3DFullScreen(!is3DFullScreen); setTimeout(() => setZoomFitTrigger(p => p + 1), 300); };"
new_toggle = """const toggleFullScreen = () => {
    setShowBorderFlash(true);
    setTimeout(() => setShowBorderFlash(false), 2500);

    if (!is3DFullScreen) {
      if (workspaceRef.current) {
        const rect = workspaceRef.current.getBoundingClientRect();
        const targetY = rect.top + window.pageYOffset;
        const yOffset = -65;
        fluidScroll(targetY + yOffset, 1200);
        setTimeout(() => {
          document.body.style.overflow = 'hidden';
          setIs3DFullScreen(true);
          setTimeout(() => setZoomFitTrigger(p => p + 1), 300);
        }, 1300);
      }
    } else {
      document.body.style.overflow = 'auto';
      fluidScroll(0, 1000);
      setIs3DFullScreen(false);
      setTimeout(() => setZoomFitTrigger(p => p + 1), 300);
    }
  };"""

content = content.replace(old_toggle, new_toggle)

# Replace border flash
old_border = """{showBorderFlash && (
          <>
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: [0, 1, 0, 0.8, 0], scale: [0.98, 1, 0.99, 1, 1] }} transition={{ duration: 1.5, times: [0, 0.1, 0.2, 0.5, 1], ease: "easeInOut" }} className="absolute inset-0 z-[9999] pointer-events-none shadow-[inset_0_0_150px_rgba(59,130,246,0.5)] border-[8px] border-blue-500 rounded-xl" />
            <motion.div initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: [0, 1, 0] }} transition={{ duration: 0.8, ease: "circOut" }} className="absolute left-0 right-0 top-0 h-1 bg-white z-[10000] shadow-[0_0_20px_#fff]" />
            <motion.div initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: 1, opacity: [0, 1, 0] }} transition={{ duration: 0.8, ease: "circOut", delay: 0.15 }} className="absolute left-0 top-0 bottom-0 w-1 bg-white z-[10000] shadow-[0_0_20px_#fff]" />
            <motion.div initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: 1, opacity: [0, 1, 0] }} transition={{ duration: 0.8, ease: "circOut", delay: 0.15 }} className="absolute right-0 top-0 bottom-0 w-1 bg-white z-[10000] shadow-[0_0_20px_#fff]" />
            <motion.div initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: [0, 1, 0] }} transition={{ duration: 0.8, ease: "circOut", delay: 0.3 }} className="absolute left-0 right-0 bottom-0 h-1 bg-white z-[10000] shadow-[0_0_20px_#fff]" />
          </>
        )}"""

new_border = """{showBorderFlash && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 0.15, 0.1, 0] }} transition={{ duration: 2.5, times: [0, 0.2, 0.6, 1], ease: "easeInOut" }} className="fixed inset-0 bg-cyan-500/10 z-[9998] pointer-events-none" />
            <motion.div initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: [0, 1, 0] }} transition={{ duration: 2.5, times: [0, 0.3, 1], ease: "circOut" }} className="fixed left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent z-[10000] shadow-[0_0_20px_#22d3ee] pointer-events-none" style={{ transformOrigin: 'left' }} />
            <motion.div initial={{ height: 0, top: 0, opacity: 0 }} animate={{ height: ['0%', '100%', '100%', '100%'], opacity: [0, 1, 1, 0], boxShadow: ['0 0 8px #22d3ee', '0 0 20px #22d3ee', '0 0 20px #22d3ee', '0 0 0px #22d3ee'] }} transition={{ duration: 2.5, times: [0, 0.3, 0.6, 1], ease: "circOut", delay: 0.15 }} className="fixed left-0 w-[2px] bg-gradient-to-b from-cyan-400 via-white to-transparent z-[10000] mix-blend-screen pointer-events-none" />
            <motion.div initial={{ height: 0, top: 0, opacity: 0 }} animate={{ height: ['0%', '100%', '100%', '100%'], opacity: [0, 1, 1, 0], boxShadow: ['0 0 8px #22d3ee', '0 0 20px #22d3ee', '0 0 20px #22d3ee', '0 0 0px #22d3ee'] }} transition={{ duration: 2.5, times: [0, 0.3, 0.6, 1], ease: "circOut", delay: 0.15 }} className="fixed right-0 w-[2px] bg-gradient-to-b from-cyan-400 via-white to-transparent z-[10000] mix-blend-screen pointer-events-none" />
            <motion.div initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: [0, 1, 0] }} transition={{ duration: 2.5, times: [0, 0.3, 1], ease: "circOut", delay: 0.3 }} className="fixed left-0 right-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent z-[10000] shadow-[0_0_20px_#22d3ee] pointer-events-none" style={{ transformOrigin: 'left' }} />
          </>
        )}"""

content = content.replace(old_border, new_border)

with open('components/GCodeViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done.")
