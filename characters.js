/* ────────────────────────────────────────────────────────────
   나비와 몽이 — 공용 그림 정의
   webtoon.html(스크롤판)과 player.html(재생판)이 함께 쓴다.
   <body> 바로 안쪽에서 불러야 한다. 씬 마크업이 파싱되기 전에
   defs가 문서에 들어가야 url(#...) 참조가 처음부터 해석된다.
   ──────────────────────────────────────────────────────────── */
(function () {
  const DEFS = `
<svg class="svg-defs" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs>
  <!-- 손그림 왜곡 (seed를 JS가 계속 갈아끼움) -->
  <filter id="wob1" x="-18%" y="-18%" width="136%" height="136%">
    <feTurbulence class="boil" type="fractalNoise" baseFrequency="0.022" numOctaves="3" seed="2" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="wob2" x="-18%" y="-18%" width="136%" height="136%">
    <feTurbulence class="boil" type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed="9" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="3.5" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="wobBg" x="-10%" y="-10%" width="120%" height="120%">
    <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="5" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G"/>
  </filter>

  <pattern id="crayon" width="7" height="7" patternTransform="rotate(38)" patternUnits="userSpaceOnUse">
    <line x1="0" y1="0" x2="0" y2="7" stroke="#fff" stroke-width="2.6" opacity=".33"/>
  </pattern>

  <linearGradient id="skyAfternoon" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#b6dcf2"/><stop offset="1" stop-color="#ffe6bf"/>
  </linearGradient>
  <linearGradient id="skySunset" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#9d7ec4"/><stop offset=".45" stop-color="#f79b6b"/>
    <stop offset="1" stop-color="#ffd08a"/>
  </linearGradient>
  <linearGradient id="skyMorning" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#8fcdf0"/><stop offset="1" stop-color="#e8f7ff"/>
  </linearGradient>

  <!-- ─── 나비 (고양이) · 원점 = 발밑 중앙 ─── -->
  <g id="def-nabi">
    <g filter="url(#wob1)">
      <g data-p="tail">
        <path d="M64 -48 Q 96 -84 88 -128" fill="none" stroke="#3d3630" stroke-width="21" stroke-linecap="round"/>
        <path d="M64 -48 Q 96 -84 88 -128" fill="none" stroke="#fbe6c0" stroke-width="13" stroke-linecap="round"/>
        <circle cx="89" cy="-130" r="12" fill="#f0a04d" stroke="#3d3630" stroke-width="4"/>
      </g>
      <ellipse cx="-4" cy="-52" rx="73" ry="53" fill="#fbe6c0"/>
      <ellipse cx="16" cy="-43" rx="31" ry="23" fill="#f0a04d" opacity=".7"/>
      <ellipse cx="0" cy="-55" rx="71" ry="51" fill="none" stroke="#3d3630" stroke-width="6"/>
      <ellipse cx="-31" cy="-6" rx="16" ry="12" fill="#fbe6c0" stroke="#3d3630" stroke-width="5"/>
      <ellipse cx="31" cy="-4" rx="16" ry="12" fill="#fbe6c0" stroke="#3d3630" stroke-width="5"/>
      <g data-p="head">
        <path d="M-36 -212 L-53 -252 L-8 -226 Z" fill="#fbe6c0" stroke="#3d3630" stroke-width="6" stroke-linejoin="round"/>
        <path d="M36 -212 L47 -247 L11 -227 Z" fill="#fbe6c0" stroke="#3d3630" stroke-width="6" stroke-linejoin="round"/>
        <path d="M-34 -219 L-44 -240 L-21 -226 Z" fill="#f6a8b8"/>
        <path d="M34 -219 L41 -237 L22 -227 Z" fill="#f6a8b8"/>
        <circle cx="-2" cy="-172" r="55" fill="#fbe6c0"/>
        <circle cx="0" cy="-174" r="52" fill="none" stroke="#3d3630" stroke-width="6"/>
        <ellipse cx="-38" cy="-158" rx="10" ry="6" fill="#f6a8b8" opacity=".9"/>
        <ellipse cx="38" cy="-156" rx="10" ry="6" fill="#f6a8b8" opacity=".9"/>
        <g stroke="#3d3630" stroke-width="3.5" stroke-linecap="round">
          <line x1="-52" y1="-170" x2="-86" y2="-178"/>
          <line x1="-52" y1="-158" x2="-80" y2="-153"/>
          <line x1="52" y1="-170" x2="83" y2="-175"/>
          <line x1="52" y1="-158" x2="88" y2="-155"/>
        </g>
        <g data-face="happy">
          <circle cx="-19" cy="-183" r="6" fill="#3d3630"/>
          <circle cx="18" cy="-180" r="5.4" fill="#3d3630"/>
          <path d="M-7 -167 L7 -167 L0 -157 Z" fill="#e8888f" stroke="#3d3630" stroke-width="2.5" stroke-linejoin="round"/>
          <path d="M0 -157 q-8 9 -14 3 M0 -157 q8 9 14 3" fill="none" stroke="#3d3630" stroke-width="4" stroke-linecap="round"/>
        </g>
        <g data-face="surprised" style="display:none">
          <circle cx="-19" cy="-184" r="10" fill="#fffdf5" stroke="#3d3630" stroke-width="3"/>
          <circle cx="19" cy="-181" r="9" fill="#fffdf5" stroke="#3d3630" stroke-width="3"/>
          <circle cx="-19" cy="-184" r="4.5" fill="#3d3630"/>
          <circle cx="19" cy="-181" r="4" fill="#3d3630"/>
          <ellipse cx="0" cy="-153" rx="10" ry="13" fill="#3d3630"/>
        </g>
        <g data-face="angry" style="display:none">
          <path d="M-30 -196 l20 7 M30 -193 l-20 6" stroke="#3d3630" stroke-width="4.5" stroke-linecap="round"/>
          <circle cx="-19" cy="-181" r="6" fill="#3d3630"/>
          <circle cx="18" cy="-178" r="5.4" fill="#3d3630"/>
          <path d="M-13 -155 q7 -8 13 0 q6 8 13 -1" fill="none" stroke="#3d3630" stroke-width="4" stroke-linecap="round"/>
        </g>
        <g data-face="sad" style="display:none">
          <path d="M-29 -190 q10 -6 19 0 M29 -187 q-10 -6 -19 0" fill="none" stroke="#3d3630" stroke-width="4" stroke-linecap="round"/>
          <path d="M-25 -178 q6 -7 12 0 M7 -175 q6 -7 12 0" fill="none" stroke="#3d3630" stroke-width="4.5" stroke-linecap="round"/>
          <path d="M-11 -152 q11 -9 22 0" fill="none" stroke="#3d3630" stroke-width="4" stroke-linecap="round"/>
        </g>
        <g data-face="sorry" style="display:none">
          <path d="M-26 -180 q7 8 13 0 M6 -177 q7 8 13 0" fill="none" stroke="#3d3630" stroke-width="4.5" stroke-linecap="round"/>
          <path d="M-9 -153 q9 -6 18 -1" fill="none" stroke="#3d3630" stroke-width="4" stroke-linecap="round"/>
        </g>
      </g>
      <path d="M-35 -128 q35 12 70 -2 l2 13 q-36 14 -74 2 z" fill="#e5564b" stroke="#3d3630" stroke-width="5"/>
      <g data-p="bell">
        <circle cx="1" cy="-105" r="12" fill="#f5c93f" stroke="#3d3630" stroke-width="5"/>
        <circle cx="1" cy="-101" r="2.6" fill="#3d3630"/>
      </g>
    </g>
  </g>

  <!-- ─── 몽이 (강아지) · 원점 = 발밑 중앙 ─── -->
  <g id="def-mongi">
    <g filter="url(#wob1)">
      <g data-p="tail">
        <path d="M62 -60 Q 92 -76 86 -112" fill="none" stroke="#3d3630" stroke-width="20" stroke-linecap="round"/>
        <path d="M62 -60 Q 92 -76 86 -112" fill="none" stroke="#e0b075" stroke-width="12" stroke-linecap="round"/>
      </g>
      <ellipse cx="-3" cy="-50" rx="70" ry="51" fill="#e0b075"/>
      <ellipse cx="-14" cy="-38" rx="34" ry="26" fill="#f2d3a8" opacity=".8"/>
      <ellipse cx="0" cy="-53" rx="68" ry="49" fill="none" stroke="#3d3630" stroke-width="6"/>
      <ellipse cx="-30" cy="-6" rx="16" ry="12" fill="#e0b075" stroke="#3d3630" stroke-width="5"/>
      <ellipse cx="30" cy="-4" rx="16" ry="12" fill="#e0b075" stroke="#3d3630" stroke-width="5"/>
      <g data-p="head">
        <g data-p="earL"><path d="M-44 -206 q-30 6 -32 44 q-2 30 18 34 q16 3 20 -26 z" fill="#c98a4b" stroke="#3d3630" stroke-width="5" stroke-linejoin="round"/></g>
        <g data-p="earR"><path d="M44 -204 q30 6 32 44 q2 30 -18 34 q-16 3 -20 -26 z" fill="#c98a4b" stroke="#3d3630" stroke-width="5" stroke-linejoin="round"/></g>
        <circle cx="-2" cy="-168" r="53" fill="#e0b075"/>
        <circle cx="0" cy="-170" r="50" fill="none" stroke="#3d3630" stroke-width="6"/>
        <ellipse cx="0" cy="-142" rx="30" ry="23" fill="#f2d3a8" stroke="#3d3630" stroke-width="4"/>
        <ellipse cx="0" cy="-155" rx="9" ry="7" fill="#3d3630"/>
        <g data-face="happy">
          <circle cx="-19" cy="-181" r="5.6" fill="#3d3630"/>
          <circle cx="19" cy="-179" r="5.6" fill="#3d3630"/>
          <path d="M0 -148 v8 M0 -140 q-9 8 -15 1 M0 -140 q9 8 15 1" fill="none" stroke="#3d3630" stroke-width="4" stroke-linecap="round"/>
          <path d="M6 -136 q9 6 15 -2" fill="none" stroke="#e8888f" stroke-width="5" stroke-linecap="round"/>
        </g>
        <g data-face="sneaky" style="display:none">
          <path d="M-28 -190 l18 4 M28 -188 l-18 4" stroke="#3d3630" stroke-width="4" stroke-linecap="round"/>
          <circle cx="-17" cy="-179" r="5.6" fill="#3d3630"/>
          <circle cx="21" cy="-177" r="5.6" fill="#3d3630"/>
          <path d="M0 -148 v8 M-2 -140 q10 7 17 -2" fill="none" stroke="#3d3630" stroke-width="4" stroke-linecap="round"/>
        </g>
        <g data-face="angry" style="display:none">
          <path d="M-30 -193 l20 7 M30 -191 l-20 6" stroke="#3d3630" stroke-width="4.5" stroke-linecap="round"/>
          <circle cx="-19" cy="-178" r="5.6" fill="#3d3630"/>
          <circle cx="19" cy="-176" r="5.6" fill="#3d3630"/>
          <path d="M-13 -138 q7 -7 13 0 q6 7 13 -1" fill="none" stroke="#3d3630" stroke-width="4" stroke-linecap="round"/>
        </g>
        <g data-face="sad" style="display:none">
          <path d="M-29 -188 q10 -6 19 0 M29 -186 q-10 -6 -19 0" fill="none" stroke="#3d3630" stroke-width="4" stroke-linecap="round"/>
          <path d="M-24 -176 q6 -7 12 0 M8 -174 q6 -7 12 0" fill="none" stroke="#3d3630" stroke-width="4.5" stroke-linecap="round"/>
          <path d="M-10 -136 q10 -8 20 0" fill="none" stroke="#3d3630" stroke-width="4" stroke-linecap="round"/>
        </g>
        <g data-face="shy" style="display:none">
          <path d="M-25 -180 q6 8 12 0 M8 -178 q6 8 12 0" fill="none" stroke="#3d3630" stroke-width="4.5" stroke-linecap="round"/>
          <path d="M-8 -137 q9 -5 17 -1" fill="none" stroke="#3d3630" stroke-width="4" stroke-linecap="round"/>
          <ellipse cx="-36" cy="-158" rx="11" ry="7" fill="#f6a8b8" opacity=".95"/>
          <ellipse cx="37" cy="-156" rx="11" ry="7" fill="#f6a8b8" opacity=".95"/>
        </g>
      </g>
      <path d="M-38 -122 q38 14 76 -3 l3 15 q-40 16 -81 3 z" fill="#e5564b" stroke="#3d3630" stroke-width="5"/>
      <path d="M-6 -110 l-22 34 l20 -5 l10 16 l14 -40 z" fill="#e5564b" stroke="#3d3630" stroke-width="5" stroke-linejoin="round"/>
    </g>
  </g>

  <!-- ─── 부엉 할아버지 · 원점 = 발밑 중앙 ─── -->
  <g id="def-owl">
    <g filter="url(#wob1)">
      <g data-p="wingL"><path d="M-58 -150 q-30 26 -24 74 q4 30 20 30 q10 0 10 -22 z" fill="#a68a6a" stroke="#3d3630" stroke-width="5" stroke-linejoin="round"/></g>
      <g data-p="wingR"><path d="M58 -150 q30 26 24 74 q-4 30 -20 30 q-10 0 -10 -22 z" fill="#a68a6a" stroke="#3d3630" stroke-width="5" stroke-linejoin="round"/></g>
      <ellipse cx="-2" cy="-110" rx="64" ry="80" fill="#b9a184"/>
      <ellipse cx="0" cy="-98" rx="40" ry="52" fill="#e8dcc4"/>
      <ellipse cx="0" cy="-112" rx="62" ry="78" fill="none" stroke="#3d3630" stroke-width="6"/>
      <g stroke="#3d3630" stroke-width="3" fill="none" opacity=".55">
        <path d="M-26 -80 q26 10 52 0 M-26 -60 q26 10 52 0 M-24 -40 q24 10 48 0"/>
      </g>
      <g stroke-width="4.5" stroke-linecap="round">
        <path d="M-24 -32 v26 M-34 -6 h20 M-24 -6 l-8 8 M-24 -6 l8 8" stroke="#f2a33c" fill="none"/>
        <path d="M24 -32 v26 M14 -6 h20 M24 -6 l-8 8 M24 -6 l8 8" stroke="#f2a33c" fill="none"/>
      </g>
      <path d="M-46 -172 l-14 -34 l30 16 z" fill="#b9a184" stroke="#3d3630" stroke-width="5" stroke-linejoin="round"/>
      <path d="M46 -172 l14 -34 l-30 16 z" fill="#b9a184" stroke="#3d3630" stroke-width="5" stroke-linejoin="round"/>
      <g data-p="head">
        <path d="M-52 -186 q22 -12 42 -2" fill="none" stroke="#fffdf5" stroke-width="7" stroke-linecap="round"/>
        <path d="M52 -186 q-22 -12 -42 -2" fill="none" stroke="#fffdf5" stroke-width="7" stroke-linecap="round"/>
        <g data-face="calm">
          <circle cx="-26" cy="-162" r="17" fill="#fffdf5" stroke="#3d3630" stroke-width="4"/>
          <circle cx="26" cy="-162" r="17" fill="#fffdf5" stroke="#3d3630" stroke-width="4"/>
          <circle cx="-24" cy="-162" r="7" fill="#3d3630"/>
          <circle cx="28" cy="-162" r="7" fill="#3d3630"/>
        </g>
        <g data-face="wise" style="display:none">
          <circle cx="-26" cy="-162" r="17" fill="#fffdf5" stroke="#3d3630" stroke-width="4"/>
          <circle cx="26" cy="-162" r="17" fill="#fffdf5" stroke="#3d3630" stroke-width="4"/>
          <path d="M-36 -160 q10 9 20 0 M16 -160 q10 9 20 0" fill="none" stroke="#3d3630" stroke-width="4.5" stroke-linecap="round"/>
        </g>
        <g data-p="glasses">
          <circle cx="-26" cy="-162" r="22" fill="#cfe3ea" opacity=".35"/>
          <circle cx="26" cy="-162" r="22" fill="#cfe3ea" opacity=".35"/>
          <circle cx="-26" cy="-162" r="22" fill="none" stroke="#9aa6ad" stroke-width="5"/>
          <circle cx="26" cy="-162" r="22" fill="none" stroke="#9aa6ad" stroke-width="5"/>
          <path d="M-4 -164 q4 -5 8 0" fill="none" stroke="#9aa6ad" stroke-width="5"/>
          <path d="M-48 -166 l-14 -6 M48 -166 l14 -6" stroke="#9aa6ad" stroke-width="5" stroke-linecap="round"/>
          <path data-p="glint" d="M-36 -172 l10 -8 M22 -172 l10 -8" stroke="#fffdf5" stroke-width="4" stroke-linecap="round" opacity="0"/>
        </g>
        <path d="M0 -150 l-11 -8 h22 z" fill="#f2a33c" stroke="#3d3630" stroke-width="4" stroke-linejoin="round"/>
      </g>
    </g>
  </g>

  <!-- ─── 소품 ─── -->
  <g id="def-ball">
    <g filter="url(#wob1)">
      <circle cx="0" cy="0" r="33" fill="#e5564b"/>
      <path d="M-32 -2 a32 32 0 0 1 64 0 z" fill="#f5c93f"/>
      <circle cx="0" cy="0" r="32" fill="none" stroke="#3d3630" stroke-width="6"/>
      <path d="M-32 0 q16 6 32 0 t32 -1" fill="none" stroke="#3d3630" stroke-width="5" stroke-linecap="round"/>
    </g>
  </g>
  <g id="def-half-l">
    <g filter="url(#wob1)">
      <path d="M2 -32 A32 32 0 0 0 2 32 L8 24 L0 16 L9 8 L0 0 L9 -8 L0 -16 L7 -24 Z" fill="#e5564b" stroke="#3d3630" stroke-width="5" stroke-linejoin="round"/>
      <path d="M2 -32 A32 32 0 0 0 -30 -2 L0 0 L9 -8 L0 -16 L7 -24 Z" fill="#f5c93f" stroke="#3d3630" stroke-width="5" stroke-linejoin="round"/>
    </g>
  </g>
  <g id="def-half-r">
    <g filter="url(#wob1)">
      <path d="M-2 -32 A32 32 0 0 1 -2 32 L-8 24 L0 16 L-9 8 L0 0 L-9 -8 L0 -16 L-7 -24 Z" fill="#e5564b" stroke="#3d3630" stroke-width="5" stroke-linejoin="round"/>
      <path d="M-2 -32 A32 32 0 0 1 30 -2 L0 0 L-9 -8 L0 -16 L-7 -24 Z" fill="#f5c93f" stroke="#3d3630" stroke-width="5" stroke-linejoin="round"/>
    </g>
  </g>
  <g id="def-star">
    <g filter="url(#wob1)">
      <path d="M0 -40 L-10 -13.8 L-38 -12.4 L-16.2 5.3 L-23.5 32.4 L0 17 Z" fill="#e5564b"/>
      <path d="M0 -40 L10 -13.8 L38 -12.4 L16.2 5.3 L23.5 32.4 L0 17 Z" fill="#f5c93f"/>
      <path d="M0 -40 L0 17" stroke="#3d3630" stroke-width="3.5" opacity=".5"/>
      <path d="M0 -40 L10 -13.8 L38 -12.4 L16.2 5.3 L23.5 32.4 L0 17 L-23.5 32.4 L-16.2 5.3 L-38 -12.4 L-10 -13.8 Z"
            fill="none" stroke="#3d3630" stroke-width="5.5" stroke-linejoin="round"/>
      <circle cx="0" cy="34" r="10" fill="#f5c93f" stroke="#3d3630" stroke-width="4.5"/>
      <circle cx="0" cy="37" r="2.4" fill="#3d3630"/>
    </g>
  </g>

  <!-- ─── 배경 1: 나비네 거실 (낮) ─── -->
  <g id="def-room">
    <g filter="url(#wobBg)">
      <rect x="-20" y="-20" width="840" height="520" fill="#cfe8f5"/>
      <path d="M-20 486 Q 200 474 410 482 T 820 472 L820 620 L-20 620 Z" fill="#f7e0a8"/>
      <path d="M-20 486 Q 200 474 410 482 T 820 472" fill="none" stroke="#3d3630" stroke-width="6" stroke-linecap="round"/>
      <rect x="-20" y="-20" width="840" height="640" fill="url(#crayon)"/>
    </g>
    <g filter="url(#wob2)" transform="rotate(-4 175 196)">
      <rect x="124" y="152" width="102" height="86" fill="#f5c93f"/>
      <rect x="124" y="152" width="102" height="86" fill="none" stroke="#3d3630" stroke-width="5"/>
      <path d="M175 216 q-17-19 -3-27 q10 5 3 9 q7-8 14-1 q9 10 -14 19" fill="#e5564b"/>
    </g>
    <g filter="url(#wob2)">
      <rect x="548" y="132" width="186" height="156" fill="#fffdf5"/>
      <clipPath id="glassRoom"><rect x="562" y="146" width="158" height="128"/></clipPath>
      <rect x="562" y="146" width="158" height="128" fill="#a8d5f0"/>
      <g clip-path="url(#glassRoom)">
        <g data-p="sun">
          <g stroke="#f2a33c" stroke-width="4.5" stroke-linecap="round">
            <line x1="596" y1="140" x2="596" y2="152"/><line x1="570" y1="152" x2="578" y2="161"/>
            <line x1="622" y1="152" x2="614" y2="161"/><line x1="560" y1="177" x2="572" y2="177"/>
            <line x1="632" y1="177" x2="620" y2="177"/><line x1="572" y1="200" x2="579" y2="193"/>
            <line x1="620" y1="200" x2="613" y2="193"/>
          </g>
          <circle cx="596" cy="177" r="20" fill="#f5c93f" stroke="#3d3630" stroke-width="4"/>
        </g>
        <path d="M672 172 q-14 0 -14 11 q0 10 14 10 h34 q13 0 13-11 q0-10 -13-10 q-3-11 -17-9 q-11 1 -17 9 z"
              fill="#fffdf5" stroke="#3d3630" stroke-width="3.5"/>
        <path d="M550 252 Q 640 244 740 250 L740 290 L550 290 Z" fill="#86c25f"/>
        <g stroke="#5f9a3d" stroke-width="3" stroke-linecap="round">
          <path d="M578 252 l-4 -12 M596 250 l4 -13 M628 249 l-3 -11 M660 248 l5 -12 M694 249 l-4 -11"/>
        </g>
        <g data-p="truck" transform="translate(210,0)">
          <rect x="580" y="198" width="84" height="44" fill="#e5564b"/>
          <rect x="580" y="198" width="84" height="44" fill="none" stroke="#3d3630" stroke-width="4"/>
          <path d="M664 212 h34 v30 h-34 z" fill="#f5c93f" stroke="#3d3630" stroke-width="4"/>
          <rect x="670" y="218" width="17" height="12" fill="#a8d5f0" stroke="#3d3630" stroke-width="3"/>
          <circle cx="602" cy="245" r="10" fill="#3d3630"/><circle cx="676" cy="245" r="10" fill="#3d3630"/>
          <text x="592" y="228" font-family="Gaegu, sans-serif" font-size="21" font-weight="700" fill="#fffdf5">이사</text>
          <!-- 초기 상태(숨김)는 GSAP이 svgOrigin과 함께 잡는다.
               SVG transform-origin 속성을 쓰면 GSAP 기준점 계산과 충돌한다. -->
          <g data-p="truckdog">
            <path d="M604 168 l-6 -22 l18 10 z" fill="#c98a4b" stroke="#3d3630" stroke-width="3"/>
            <path d="M640 168 l7 -21 l-18 9 z" fill="#c98a4b" stroke="#3d3630" stroke-width="3"/>
            <circle cx="622" cy="181" r="19" fill="#e0b075" stroke="#3d3630" stroke-width="4"/>
            <circle cx="615" cy="177" r="2.8" fill="#3d3630"/><circle cx="630" cy="178" r="2.8" fill="#3d3630"/>
            <ellipse cx="622" cy="188" rx="5" ry="4" fill="#3d3630"/>
            <path d="M604 196 q18 6 36 0 l-2 9 q-16 5 -32 0 z" fill="#e5564b" stroke="#3d3630" stroke-width="3"/>
          </g>
        </g>
      </g>
      <line x1="641" y1="146" x2="639" y2="274" stroke="#3d3630" stroke-width="4"/>
      <line x1="562" y1="209" x2="720" y2="212" stroke="#3d3630" stroke-width="4"/>
      <rect x="548" y="132" width="186" height="156" fill="none" stroke="#3d3630" stroke-width="6"/>
    </g>
    <g filter="url(#wob2)">
      <ellipse cx="296" cy="547" rx="228" ry="33" fill="#f6a8b8"/>
      <ellipse cx="302" cy="544" rx="222" ry="30" fill="none" stroke="#e0899b" stroke-width="4"/>
    </g>
    <g filter="url(#wob2)">
      <path d="M736 446 q-20-54 8-80 q6 46 16 80 z" fill="#86c25f" stroke="#3d3630" stroke-width="4"/>
      <path d="M756 446 q24-42 3-74 q-15 40 -17 74 z" fill="#9fd177" stroke="#3d3630" stroke-width="4"/>
      <path d="M719 444 h60 l-9 44 h-43 z" fill="#e59a5c" stroke="#3d3630" stroke-width="5"/>
    </g>
  </g>

  <!-- ─── 배경 2: 마당 (해·구름은 씬마다 따로) ─── -->
  <g id="def-yard">
    <g filter="url(#wobBg)">
      <path d="M-20 430 Q 200 416 420 426 T 820 418 L820 620 L-20 620 Z" fill="#86c25f"/>
      <path d="M-20 430 Q 200 416 420 426 T 820 418" fill="none" stroke="#3d3630" stroke-width="6" stroke-linecap="round"/>
      <rect x="-20" y="-20" width="840" height="640" fill="url(#crayon)"/>
    </g>
    <g filter="url(#wob2)">
      <path d="M-40 180 h190 v250 h-190 z" fill="#f7e0a8" stroke="#3d3630" stroke-width="6"/>
      <path d="M-50 184 L60 108 L170 184 z" fill="#e5564b" stroke="#3d3630" stroke-width="6" stroke-linejoin="round"/>
      <rect x="46" y="300" width="72" height="130" fill="#c98a4b" stroke="#3d3630" stroke-width="5"/>
      <circle cx="104" cy="368" r="6" fill="#3d3630"/>
      <rect x="-16" y="228" width="52" height="46" fill="#a8d5f0" stroke="#3d3630" stroke-width="5"/>
    </g>
    <g filter="url(#wob2)">
      <g fill="#fffdf5" stroke="#3d3630" stroke-width="4.5">
        <path d="M196 332 l10 -16 l10 16 v88 h-20 z"/><path d="M242 330 l10 -16 l10 16 v90 h-20 z"/>
        <path d="M288 333 l10 -16 l10 16 v88 h-20 z"/><path d="M334 331 l10 -16 l10 16 v89 h-20 z"/>
        <path d="M560 331 l10 -16 l10 16 v89 h-20 z"/><path d="M606 333 l10 -16 l10 16 v88 h-20 z"/>
        <path d="M652 330 l10 -16 l10 16 v90 h-20 z"/><path d="M698 332 l10 -16 l10 16 v88 h-20 z"/>
        <path d="M744 331 l10 -16 l10 16 v89 h-20 z"/>
      </g>
      <path d="M190 356 h176 M556 354 h216" stroke="#fffdf5" stroke-width="12" stroke-linecap="round"/>
      <path d="M190 396 h176 M556 394 h216" stroke="#fffdf5" stroke-width="12" stroke-linecap="round"/>
    </g>
    <g filter="url(#wob2)">
      <path d="M690 430 q-8 -70 4 -120 h22 q10 54 4 120 z" fill="#c98a4b" stroke="#3d3630" stroke-width="5"/>
      <circle cx="704" cy="268" r="62" fill="#86c25f" stroke="#3d3630" stroke-width="6"/>
      <circle cx="656" cy="296" r="40" fill="#9fd177" stroke="#3d3630" stroke-width="5"/>
      <circle cx="752" cy="294" r="38" fill="#9fd177" stroke="#3d3630" stroke-width="5"/>
    </g>
    <g filter="url(#wob2)">
      <g stroke="#5f9a3d" stroke-width="4" stroke-linecap="round">
        <path d="M168 560 v-30 M470 574 v-28 M782 556 v-30"/>
      </g>
      <circle cx="168" cy="524" r="11" fill="#f6a8b8" stroke="#3d3630" stroke-width="4"/>
      <circle cx="470" cy="540" r="11" fill="#fffdf5" stroke="#3d3630" stroke-width="4"/>
      <circle cx="782" cy="550" r="11" fill="#f5c93f" stroke="#3d3630" stroke-width="4"/>
    </g>
  </g>

  <!-- ─── 배경 3: 나무 아래 (해질녘) ─── -->
  <g id="def-dusk">
    <g filter="url(#wobBg)">
      <circle cx="640" cy="404" r="58" fill="#ffd08a" opacity=".95"/>
      <circle cx="640" cy="404" r="42" fill="#ffe9b8"/>
      <path d="M-20 452 Q 200 440 420 448 T 820 440 L820 620 L-20 620 Z" fill="#6ea54c"/>
      <path d="M-20 452 Q 200 440 420 448 T 820 440" fill="none" stroke="#3d3630" stroke-width="6" stroke-linecap="round"/>
      <rect x="-20" y="-20" width="840" height="640" fill="url(#crayon)"/>
    </g>
    <g filter="url(#wob2)">
      <path d="M120 452 q-14 -128 8 -218 h48 q20 96 10 218 z" fill="#a8703c" stroke="#3d3630" stroke-width="6"/>
      <path d="M132 330 q-40 -18 -58 -50 M170 300 q40 -22 62 -54" fill="none" stroke="#a8703c" stroke-width="16" stroke-linecap="round"/>
      <ellipse cx="150" cy="180" rx="140" ry="86" fill="#4f8a3a" stroke="#3d3630" stroke-width="6"/>
      <ellipse cx="52" cy="228" rx="72" ry="50" fill="#5f9a3d" stroke="#3d3630" stroke-width="5"/>
      <ellipse cx="252" cy="222" rx="76" ry="52" fill="#5f9a3d" stroke="#3d3630" stroke-width="5"/>
    </g>
    <g opacity=".18">
      <ellipse cx="300" cy="556" rx="130" ry="16" fill="#3d3630"/>
      <ellipse cx="560" cy="556" rx="130" ry="16" fill="#3d3630"/>
    </g>
  </g>
</defs>
</svg>`;

  document.currentScript.insertAdjacentHTML("afterend", DEFS);
})();
