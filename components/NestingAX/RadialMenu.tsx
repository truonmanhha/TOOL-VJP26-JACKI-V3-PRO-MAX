import React, { useEffect, useRef, useCallback } from 'react';

interface RadialMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onSelectTool?: (toolName: string) => void;
}

// ============================================================
// RADIAL MENU — ALPHACAM SCIFI THEME
// Ported từ HTML/CSS/JS thuần sang React TSX
// ============================================================

const MENU_DATA = [
  { name: "Vẽ (Draw)", icon: "icon-draw", action: null, color: "#00E5FF", sub: [
    { name: "Đoạn thẳng", icon: "icon-line", action: "line", color: "#00E5FF" },
    { name: "Đa tuyến", icon: "icon-polyline", action: "polyline", color: "#1DE9B6" },
    { name: "Spline", icon: "icon-spline", action: "spline", color: "#00B0FF" },
    { name: "Đường tròn", icon: "icon-circle", action: "circle", color: "#2979FF" },
    { name: "Cung tròn", icon: "icon-arc", action: "arc", color: "#651FFF" },
    { name: "chữ nhật", icon: "icon-rect", action: "rect", color: "#D500F9" },
    { name: "Đa giác", icon: "icon-poly", action: "polygon", color: "#F50057" },
    { name: "Điểm/Tâm", icon: "icon-point", action: "point", color: "#FF1744" },
    { name: "Văn bản", icon: "icon-text", action: "text", color: "#FFEA00" }
  ]},
  { name: "Lớp (Layers)", icon: "icon-layer", action: "layer_panel", color: "#FFD600", sub: null },
  { name: "Xóa (Del)", icon: "icon-del", action: "delete", color: "#FF1744", sub: null },
  { name: "Chỉnh sửa", icon: "icon-edit", action: null, color: "#00E676", sub: [
    { name: "Di chuyển", icon: "icon-move", action: "move", color: "#00E676" },
    { name: "Sao chép", icon: "icon-copy", action: "copy", color: "#69F0AE" },
    { name: "Xoay", icon: "icon-rotate", action: "rotate", color: "#B2FF59" },
    { name: "Đối xứng", icon: "icon-mirror", action: "mirror", color: "#EEFF41" },
    { name: "Offset", icon: "icon-offset", action: "offset", color: "#C6FF00" },
    { name: "Kéo giãn", icon: "icon-stretch", action: "stretch", color: "#AEEA00" },
    { name: "Nối", icon: "icon-join", action: "join", color: "#76FF03" }
  ]},
  { name: "Tiện ích", icon: "icon-tool", action: null, color: "#FF9100", sub: [
    { name: "Nối", icon: "icon-join", action: "join", color: "#76FF03" },
    { name: "Đo đạc", icon: "icon-measure", action: null, color: "#FFAB00", sub: [
      { name: "Thủ công", icon: "icon-measure", action: "measure", color: "#FFAB00" },
      { name: "Đo nhanh", icon: "icon-rect", action: "measure_quick", color: "#00E676" }
    ]},
    { name: "Bán kính", icon: "icon-radius", action: "measure_radius", color: "#FFD740" },
    { name: "Góc", icon: "icon-angle", action: "measure_angle", color: "#FFE57F" },
    { name: "Diện tích", icon: "icon-area", action: "measure_area", color: "#FFF8E1" },
    { name: "Ghi chú", icon: "icon-note", action: "note", color: "#FFC400" },
    { name: "Giảm Lag", icon: "icon-zap", action: "lag_reduce", color: "#FFD700" }
  ]},
  { name: "Zoom Fit", icon: "icon-zoom", action: "zoom_fit", color: "#40C4FF", sub: null },
  { name: "Redo", icon: "icon-redo", action: "redo", color: "#B0BEC5", sub: null },
  { name: "Undo", icon: "icon-undo", action: "undo", color: "#90A4AE", sub: null },
  { name: "Pháo Hoa", icon: "icon-firework", action: "fireworks", color: "#FF6B35", sub: null },
  { name: "Auto Fit", icon: "icon-zoom", action: "zoom_fit", color: "#40C4FF", sub: null },
  { name: "Gia công CAM", icon: "icon-cam", action: null, color: "#E040FB", sub: [
    { name: "Chọn dao", icon: "icon-drill", action: "select_tool", color: "#E040FB" },
    { name: "Chạy dao", icon: "icon-toolpath", action: "toolpath", color: "#AA00FF" },
    { name: "Mô phỏng", icon: "icon-sim", action: "simulate", color: "#7C4DFF" }
  ]},
  { name: "View Trước", icon: "icon-front-view", action: "view_front", color: "#18FFFF", sub: null },
  { name: "View Lưng", icon: "icon-back-view", action: "view_back", color: "#84FFFF", sub: null }
];

