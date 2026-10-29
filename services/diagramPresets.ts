export const DIAGRAM_SVG_PRESETS: Record<string, string> = {
  knee_joint_preset: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" fill="none" stroke="%23334155" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <rect width="800" height="600" fill="%23f8fafc" stroke="none"/>
    <text x="400" y="45" font-size="20" font-weight="bold" fill="%230f172a" text-anchor="middle" font-family="sans-serif">KNEE JOINT CLINICAL ANATOMY TEMPLATE</text>
    <path d="M 330 80 L 330 200 C 330 250, 300 270, 310 300 C 320 330, 360 330, 380 300 C 390 280, 410 280, 420 300 C 440 330, 480 330, 490 300 C 500 270, 470 250, 470 200 L 470 80" fill="%23ffffff" stroke="%23475569" stroke-width="3"/>
    <text x="400" y="150" font-size="14" fill="%2364748b" text-anchor="middle" font-family="sans-serif">FEMUR</text>
    <path d="M 320 350 C 340 335, 370 335, 390 350 C 400 355, 410 355, 420 350 C 440 335, 470 335, 490 350 C 490 380, 460 410, 460 550 L 340 550 C 340 410, 310 380, 320 350 Z" fill="%23ffffff" stroke="%23475569" stroke-width="3"/>
    <text x="400" y="480" font-size="14" fill="%2364748b" text-anchor="middle" font-family="sans-serif">TIBIA</text>
    <path d="M 480 390 C 505 400, 515 440, 515 550 L 490 550 C 490 460, 485 410, 470 395 Z" fill="%23ffffff" stroke="%2364748b" stroke-width="2"/>
    <text x="510" y="480" font-size="11" fill="%2364748b" text-anchor="middle" font-family="sans-serif">FIBULA</text>
    <ellipse cx="400" cy="275" rx="42" ry="48" fill="%23f1f5f9" stroke="%230ea5e9" stroke-width="2.5" stroke-dasharray="4 2"/>
    <text x="400" y="280" font-size="13" font-weight="bold" fill="%230284c7" text-anchor="middle" font-family="sans-serif">PATELLA</text>
    <path d="M 320 330 Q 355 330 365 342" stroke="%2310b981" stroke-width="4"/>
    <text x="250" y="335" font-size="12" fill="%23059669" font-family="sans-serif">Medial Meniscus</text>
    <path d="M 480 330 Q 445 330 435 342" stroke="%2310b981" stroke-width="4"/>
    <text x="500" y="335" font-size="12" fill="%23059669" font-family="sans-serif">Lateral Meniscus</text>
    <line x1="365" y1="310" x2="435" y2="340" stroke="%23f59e0b" stroke-width="3" stroke-dasharray="3 3"/>
    <text x="270" y="270" font-size="11" fill="%23d97706" font-family="sans-serif">ACL (Cruciate)</text>
    <line x1="330" y1="260" x2="330" y2="380" stroke="%23ef4444" stroke-width="3"/>
    <text x="260" y="380" font-size="11" fill="%23dc2626" font-family="sans-serif">MCL</text>
    <line x1="470" y1="260" x2="480" y2="380" stroke="%23ef4444" stroke-width="3"/>
    <text x="495" y="380" font-size="11" fill="%23dc2626" font-family="sans-serif">LCL</text>
  </svg>`,

  spine_column_preset: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" fill="none" stroke="%23334155" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <rect width="800" height="600" fill="%23f8fafc" stroke="none"/>
    <text x="400" y="45" font-size="20" font-weight="bold" fill="%230f172a" text-anchor="middle" font-family="sans-serif">LUMBAR SPINE &amp; DISC CLINICAL TEMPLATE</text>
    <rect x="320" y="90" width="160" height="45" rx="8" fill="%23ffffff" stroke="%23475569" stroke-width="2.5"/>
    <text x="400" y="118" font-size="14" font-weight="bold" fill="%23334155" text-anchor="middle" font-family="sans-serif">L1 Vertebra</text>
    <rect x="330" y="140" width="140" height="18" rx="6" fill="%23e0f2fe" stroke="%230284c7" stroke-width="2"/>
    <text x="510" y="154" font-size="12" fill="%230284c7" font-family="sans-serif">L1-L2 Disc</text>
    <rect x="315" y="163" width="170" height="48" rx="8" fill="%23ffffff" stroke="%23475569" stroke-width="2.5"/>
    <text x="400" y="193" font-size="14" font-weight="bold" fill="%23334155" text-anchor="middle" font-family="sans-serif">L2 Vertebra</text>
    <rect x="325" y="216" width="150" height="18" rx="6" fill="%23e0f2fe" stroke="%230284c7" stroke-width="2"/>
    <text x="510" y="230" font-size="12" fill="%230284c7" font-family="sans-serif">L2-L3 Disc</text>
    <rect x="310" y="239" width="180" height="50" rx="8" fill="%23ffffff" stroke="%23475569" stroke-width="2.5"/>
    <text x="400" y="270" font-size="14" font-weight="bold" fill="%23334155" text-anchor="middle" font-family="sans-serif">L3 Vertebra</text>
    <rect x="320" y="294" width="160" height="20" rx="6" fill="%23e0f2fe" stroke="%230284c7" stroke-width="2"/>
    <text x="510" y="309" font-size="12" fill="%230284c7" font-family="sans-serif">L3-L4 Disc</text>
    <rect x="305" y="319" width="190" height="52" rx="8" fill="%23ffffff" stroke="%23475569" stroke-width="2.5"/>
    <text x="400" y="351" font-size="14" font-weight="bold" fill="%23334155" text-anchor="middle" font-family="sans-serif">L4 Vertebra</text>
    <rect x="315" y="376" width="170" height="22" rx="6" fill="%23fef3c7" stroke="%23f59e0b" stroke-width="2.5"/>
    <text x="510" y="392" font-size="13" font-weight="bold" fill="%23d97706" font-family="sans-serif">L4-L5 Disc (High Stress)</text>
    <rect x="300" y="403" width="200" height="55" rx="8" fill="%23ffffff" stroke="%23475569" stroke-width="2.5"/>
    <text x="400" y="437" font-size="14" font-weight="bold" fill="%23334155" text-anchor="middle" font-family="sans-serif">L5 Vertebra</text>
    <rect x="310" y="463" width="180" height="22" rx="6" fill="%23fee2e2" stroke="%23ef4444" stroke-width="2.5"/>
    <text x="510" y="480" font-size="13" font-weight="bold" fill="%23dc2626" font-family="sans-serif">L5-S1 Lumbosacral Disc</text>
    <polygon points="290,490 510,490 470,570 330,570" fill="%23ffffff" stroke="%23475569" stroke-width="2.5"/>
    <text x="400" y="535" font-size="15" font-weight="bold" fill="%23334155" text-anchor="middle" font-family="sans-serif">SACRUM (S1)</text>
    <line x1="280" y1="90" x2="280" y2="570" stroke="%23cbd5e1" stroke-width="2" stroke-dasharray="4 4"/>
    <text x="250" y="330" font-size="12" fill="%2394a3b8" text-anchor="middle" transform="rotate(-90 250 330)" font-family="sans-serif">Spinal Canal / Thecal Sac</text>
  </svg>`,

  shoulder_joint_preset: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" fill="none" stroke="%23334155" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <rect width="800" height="600" fill="%23f8fafc" stroke="none"/>
    <text x="400" y="45" font-size="20" font-weight="bold" fill="%230f172a" text-anchor="middle" font-family="sans-serif">SHOULDER &amp; ROTATOR CUFF TEMPLATE</text>
    <path d="M 220 120 Q 350 90 480 125" stroke="%23475569" stroke-width="7" fill="none"/>
    <text x="350" y="105" font-size="13" font-weight="bold" fill="%23475569" text-anchor="middle" font-family="sans-serif">CLAVICLE</text>
    <path d="M 480 125 C 530 135 560 160 550 180 C 530 190 490 170 470 175" stroke="%23475569" stroke-width="5" fill="%23ffffff"/>
    <text x="570" y="150" font-size="12" fill="%230284c7" font-family="sans-serif">Acromion</text>
    <circle cx="430" cy="240" r="55" fill="%23ffffff" stroke="%23334155" stroke-width="3"/>
    <path d="M 400 280 C 400 350 390 460 390 560 L 450 560 C 450 460 460 350 460 280" fill="%23ffffff" stroke="%23334155" stroke-width="3"/>
    <text x="425" y="430" font-size="14" font-weight="bold" fill="%2364748b" text-anchor="middle" font-family="sans-serif">HUMERUS</text>
    <path d="M 490 200 C 480 240 480 270 495 290 C 530 330 560 450 520 540 L 480 480 C 510 400 500 300 480 280" fill="%23f1f5f9" stroke="%2364748b" stroke-width="3"/>
    <text x="540" y="380" font-size="14" font-weight="bold" fill="%2364748b" text-anchor="middle" font-family="sans-serif">SCAPULA</text>
    <path d="M 340 180 Q 420 160 450 200" stroke="%23ef4444" stroke-width="5" fill="none"/>
    <text x="330" y="160" font-size="12" font-weight="bold" fill="%23dc2626" font-family="sans-serif">Supraspinatus Tendon</text>
    <path d="M 370 230 C 370 300 380 340 385 410" stroke="%23f59e0b" stroke-width="4" fill="none"/>
    <text x="260" y="310" font-size="12" font-weight="bold" fill="%23d97706" font-family="sans-serif">Biceps Long Head</text>
  </svg>`,

  body_silhouette_preset: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" fill="none" stroke="%23334155" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect width="800" height="600" fill="%23f8fafc" stroke="none"/>
    <text x="400" y="45" font-size="20" font-weight="bold" fill="%230f172a" text-anchor="middle" font-family="sans-serif">ANTERIOR &amp; POSTERIOR CLINICAL SILHOUETTE</text>
    <g transform="translate(140, 70)">
      <text x="120" y="20" font-size="14" font-weight="bold" fill="%23475569" text-anchor="middle">ANTERIOR VIEW</text>
      <circle cx="120" cy="55" r="25" fill="%23ffffff" stroke="%23475569" stroke-width="2.5"/>
      <path d="M 112 80 L 112 95 L 60 120 L 35 240 L 50 245 L 75 145 L 85 240 L 95 480 L 115 480 L 118 270 L 122 270 L 125 480 L 145 480 L 155 240 L 165 145 L 190 245 L 205 240 L 180 120 L 128 95 L 128 80 Z" fill="%23ffffff" stroke="%23475569" stroke-width="2.5"/>
    </g>
    <g transform="translate(420, 70)">
      <text x="120" y="20" font-size="14" font-weight="bold" fill="%23475569" text-anchor="middle">POSTERIOR VIEW</text>
      <circle cx="120" cy="55" r="25" fill="%23ffffff" stroke="%23475569" stroke-width="2.5"/>
      <path d="M 112 80 L 112 95 L 60 120 L 35 240 L 50 245 L 75 145 L 85 240 L 95 480 L 115 480 L 118 270 L 122 270 L 125 480 L 145 480 L 155 240 L 165 145 L 190 245 L 205 240 L 180 120 L 128 95 L 128 80 Z" fill="%23ffffff" stroke="%23475569" stroke-width="2.5"/>
      <line x1="120" y1="95" x2="120" y2="240" stroke="%2394a3b8" stroke-width="2" stroke-dasharray="3 3"/>
    </g>
  </svg>`,
};

