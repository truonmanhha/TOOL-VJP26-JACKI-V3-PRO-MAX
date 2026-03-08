# Master Plan: ChatBot AI VJP26.CORE - The Ultimate Evolution

## TL;DR
> **Quick Summary**: Implement all 10 proposed advanced features (5 functional, 5 UI/UX) to transform the ChatBot from a floating window into a fully autonomous, context-aware, 3D Cyberpunk AI Agent.
> 
> **Phases**:
> - **Phase 1: Cyberpunk UI Skin (Visuals)** - HUD Data streams, Typewriter effect, Energy Input, and Glitch/Punishment system.
> - **Phase 2: 3D Soul & Voice (Sensory)** - Replace 2D icon with 3D R3F Hologram, add Voice/TTS, and Image Particle Absorption.
> - **Phase 3: The Brain (Autonomy)** - Context awareness (read canvas state), Agentic Co-pilot (Function Calling), and Ollama Local integration.

---

## Phase 1: Cyberpunk UI Skin (Currently Executing)

### 1. HUD Data Streams
- Add vertical data scrolling on the left and right edges of the ChatBot (e.g., `MEM: 0xFA39`, `CPU: 98%`).

### 2. Typewriter Effect
- AI messages reveal text character by character with a blinking cursor.

### 3. Energy Input & Laser Focus
- The input pill gets a scanning laser line animation when focused.

### 4. Glitch & Punishment System
- If `personality === 'aggressive'`, randomly trigger CSS chromatic aberration and transform shaking on the chat container.

---

## Phase 2: 3D Soul & Voice (Next)

### 5. 3D Hologram Head
- Integrate `@react-three/fiber` to render a floating low-poly wireframe sphere that reacts to `isLoading`.

### 6. Voice (Web Speech API)
- Add a mic button for Speech-to-Text and auto-play TTS when the AI responds.

### 7. Floating Particle Context
- Image upload triggers an animation where the thumbnail dissolves into particles flowing into the AI header.

---

## Phase 3: The Brain & Autonomy (Final)

### 8. Context-Awareness
- Pass active tab and DXF/GCode data summaries silently into the chat context.

### 9. Agentic Co-pilot
- Use Gemini `tools` (Function Declarations) to let AI call UI functions (e.g., `triggerNesting()`).

### 10. Local AI (Ollama)
- Add a toggle in settings to switch endpoint from `generativelanguage.googleapis.com` to `localhost:11434`.