const RadialMenu: React.FC<RadialMenuProps> = ({ x, y, onClose, onSelectTool }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainSvgRef = useRef<SVGSVGElement>(null);
  const innerLayerRef = useRef<SVGGElement>(null);
  const outerLayersRef = useRef<SVGGElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const typewriterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const builtRef = useRef(false);

  // Keep latest onClose in a ref to avoid stale closure in document listeners
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // ---------------------------------------------------------
  // 1. HỆ THỐNG ÂM THANH (WEB AUDIO API)
  // ---------------------------------------------------------
  const playSound = useCallback((type: 'hover' | 'click' | 'open') => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const audioCtx = audioCtxRef.current;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    if (type === 'hover') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now); osc.stop(now + 0.05);
    } else if (type === 'click') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'open') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(600, now + 0.2);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.05);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now); osc.stop(now + 0.2);
    }
  }, []);

  // ---------------------------------------------------------
  // 2. HIỆU ỨNG NỔ HẠT (PARTICLES)
  // ---------------------------------------------------------
  const spawnParticles = useCallback((px: number, py: number, color: string) => {
    for (let i = 0; i < 12; i++) {
      const p = document.createElement('div');
      p.style.cssText = `
        position:fixed;border-radius:50%;pointer-events:none;z-index:9999;
        background:${color};color:${color};
        left:${px}px;top:${py}px;
        animation:radial-particle-burst 0.6s cubic-bezier(0.175,0.885,0.32,1.275) forwards;
      `;
      const size = Math.random() * 6 + 2;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 80 + 30;
      p.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
      p.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 600);
    }
  }, []);

  // ---------------------------------------------------------
  // 2.5 FIREWORKS EFFECT (Easter Egg)
  // ---------------------------------------------------------
  const spawnFireworks = useCallback((px: number, py: number) => {
    const colors = ['#FF6B35', '#FF8C42', '#FF1744', '#FF3D00', '#FFAB40'];
    // 5 staggered bursts, 150ms apart
    for (let burst = 0; burst < 5; burst++) {
      setTimeout(() => {
        for (let i = 0; i < 30; i++) {
          const p = document.createElement('div');
          const color = colors[Math.floor(Math.random() * colors.length)];
          p.style.cssText = `
            position:fixed;border-radius:50%;pointer-events:none;z-index:9999;
            background:${color};color:${color};
            left:${px}px;top:${py}px;
            animation:radial-firework-burst 1.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards;
            box-shadow:0 0 10px ${color}, 0 0 20px ${color};
          `;
          const size = Math.random() * 8 + 3;
          p.style.width = size + 'px';
          p.style.height = size + 'px';
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * 120 + 40;
          p.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
          p.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
          document.body.appendChild(p);
          setTimeout(() => p.remove(), 1500);
        }
      }, burst * 150);
    }
  }, []);

  // ---------------------------------------------------------
  // 3. TYPEWRITER + CENTER DISPLAY
  // ---------------------------------------------------------
  const typeWriterEffect = useCallback((text: string, color: string) => {
    const centerText = mainSvgRef.current?.querySelector<SVGTextElement>('#center-display-text');
    const centerBtn = mainSvgRef.current?.querySelector('#center-btn');
    if (!centerText) return;

    centerBtn?.classList.add('has-info');
    centerText.style.fill = color;
    centerText.textContent = '';

    if (typewriterTimeoutRef.current) clearTimeout(typewriterTimeoutRef.current);
    let i = 0;
    const type = () => {
      if (i < text.length) {
        centerText.textContent += text.charAt(i);
        i++;
        typewriterTimeoutRef.current = setTimeout(type, 30);
      }
    };
    type();
  }, []);

  const clearCenterText = useCallback(() => {
    if (typewriterTimeoutRef.current) clearTimeout(typewriterTimeoutRef.current);
    const centerText = mainSvgRef.current?.querySelector<SVGTextElement>('#center-display-text');
    const centerBtn = mainSvgRef.current?.querySelector('#center-btn');
    if (centerText) centerText.textContent = '';
    centerBtn?.classList.remove('has-info');
  }, []);

  // ---------------------------------------------------------
  // 4. PARALLAX 3D
  // ---------------------------------------------------------
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !mainSvgRef.current) return;
      const menuCenterX = x;
      const menuCenterY = y;
      const dx = e.pageX - menuCenterX;
      const dy = e.pageY - menuCenterY;
      const rotateX = -(dy / 25);
      const rotateY = (dx / 25);
      mainSvgRef.current.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [x, y]);

  // ---------------------------------------------------------
  // 5. HELPER: TẠO PATH HÌNH CÁNH QUẠT
  // ---------------------------------------------------------
  const createPath = (cx: number, cy: number, rIn: number, rOut: number, startDeg: number, endDeg: number) => {
    const rad = Math.PI / 180;
    const gap = 0.5;
    const sDeg = startDeg + gap;
    const eDeg = endDeg - gap;
    const x1 = cx + rIn * Math.cos(sDeg * rad);
    const y1 = cy + rIn * Math.sin(sDeg * rad);
    const x2 = cx + rOut * Math.cos(sDeg * rad);
    const y2 = cy + rOut * Math.sin(sDeg * rad);
    const x3 = cx + rOut * Math.cos(eDeg * rad);
    const y3 = cy + rOut * Math.sin(eDeg * rad);
    const x4 = cx + rIn * Math.cos(eDeg * rad);
    const y4 = cy + rIn * Math.sin(eDeg * rad);
    return `M ${x1} ${y1} L ${x2} ${y2} A ${rOut} ${rOut} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${rIn} ${rIn} 0 0 0 ${x1} ${y1} Z`;
  };

  // ---------------------------------------------------------
  // 6. BUILD MENU (DOM imperative — 3-ring support)
  // ---------------------------------------------------------
  const buildMenu = useCallback(() => {
    const svg = mainSvgRef.current;
    const innerLayer = innerLayerRef.current;
    const outerLayers = outerLayersRef.current;
    if (!svg || !innerLayer || !outerLayers) return;

    innerLayer.innerHTML = '';
    outerLayers.innerHTML = '';

    const NS = 'http://www.w3.org/2000/svg';
    const XLINK = 'http://www.w3.org/1999/xlink';

    let dynamicClips = svg.querySelector<SVGDefsElement>('#dynamic-clips');
    if (!dynamicClips) {
      dynamicClips = document.createElementNS(NS, 'defs') as SVGDefsElement;
      dynamicClips.id = 'dynamic-clips';
      svg.prepend(dynamicClips);
    }
    dynamicClips.innerHTML = '';

    const angleStep = 360 / MENU_DATA.length;
    MENU_DATA.forEach((item, i) => {
      const startAngle = i * angleStep - 105;
      const endAngle = startAngle + angleStep;
      const midRad = (startAngle + (angleStep / 2)) * (Math.PI / 180);

      // ---- OUTER GROUP (level 2 sub-menu) ----
      const outerGroup = document.createElementNS(NS, 'g');
      outerGroup.setAttribute('class', 'outer-group');

      if (item.sub) {
        const step = 26;
        const arcSpan = (item.sub.length - 1) * step;
        const subStartBase = startAngle + 15 - (arcSpan / 2);

        item.sub.forEach((sub: any, sIdx: number) => {
          const sStart = subStartBase + (sIdx * step) - 13;
          const sEnd = sStart + 26;
          const sMidRad = (sStart + 13) * (Math.PI / 180);

          // ---- OUTER-OUTER GROUP (level 3 sub-sub-menu) ----
          let outerOuterGroup: SVGGElement | null = null;
          if (sub.sub && Array.isArray(sub.sub)) {
            outerOuterGroup = document.createElementNS(NS, 'g');
            outerOuterGroup.setAttribute('class', 'outer-outer-group');

            const ssStep = 26;
            const ssArcSpan = (sub.sub.length - 1) * ssStep; // Cung trải dài từ tâm nút con đầu đến tâm nút con cuối
            const sCenter = sStart + 13; // Trục giữa của nút cha (vòng 2)
            const ssStartBase = sCenter - (ssArcSpan / 2); // Tọa độ Tâm của nút con đầu tiên

            sub.sub.forEach((ssItem: any, ssIdx: number) => {
              // Điểm bắt đầu vẽ Path = Tâm nút con hiện tại trừ đi nửa độ rộng (-13)
              const ssStart = ssStartBase + (ssIdx * ssStep) - 13;
              const ssEnd = ssStart + 26;
              const ssMidRad = (ssStart + 13) * (Math.PI / 180);

              const ssGroup = document.createElementNS(NS, 'g');
              ssGroup.style.cursor = 'pointer';
              ssGroup.style.setProperty('--dx', `${Math.cos(ssMidRad) * 45}px`);
              ssGroup.style.setProperty('--dy', `${Math.sin(ssMidRad) * 45}px`);
              ssGroup.style.setProperty('--hover-color', ssItem.color || '#ffffff');

              const ssPathStr = createPath(350, 350, 230, 305, ssStart, ssEnd);

              const ssClipId = `clip-subsub-${i}-${sIdx}-${ssIdx}`;
              const ssClipPath = document.createElementNS(NS, 'clipPath');
              ssClipPath.id = ssClipId;
              const ssClipShape = document.createElementNS(NS, 'path');
              ssClipShape.setAttribute('d', ssPathStr);
              ssClipPath.appendChild(ssClipShape);
              dynamicClips!.appendChild(ssClipPath);

              const ssPath = document.createElementNS(NS, 'path');
              ssPath.setAttribute('d', ssPathStr);
              ssPath.setAttribute('class', 'sector outer-outer');
              ssPath.setAttribute('pathLength', '100');

              const ssIconX = 350 + 267 * Math.cos(ssMidRad);
              const ssIconY = 350 + 267 * Math.sin(ssMidRad);

              const ssIcon = document.createElementNS(NS, 'use');
              ssIcon.setAttributeNS(XLINK, 'href', `#${ssItem.icon}`);
              ssIcon.setAttribute('x', String(ssIconX));
              ssIcon.setAttribute('y', String(ssIconY));
              ssIcon.setAttribute('class', 'menu-icon outer-outer-icon');
              ssIcon.style.transformOrigin = `${ssIconX}px ${ssIconY}px`;
              ssIcon.style.transitionDelay = `${ssIdx * 0.03 + 0.15}s`;

              const ssAmongUsWrapper = document.createElementNS(NS, 'g');
              ssAmongUsWrapper.setAttribute('clip-path', `url(#${ssClipId})`);
              ssAmongUsWrapper.setAttribute('class', 'among-us-clip-wrapper');

              const ssAmongUs = document.createElementNS(NS, 'use');
              ssAmongUs.setAttributeNS(XLINK, 'href', '#icon-among-us');
              ssAmongUs.setAttribute('x', String(ssIconX));
              ssAmongUs.setAttribute('y', String(ssIconY));
              ssAmongUs.setAttribute('class', 'among-us-icon-sector');
              ssAmongUs.style.transformOrigin = `${ssIconX}px ${ssIconY}px`;
              ssAmongUsWrapper.appendChild(ssAmongUs);

              ssGroup.onmouseenter = () => {
                playSound('hover');
                typeWriterEffect(ssItem.name.toUpperCase(), ssItem.color);
                subPath.classList.add('highlight');
                // KHÔNG add show ở đây — chỉ level 2 (subGroup) mới được quyền show level 3
              };
              ssGroup.onmouseleave = () => {
                clearCenterText();
                subPath.classList.remove('highlight');
              };
              ssGroup.onclick = (e: MouseEvent) => {
                e.stopPropagation();
                playSound('click');
                spawnParticles(e.pageX, e.pageY, ssItem.color);
                if (ssItem.action && onSelectTool) onSelectTool(ssItem.action);
                setTimeout(() => onClose(), 200);
              };

              ssGroup.appendChild(ssPath);
              ssGroup.appendChild(ssAmongUsWrapper);
              ssGroup.appendChild(ssIcon);
              outerOuterGroup!.appendChild(ssGroup);
            });

            // Append level 3 group to outerLayers (before outerGroup so z-order is correct)
            outerLayers.appendChild(outerOuterGroup);

            outerOuterGroup.onmouseleave = (e: MouseEvent) => {
              const related = e.relatedTarget as Element | null;
              const isMovingToParentSub = related && subGroup.contains(related);
              if (!isMovingToParentSub) {
                outerOuterGroup!.classList.remove('show');
                subPath.classList.remove('highlight');
              }
            };
          }

          const subGroup = document.createElementNS(NS, 'g');
          subGroup.style.cursor = 'pointer';
          subGroup.style.setProperty('--dx', `${Math.cos(sMidRad) * 45}px`);
          subGroup.style.setProperty('--dy', `${Math.sin(sMidRad) * 45}px`);
          subGroup.style.setProperty('--hover-color', sub.color || '#ffffff');

          const subPathStr = createPath(350, 350, 140, 225, sStart, sEnd);

          const subClipId = `clip-sub-${i}-${sIdx}`;
          const subClipPath = document.createElementNS(NS, 'clipPath');
          subClipPath.id = subClipId;
          const subClipShape = document.createElementNS(NS, 'path');
          subClipShape.setAttribute('d', subPathStr);
          subClipPath.appendChild(subClipShape);
          dynamicClips!.appendChild(subClipPath);

          const subPath = document.createElementNS(NS, 'path');
          subPath.setAttribute('d', subPathStr);
          subPath.setAttribute('class', 'sector outer');
          subPath.setAttribute('pathLength', '100');

          const iconX = 350 + 182 * Math.cos(sMidRad);
          const iconY = 350 + 182 * Math.sin(sMidRad);

          const subIcon = document.createElementNS(NS, 'use');
          subIcon.setAttributeNS(XLINK, 'href', `#${sub.icon}`);
          subIcon.setAttribute('x', String(iconX));
          subIcon.setAttribute('y', String(iconY));
          subIcon.setAttribute('class', 'menu-icon outer-icon');
          subIcon.style.transformOrigin = `${iconX}px ${iconY}px`;
          subIcon.style.transitionDelay = `${sIdx * 0.03 + 0.1}s`;

          const subAmongUsWrapper = document.createElementNS(NS, 'g');
          subAmongUsWrapper.setAttribute('clip-path', `url(#${subClipId})`);
          subAmongUsWrapper.setAttribute('class', 'among-us-clip-wrapper');

          const subAmongUs = document.createElementNS(NS, 'use');
          subAmongUs.setAttributeNS(XLINK, 'href', '#icon-among-us');
          subAmongUs.setAttribute('x', String(iconX));
          subAmongUs.setAttribute('y', String(iconY));
          subAmongUs.setAttribute('class', 'among-us-icon-sector');
          subAmongUs.style.transformOrigin = `${iconX}px ${iconY}px`;
          subAmongUsWrapper.appendChild(subAmongUs);

          // Hover logic for level 2 items — show level 3 if sub.sub exists
          subGroup.onmouseenter = () => {
            playSound('hover');
            typeWriterEffect(sub.name.toUpperCase(), sub.color);

            // Hide all level 3 groups
            outerLayers.querySelectorAll('.outer-outer-group').forEach(oog => oog.classList.remove('show'));
            // Remove highlight from all level 2 sectors
            outerGroup.querySelectorAll('.sector.outer').forEach(s => s.classList.remove('highlight'));

            // If this level 2 item has sub (level 3), show it
            if (outerOuterGroup) {
              outerOuterGroup.classList.add('show');
              subPath.classList.add('highlight');
            }
          };
          subGroup.onmouseleave = (e: MouseEvent) => {
            clearCenterText();
            if (outerOuterGroup) {
              const related = e.relatedTarget as Element | null;
              const isMovingToLevel3 = related && outerOuterGroup.contains(related);
              if (!isMovingToLevel3) {
                outerOuterGroup.classList.remove('show');
                subPath.classList.remove('highlight');
              }
            }
          };
          subGroup.onclick = (e: MouseEvent) => {
            e.stopPropagation();
            // Only fire action if this item has a direct action (no sub)
            if (sub.action && !sub.sub) {
              playSound('click');
              spawnParticles(e.pageX, e.pageY, sub.color);
              if (onSelectTool) onSelectTool(sub.action);
              setTimeout(() => onClose(), 200);
            }
          };

          subGroup.appendChild(subPath);
          subGroup.appendChild(subAmongUsWrapper);
          subGroup.appendChild(subIcon);
          outerGroup.appendChild(subGroup);
        });
      }
      outerLayers.appendChild(outerGroup);

      // ---- INNER GROUP (level 1 main item) ----
      const g = document.createElementNS(NS, 'g');
      g.style.setProperty('--dx', `${Math.cos(midRad) * 45}px`);
      g.style.setProperty('--dy', `${Math.sin(midRad) * 45}px`);
      g.style.setProperty('--hover-color', item.color || '#ffffff');

      const pathStr = createPath(350, 350, 65, 135, startAngle, endAngle);

      const clipId = `clip-main-${i}`;
      const clipPath = document.createElementNS(NS, 'clipPath');
      clipPath.id = clipId;
      const clipShape = document.createElementNS(NS, 'path');
      clipShape.setAttribute('d', pathStr);
      clipPath.appendChild(clipShape);
      dynamicClips!.appendChild(clipPath);

      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', pathStr);
      path.setAttribute('class', 'sector');
      path.setAttribute('pathLength', '100');
      path.style.transitionDelay = `${i * 0.02}s`;

      const iconX = 350 + 100 * Math.cos(midRad);
      const iconY = 350 + 100 * Math.sin(midRad);

      const use = document.createElementNS(NS, 'use');
      use.setAttributeNS(XLINK, 'href', `#${item.icon}`);
      use.setAttribute('x', String(iconX));
      use.setAttribute('y', String(iconY));
      use.setAttribute('class', 'menu-icon');
      use.style.transformOrigin = `${iconX}px ${iconY}px`;
      use.style.transitionDelay = `${i * 0.02 + 0.08}s`;

      const amongUsWrapper = document.createElementNS(NS, 'g');
      amongUsWrapper.setAttribute('clip-path', `url(#${clipId})`);
      amongUsWrapper.setAttribute('class', 'among-us-clip-wrapper');

      const amongUs = document.createElementNS(NS, 'use');
      amongUs.setAttributeNS(XLINK, 'href', '#icon-among-us');
      amongUs.setAttribute('x', String(iconX));
      amongUs.setAttribute('y', String(iconY));
      amongUs.setAttribute('class', 'among-us-icon-sector');
      amongUs.style.transformOrigin = `${iconX}px ${iconY}px`;
      amongUsWrapper.appendChild(amongUs);

      g.onmouseenter = () => {
        playSound('hover');
        typeWriterEffect(item.name.toUpperCase(), item.color);

        // Hide all level 2 and level 3 groups
        outerLayers.querySelectorAll('.outer-group').forEach(og => og.classList.remove('show'));
        outerLayers.querySelectorAll('.outer-outer-group').forEach(oog => oog.classList.remove('show'));
        svg.querySelectorAll('.sector').forEach(s => s.classList.remove('highlight'));

        if (item.sub) {
          outerGroup.classList.add('show');
          path.classList.add('highlight');
        }
      };

      g.onmouseleave = clearCenterText;
      g.onclick = (e) => {
        e.stopPropagation();
        if (item.action && !item.sub) {
          playSound('click');
          spawnParticles(e.pageX, e.pageY, item.color);
          if (onSelectTool) {
            onSelectTool(item.action);
          }
          setTimeout(() => onClose(), 200);
        }
      };

      g.appendChild(path);
      g.appendChild(amongUsWrapper);
      g.appendChild(use);
      innerLayer.appendChild(g);
    });
  }, [playSound, typeWriterEffect, clearCenterText, spawnParticles, spawnFireworks, onSelectTool, onClose]);

  // ---------------------------------------------------------
  // 7. LIFECYCLE: mount → build → activate
  // ---------------------------------------------------------
  useEffect(() => {
    if (builtRef.current) return;
    builtRef.current = true;

    // Inject CSS vào document nếu chưa có
    const styleId = 'radial-menu-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = RADIAL_MENU_CSS;
      document.head.appendChild(style);
    }

    buildMenu();
    playSound('open');

    // Kích hoạt active sau 1 frame
    requestAnimationFrame(() => {
      containerRef.current?.classList.add('active');
      mainSvgRef.current?.classList.add('glitch-effect');
    });

    // Center button click
    const centerBtn = mainSvgRef.current?.querySelector<SVGGElement>('#center-btn');
    if (centerBtn) {
      centerBtn.onclick = (e) => {
        e.stopPropagation();
        playSound('click');
        onClose();
      };
    }

    // Escape key to close
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (typewriterTimeoutRef.current) clearTimeout(typewriterTimeoutRef.current);
    };
  }, [])

  // Handle clicks on the container/SVG empty areas (between sectors)
  // Sector click handlers call e.stopPropagation(), so only empty-area clicks reach here
  const handleContainerClick = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      id="radial-menu-container"
      onClick={handleContainerClick}
      style={{ left: x - 350, top: y - 350 }}
    >
      <svg
        ref={mainSvgRef}
        className="radial-svg"
        viewBox="0 0 700 700"
        id="main-svg"
        style={{ transformStyle: 'preserve-3d', transition: 'transform 0.1s ease-out' }}
      >
        <defs id="static-defs">
          <clipPath id="center-clip"><circle cx="350" cy="350" r="48" /></clipPath>

          {/* BIỂU TƯỢNG AMONG US */}
          <g id="icon-among-us">
            <g transform="translate(-18, -18) scale(0.85)">
              <path fill="var(--hover-color, #e53935)" d="M38.67,42H11.52C11.27,40.62,11,38.57,11,36c0-5,0-11,0-11s1.44-7.39,3.22-9.59 c1.67-2.06,2.76-3.48,6.78-4.41c3-0.7,7.13-0.23,9,1c2.15,1.42,3.37,6.67,3.81,11.29c1.49-0.3,5.21,0.2,5.5,1.28 C40.89,30.29,39.48,38.31,38.67,42z"/>
              <path fill="#000000" opacity="0.25" d="M39.02,42H11.99c-0.22-2.67-0.48-7.05-0.49-12.72c0.83,4.18,1.63,9.59,6.98,9.79 c3.48,0.12,8.27,0.55,9.83-2.45c1.57-3,3.72-8.95,3.51-15.62c-0.19-5.84-1.75-8.2-2.13-8.7c0.59,0.66,3.74,4.49,4.01,11.7 c0.03,0.83,0.06,1.72,0.08,2.66c4.21-0.15,5.93,1.5,6.07,2.35C40.68,33.85,39.8,38.9,39.02,42z"/>
              <path fill="#212121" d="M35,27.17c0,3.67-0.28,11.2-0.42,14.83h-2C32.72,38.42,33,30.83,33,27.17 c0-5.54-1.46-12.65-3.55-14.02c-1.65-1.08-5.49-1.48-8.23-0.85c-3.62,0.83-4.57,1.99-6.14,3.92L15,16.32 c-1.31,1.6-2.59,6.92-3,8.96v10.8c0,2.58,0.28,4.61,0.54,5.92H10.5c-0.25-1.41-0.5-3.42-0.5-5.92l0.02-11.09 c0.15-0.77,1.55-7.63,3.43-9.94l0.08-0.09c1.65-2.03,2.96-3.63,7.25-4.61c3.28-0.76,7.67-0.25,9.77,1.13 C33.79,13.6,35,22.23,35,27.17z"/>
              <path fill="#01579b" d="M17.165,17.283c5.217-0.055,9.391,0.283,9,6.011c-0.391,5.728-8.478,5.533-9.391,5.337 c-0.913-0.196-7.826-0.043-7.696-5.337C9.209,18,13.645,17.32,17.165,17.283z"/>
              <path fill="#212121" d="M40.739,37.38c-0.28,1.99-0.69,3.53-1.22,4.62h-2.43c0.25-0.19,1.13-1.11,1.67-4.9 c0.57-4-0.23-11.79-0.93-12.78c-0.4-0.4-2.63-0.8-4.37-0.89l0.1-1.99c1.04,0.05,4.53,0.31,5.71,1.49 C40.689,24.36,41.289,33.53,40.739,37.38z"/>
              <path fill="#81d4fa" d="M10.154,20.201c0.261,2.059-0.196,3.351,2.543,3.546s8.076,1.022,9.402-0.554 c1.326-1.576,1.75-4.365-0.891-5.267C19.336,17.287,12.959,16.251,10.154,20.201z"/>
              <path fill="#212121" d="M17.615,29.677c-0.502,0-0.873-0.03-1.052-0.069c-0.086-0.019-0.236-0.035-0.434-0.06 c-5.344-0.679-8.053-2.784-8.052-6.255c0.001-2.698,1.17-7.238,8.986-7.32l0.181-0.002c3.444-0.038,6.414-0.068,8.272,1.818 c1.173,1.191,1.712,3,1.647,5.53c-0.044,1.688-0.785,3.147-2.144,4.217C22.785,29.296,19.388,29.677,17.615,29.677z M17.086,17.973 c-7.006,0.074-7.008,4.023-7.008,5.321c-0.001,3.109,3.598,3.926,6.305,4.27c0.273,0.035,0.48,0.063,0.601,0.089 c0.563,0.101,4.68,0.035,6.855-1.732c0.865-0.702,1.299-1.57,1.326-2.653c0.051-1.958-0.301-3.291-1.073-4.075 c-1.262-1.281-3.834-1.255-6.825-1.222L17.086,17.973z"/>
              <path fill="#e1f5fe" d="M15.078,19.043c1.957-0.326,5.122-0.529,4.435,1.304c-0.489,1.304-7.185,2.185-7.185,0.652 C12.328,19.467,15.078,19.043,15.078,19.043z"/>
            </g>
          </g>

          {/* Icons SVG */}
          <g id="icon-draw"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></g></g>
          <g id="icon-line"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="19" x2="19" y2="5"/><circle cx="5" cy="19" r="1.5" fill="currentColor"/><circle cx="19" cy="5" r="1.5" fill="currentColor"/></g></g>
          <g id="icon-polyline"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,17 9,11 15,16 21,8"/><circle cx="9" cy="11" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="16" r="1.5" fill="currentColor" stroke="none"/></g></g>
          <g id="icon-spline"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3,17 C8,5 16,23 21,7"/></g></g>
          <g id="icon-circle"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></g></g>
          <g id="icon-arc"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4,16 A10,10 0 0,1 20,16"/><circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none"/><line x1="12" y1="16" x2="12" y2="14" strokeDasharray="1 2"/></g></g>
          <g id="icon-rect"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="1"/></g></g>
          <g id="icon-poly"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12,2 20.66,7 20.66,17 12,22 3.34,17 3.34,7"/></g></g>
          <g id="icon-point"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" fill="currentColor"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></g></g>
          <g id="icon-text"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4,7 4,4 20,4 20,7"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="9" y1="20" x2="15" y2="20"/></g></g>
          <g id="icon-edit"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></g></g>
          <g id="icon-move"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="5,9 2,12 5,15"/><polyline points="9,5 12,2 15,5"/><polyline points="19,9 22,12 19,15"/><polyline points="9,19 12,22 15,19"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></g></g>
          <g id="icon-copy"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></g></g>
          <g id="icon-rotate"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><polyline points="21,3 21,8 16,8"/></g></g>
          <g id="icon-mirror"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22" strokeDasharray="4 4"/><polygon points="10,6 2,12 10,18" fill="currentColor" stroke="none"/><polygon points="14,6 22,12 14,18" fill="none"/></g></g>
          <g id="icon-offset"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 20 A16 16 0 0 0 6 4"/><path d="M22 14 A10 10 0 0 0 12 4" strokeDasharray="3 3"/><path d="M22 8 A4 4 0 0 0 18 4"/></g></g>
          <g id="icon-stretch"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" strokeDasharray="2 2"/><polyline points="14,22 22,22 22,14" stroke="#e74c3c"/><line x1="22" y1="22" x2="16" y2="16" stroke="#e74c3c"/><rect x="4" y="4" width="8" height="8" rx="1"/></g></g>
          <g id="icon-layer"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12,2 22,7 12,12 2,7" fill="rgba(255,255,255,0.1)"/><polyline points="2,12 12,17 22,12"/><polyline points="2,17 12,22 22,17"/></g></g>
          <g id="icon-del"><g transform="translate(-12, -12)" fill="none" stroke="#ff4757" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19,6 v14 a2,2 0 0,1 -2,2 H7 a2,2 0 0,1 -2,-2 V6 m3,0 V4 a2,2 0 0,1 2,-2 h4 a2,2 0 0,1 2,2 v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></g></g>
          <g id="icon-zoom"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4,2 2,2 2,4"/><polyline points="20,2 22,2 22,4"/><polyline points="4,22 2,22 2,20"/><polyline points="20,22 22,22 22,20"/><polyline points="8,6 2,2"/><polyline points="16,6 22,2"/><polyline points="8,18 2,22"/><polyline points="16,18 22,22"/><rect x="6" y="6" width="12" height="12" rx="1" strokeDasharray="3 2" opacity="0.5"/></g></g>
          <g id="icon-undo"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></g></g>
          <g id="icon-redo"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></g></g>
          <g id="icon-3d"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></g></g>
          <g id="icon-cam"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2h4v6h-4z"/><path d="M9 8h6v8l-3 6-3-6z" fill="currentColor" fillOpacity="0.2"/><line x1="9" y1="11" x2="15" y2="14"/><line x1="9" y1="14" x2="15" y2="17"/></g></g>
          <g id="icon-drill"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2h4v6h-4z"/><path d="M9 8h6v8l-3 6-3-6z"/><line x1="9" y1="11" x2="15" y2="14"/></g></g>
          <g id="icon-toolpath"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3-6 4 12 3-6h4"/></g></g>
          <g id="icon-sim"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor" fillOpacity="0.2"/></g></g>
          <g id="icon-tool"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></g></g>
          <g id="icon-measure"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 19.5L19.5 2l2.5 2.5L4.5 22 2 19.5z"/><path d="M6.5 15l2-2"/><path d="M10.5 11l2-2"/><path d="M14.5 7l2-2"/></g></g>
          <g id="icon-note"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></g></g>
          <g id="icon-zap"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></g></g>
          <g id="icon-front-view"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" fillOpacity="0.2"/><rect x="4" y="4" width="16" height="16" rx="2"/></g></g>
          <g id="icon-back-view"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" strokeDasharray="2 2"/></g></g>
          <g id="icon-firework"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M12 2v8 m8-4h-8 m4-8v8 m4-4h-8" opacity="0.6"/><circle cx="6" cy="8" r="1.5" fill="currentColor" opacity="0.7"/><circle cx="18" cy="8" r="1.5" fill="currentColor" opacity="0.7"/><circle cx="8" cy="18" r="1.5" fill="currentColor" opacity="0.7"/><circle cx="16" cy="18" r="1.5" fill="currentColor" opacity="0.7"/></g></g>
          <g id="icon-join"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="12" r="2" fill="currentColor"/><circle cx="18" cy="12" r="2" fill="currentColor"/><line x1="8" y1="12" x2="16" y2="12"/></g></g>
          <g id="icon-radius"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="12" x2="21" y2="12"/><circle cx="21" cy="12" r="1.5" fill="currentColor"/></g></g>
          <g id="icon-angle"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="4"/><line x1="12" y1="4" x2="20" y2="12"/><path d="M12 8 A4 4 0 0 1 16.83 13.17" fill="none"/><text x="15" y="15" fontSize="2" fill="currentColor">θ</text></g></g>
          <g id="icon-area"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18" strokeDasharray="2 2"/><path d="M3 15h18" strokeDasharray="2 2"/></g></g>
        </defs>

        {/* RADAR RINGS */}
        <g id="radar-layer">
          <circle cx="350" cy="350" r="310" className="radar-ring radar-4" />
          <circle cx="350" cy="350" r="280" className="radar-ring radar-1" />
          <circle cx="350" cy="350" r="240" className="radar-ring radar-2" strokeWidth="2" />
          <circle cx="350" cy="350" r="160" className="radar-ring radar-3" />
        </g>

        <g ref={outerLayersRef} id="outer-layers"></g>
        <g ref={innerLayerRef} id="inner-layer"></g>

        {/* NÚT CLOSE CENTER */}
        <g id="center-btn" style={{ cursor: 'pointer', pointerEvents: 'auto' }}>
          <circle cx="350" cy="350" r="48" className="center-bg"/>
        <g clipPath="url(#center-clip)">
          <g className="among-us-wrapper">
            <use href="#icon-among-us" className="among-us-core" x="0" y="0"/>
          </g>
          <text id="center-display-text" x="350" y="352"></text>
        </g>
        {/* Chữ CLOSE ngoài clipPath để hiển thị được */}
        <foreignObject x="300" y="325" width="100" height="50" style={{ pointerEvents: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div
            // @ts-ignore
            xmlns="http://www.w3.org/1999/xhtml"
            className="cyber-btn-wrapper"
          >
            <div className="cyber-button">
              <span className="actual-text">&nbsp;CLOSE&nbsp;</span>
              <span className="hover-text" aria-hidden="true">&nbsp;CLOSE&nbsp;</span>
            </div>
          </div>
        </foreignObject>
          <circle cx="350" cy="350" r="48" className="center-border" pathLength="100"/>
        </g>
      </svg>
    </div>
  );
};

export default RadialMenu;

// ============================================================
// CSS — INJECT VÀO DOCUMENT (giữ nguyên 100% từ bản gốc)
// ============================================================
const RADIAL_MENU_CSS = `
  #radial-menu-container {
    position: fixed;
    width: 700px;
    height: 700px;
    z-index: 1000;
    pointer-events: none;
    visibility: hidden;
    perspective: 1000px;
  }

  #radial-menu-container.active {
    visibility: visible;
    pointer-events: auto;
  }

  #radial-menu-container .radial-svg {
    width: 100%;
    height: 100%;
    overflow: visible;
    transform-style: preserve-3d;
    transition: transform 0.1s ease-out;
  }

  /* GLITCH */
  .glitch-effect {
    animation: rm-glitch-anim 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  }
  @keyframes rm-glitch-anim {
    0%   { filter: drop-shadow(-5px 0 0 rgba(255,0,0,0.8)) drop-shadow(5px 0 0 rgba(0,255,255,0.8));  transform: scale(0.95) translate(2px,-2px);  }
    20%  { filter: drop-shadow(5px 0 0 rgba(255,0,0,0.8)) drop-shadow(-5px 0 0 rgba(0,255,255,0.8));  transform: scale(1.02) translate(-2px,2px); }
    40%  { filter: drop-shadow(-3px 0 0 rgba(255,0,0,0.8)) drop-shadow(3px 0 0 rgba(0,255,255,0.8));  transform: scale(0.98) translate(1px,-1px); }
    60%  { filter: drop-shadow(2px 0 0 rgba(255,0,0,0.8)) drop-shadow(-2px 0 0 rgba(0,255,255,0.8));  transform: scale(1.01) translate(-1px,1px); }
    80%  { filter: drop-shadow(-1px 0 0 rgba(255,0,0,0.8)) drop-shadow(1px 0 0 rgba(0,255,255,0.8));  transform: scale(0.99) translate(0,0);       }
    100% { filter: none; transform: scale(1) translate(0,0); }
  }

  /* RADAR RINGS */
  #radial-menu-container .radar-ring {
    fill: none;
    stroke: #149CEA;
    opacity: 0;
    transform-origin: 350px 350px;
    transition: opacity 0.5s ease;
  }
  #radial-menu-container.active .radar-ring { opacity: 0.15; }
  #radial-menu-container .radar-1 { stroke-dasharray: 4 8; animation: rm-spin 20s linear infinite; }
  #radial-menu-container .radar-2 { stroke-dasharray: 40 10 5 10; animation: rm-spin-rev 25s linear infinite; opacity: 0.08 !important; }
  #radial-menu-container .radar-3 { stroke-dasharray: 2 15; animation: rm-spin 15s linear infinite; stroke: #00E5FF; }
  #radial-menu-container .radar-4 { stroke-dasharray: 6 12; animation: rm-spin-rev 30s linear infinite; stroke: #FFAB00; opacity: 0.06 !important; }
  @keyframes rm-spin     { 100% { transform: rotate(360deg);  } }
  @keyframes rm-spin-rev { 100% { transform: rotate(-360deg); } }

  /* SECTOR */
  #radial-menu-container .sector {
    fill: rgba(26,32,44,0.85);
    stroke: #149CEA;
    stroke-width: 2;
    stroke-linecap: round;
    cursor: pointer;
    transform-origin: 350px 350px;
    opacity: 0;
    transform: scale(0.5) rotate(-30deg);
    stroke-dasharray: 15 10 35 10 30;
    transition:
      transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275),
      opacity 0.2s ease-out,
      fill 0.4s ease,
      stroke-dasharray 0.5s ease,
      stroke-width 0.4s ease;
  }
  #radial-menu-container.active .sector { opacity: 1; transform: scale(1) rotate(0deg); }

  #radial-menu-container .sector.outer {
    fill: #151b23;
    opacity: 0;
    pointer-events: none;
    transform: scale(0.85);
    transition: all 0.2s ease;
  }
  #radial-menu-container .outer-group { opacity: 0; visibility: hidden; transition: opacity 0.2s, visibility 0.2s; }
  #radial-menu-container .outer-group.show { opacity: 1; visibility: visible; pointer-events: auto; }
  #radial-menu-container .outer-group.show .sector.outer { opacity: 1; transform: scale(1); pointer-events: auto; }

  #radial-menu-container .sector.outer-outer {
    fill: #111820;
    opacity: 0;
    pointer-events: none;
    transform: scale(0.85);
    transition: all 0.2s ease;
  }
  #radial-menu-container .outer-outer-group { opacity: 0; visibility: hidden; pointer-events: none; transition: opacity 0.2s, visibility 0.2s; }
  #radial-menu-container .outer-outer-group.show { opacity: 1; visibility: visible; pointer-events: auto; }
  #radial-menu-container .outer-outer-group.show .sector.outer-outer { opacity: 1; transform: scale(1); pointer-events: auto; }

  #radial-menu-container g:hover > .sector,
  #radial-menu-container .sector.highlight {
    fill: rgba(20,121,234,0.15) !important;
    stroke-dasharray: 100 0;
    stroke-width: 3.5;
    filter: drop-shadow(0 0 10px var(--hover-color, #1479EA));
  }
  #radial-menu-container g:active > .sector { fill: rgba(20,121,234,0.3) !important; }

  /* AMONG US SECTOR ICON */
  #radial-menu-container .among-us-icon-sector {
    opacity: 0;
    transform: translate(calc(var(--dx) * -0.8), calc(var(--dy) * -0.8)) scale(0.2);
    pointer-events: none;
    transition: all 0.5s cubic-bezier(0.34,1.56,0.64,1);
  }
  #radial-menu-container g:hover > .among-us-clip-wrapper > .among-us-icon-sector,
  #radial-menu-container .sector.highlight ~ .among-us-clip-wrapper > .among-us-icon-sector {
    opacity: 0.9 !important;
    transform: translate(0,0) scale(1.6) !important;
    filter: drop-shadow(0 0 15px var(--hover-color));
  }

  /* MENU ICONS */
  #radial-menu-container .menu-icon,
  #radial-menu-container .outer-icon,
  #radial-menu-container .outer-outer-icon {
    opacity: 0;
    transform: scale(0) rotate(180deg);
    pointer-events: none;
    color: #7a8a9e;
    transition: all 0.5s cubic-bezier(0.175,0.885,0.32,1.275);
  }
  #radial-menu-container.active .menu-icon { opacity: 1; transform: scale(1) rotate(0deg); }
  #radial-menu-container .outer-group.show .outer-icon { opacity: 1; transform: scale(1) rotate(0deg); }
  #radial-menu-container .outer-outer-group.show .outer-outer-icon { opacity: 1; transform: scale(1) rotate(0deg); }

  #radial-menu-container g:hover > .menu-icon,
  #radial-menu-container g:hover > .outer-icon,
  #radial-menu-container g:hover > .outer-outer-icon,
  #radial-menu-container .sector.highlight ~ .menu-icon {
    transform: scale(1.3) !important;
    color: var(--hover-color, #ffffff) !important;
    filter: drop-shadow(1px 1px 3px rgba(0,0,0,0.9)) drop-shadow(-1px -1px 3px rgba(0,0,0,0.9)) drop-shadow(0 0 10px var(--hover-color, #ffffff));
    transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1) !important;
  }

  /* CENTER BUTTON */
  #radial-menu-container #center-btn {
    cursor: pointer;
    pointer-events: auto;
    transform-origin: 350px 350px;
    transition: all 100ms ease;
    --hover-color: #ff4757;
  }
  #radial-menu-container #center-btn:active { transform: scale(0.9); }

  #radial-menu-container .center-bg {
    fill: #0d1117;
    transition: 0.5s;
    transform-origin: 350px 350px;
  }
  #radial-menu-container .center-border {
    fill: none;
    stroke: #149CEA;
    stroke-width: 3;
    stroke-dasharray: 20 30 20 30;
    transform-origin: 350px 350px;
    transform: rotate(45deg);
    transition: 0.5s ease-in-out;
    pointer-events: none;
  }

  /* CYBERPUNK TEXT */
  #radial-menu-container .cyber-btn-wrapper {
    width: 100%; height: 100%;
    display: flex; justify-content: center; align-items: center;
  }
  #radial-menu-container .cyber-button {
    margin: 0; padding: 0; border: none; background: transparent;
    --border-right: 4px;
    --text-stroke-color: rgba(255,255,255,0.4);
    --animation-color: #ff4757;
    --fs-size: 16px;
    letter-spacing: 3px;
    font-size: var(--fs-size);
    font-family: monospace;
    font-weight: bold;
    position: relative;
    color: transparent;
    -webkit-text-stroke: 1px var(--text-stroke-color);
    transition: all 0.3s ease;
    pointer-events: none;
  }
  #radial-menu-container .cyber-button .hover-text {
    position: absolute;
    box-sizing: border-box;
    color: var(--animation-color);
    width: 0%;
    inset: 0;
    border-right: var(--border-right) solid var(--animation-color);
    overflow: hidden;
    transition: 0.5s;
    -webkit-text-stroke: 1px var(--animation-color);
    white-space: nowrap;
  }
  #radial-menu-container #center-btn:hover .hover-text {
    width: 100%;
    filter: drop-shadow(0 0 15px var(--animation-color));
  }

  /* AMONG US CENTER */
  #radial-menu-container .among-us-wrapper {
    transform: translate(308px, 331px);
    pointer-events: none;
    opacity: 1;
    transition: opacity 0.3s;
  }
  #radial-menu-container .among-us-core {
    transform-origin: center;
    transform-box: fill-box;
    transition: all 0.5s ease;
  }
  #radial-menu-container #center-btn:hover .center-border {
    stroke-dasharray: 100 0;
    transform: rotate(0deg);
    stroke: #ff4757;
    filter: drop-shadow(0 0 10px #ff4757);
  }
  #radial-menu-container #center-btn:hover .center-bg { fill: rgba(255,71,87,0.15); }
  #radial-menu-container #center-btn:hover .among-us-core { transform: translate(25px,0) scale(3.5); }

  /* HAS-INFO STATE */
  #radial-menu-container.has-info .among-us-wrapper,
  #radial-menu-container.has-info .cyber-button { opacity: 0 !important; transform: scale(0) !important; }

  /* Áp dụng has-info trên center-btn (class được thêm vào #center-btn) */
  #radial-menu-container #center-btn.has-info .among-us-wrapper,
  #radial-menu-container #center-btn.has-info .cyber-button { opacity: 0 !important; }

  /* CENTER DISPLAY TEXT */
  #radial-menu-container #center-display-text {
    font-family: monospace;
    font-weight: bold;
    font-size: 13px;
    letter-spacing: 1px;
    pointer-events: none;
    text-anchor: middle;
    dominant-baseline: middle;
    filter: drop-shadow(0 0 5px currentColor);
  }

  /* PARTICLES */
  @keyframes radial-particle-burst {
    0%   { transform: translate(-50%,-50%) scale(1); opacity:1; box-shadow:0 0 10px currentColor; }
    100% { transform: translate(var(--tx),var(--ty)) scale(0); opacity:0; box-shadow:0 0 20px currentColor; }
  }

  /* FIREWORKS BURST */
  @keyframes radial-firework-burst {
    0%   { transform: translate(-50%,-50%) scale(1); opacity:1; box-shadow:0 0 15px currentColor, 0 0 30px currentColor; }
    50%  { opacity:1; box-shadow:0 0 20px currentColor, 0 0 40px currentColor; }
    100% { transform: translate(var(--tx),var(--ty)) scale(0); opacity:0; box-shadow:0 0 5px currentColor, 0 0 10px currentColor; }
  }
`
