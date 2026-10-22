/**
 * TOEIC MASTER - Core Web Application Engine
 * Supports Full Exam & Instant Practice Modes, Audio Player, Scoring & Persistence
 */

(function () {
  'use strict';

  // --- STANDARD ETS TOEIC CONVERSION TABLES (0 to 100 correct => Scaled 5 to 495) ---
  const TOEIC_SCALE_LISTENING = [
    5, 5, 5, 5, 5, 5, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70,
    75, 80, 85, 90, 95, 100, 110, 115, 120, 125, 130, 135, 140, 145, 150, 160, 165, 170, 175, 180,
    185, 190, 195, 200, 210, 215, 220, 230, 240, 245, 250, 255, 260, 270, 275, 280, 290, 295, 300, 310,
    315, 320, 325, 330, 340, 345, 350, 360, 365, 370, 380, 385, 390, 395, 400, 405, 410, 420, 425, 430,
    440, 445, 450, 460, 465, 470, 475, 480, 485, 490, 495, 495, 495, 495, 495, 495, 495, 495, 495, 495, 495
  ];

  const TOEIC_SCALE_READING = [
    5, 5, 5, 5, 5, 5, 5, 5, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60,
    65, 70, 75, 80, 85, 90, 95, 100, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160, 165,
    170, 175, 180, 185, 190, 195, 200, 205, 210, 215, 220, 225, 230, 235, 240, 245, 250, 255, 260, 265,
    270, 275, 280, 285, 290, 295, 300, 305, 310, 315, 320, 325, 330, 335, 340, 345, 350, 355, 360, 365,
    370, 375, 380, 385, 390, 395, 400, 405, 410, 415, 420, 425, 430, 435, 440, 450, 460, 470, 480, 490, 495
  ];

  // --- STATE INITIALIZATION ---
  const currentTestId = window.CURRENT_TEST_ID || 3;
  const state = {
    data: window.EXAM_DATA || null,
    activePart: 1,
    currentQuestionNum: 1,
    practiceMode: true, // Default to interactive review/practice mode
    submitted: false,
    userAnswers: {},     // { [qNum]: 'A' | 'B' | 'C' | 'D' }
    flagged: new Set(),  // Set of qNum
    timerSeconds: 120 * 60,
    timerRunning: true,
    matrixFilter: 'all', // 'all' | 'unanswered' | 'flagged'
    audioSpeed: 1.0,
    currentAudioGroup: null
  };

  // Load saved state from localStorage if available
  const STORAGE_KEY = 'TOEIC_MASTER_PROGRESS_ULSA_' + currentTestId;
  function loadPersistedState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.userAnswers) state.userAnswers = parsed.userAnswers;
        if (parsed.flagged) state.flagged = new Set(parsed.flagged);
        if (typeof parsed.timerSeconds === 'number') state.timerSeconds = parsed.timerSeconds;
        if (typeof parsed.practiceMode === 'boolean') state.practiceMode = parsed.practiceMode;
        if (typeof parsed.submitted === 'boolean') state.submitted = parsed.submitted;
        if (parsed.activePart) state.activePart = parsed.activePart;
      }
    } catch (e) {
      console.warn('Could not load saved state:', e);
    }
  }

  function persistState() {
    try {
      const payload = {
        userAnswers: state.userAnswers,
        flagged: Array.from(state.flagged),
        timerSeconds: state.timerSeconds,
        practiceMode: state.practiceMode,
        submitted: state.submitted,
        activePart: state.activePart
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {}
  }

  // --- DOM ELEMENTS ---
  const dom = {
    audio: document.getElementById('core-audio-element'),
    audioPlayBtn: document.getElementById('audio-play-toggle'),
    audioReplay5s: document.getElementById('audio-replay-5s'),
    audioForward5s: document.getElementById('audio-forward-5s'),
    audioSpeedBtn: document.getElementById('audio-speed-toggle'),
    audioTrackName: document.getElementById('audio-track-name'),
    audioCurTime: document.getElementById('audio-cur-time'),
    audioDurTime: document.getElementById('audio-dur-time'),
    audioScrubBar: document.getElementById('audio-scrub-bar'),
    audioScrubFill: document.getElementById('audio-scrub-fill'),
    audioPlayerBar: document.getElementById('global-audio-player'),
    playIcon: document.getElementById('play-icon'),
    pauseIcon: document.getElementById('pause-icon'),

    modeToggleBtn: document.getElementById('mode-toggle-btn'),
    modeLabel: document.getElementById('mode-label'),

    timerDisplay: document.getElementById('timer-display'),
    timerBox: document.getElementById('exam-timer'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    themeSun: document.getElementById('theme-sun'),
    themeMoon: document.getElementById('theme-moon'),
    submitBtn: document.getElementById('submit-exam-btn'),

    partTabsList: document.getElementById('part-tabs-list'),
    overallProgressFill: document.getElementById('overall-progress-fill'),

    examArea: document.getElementById('exam-area'),
    sidebarMatrix: document.getElementById('sidebar-matrix'),
    matrixBackdrop: document.getElementById('matrix-backdrop'),
    mobileMatrixBtn: document.getElementById('mobile-matrix-btn'),
    matrixGridScroll: document.getElementById('matrix-grid-scroll'),
    completionBadge: document.getElementById('completion-badge'),
    statAnswered: document.getElementById('stat-answered'),
    statUnanswered: document.getElementById('stat-unanswered'),
    statFlagged: document.getElementById('stat-flagged'),

    floatingBar: document.getElementById('floating-bar'),
    btnPrevQ: document.getElementById('btn-prev-q'),
    btnNextQ: document.getElementById('btn-next-q'),
    floatingQIndicator: document.getElementById('floating-q-indicator'),

    resultModal: document.getElementById('result-modal'),
    modalTotalScore: document.getElementById('modal-total-score'),
    modalCorrectRatio: document.getElementById('modal-correct-ratio'),
    modalListeningScore: document.getElementById('modal-listening-score'),
    modalListeningDetail: document.getElementById('modal-listening-detail'),
    modalReadingScore: document.getElementById('modal-reading-score'),
    modalReadingDetail: document.getElementById('modal-reading-detail'),
    modalPartBreakdown: document.getElementById('modal-part-breakdown'),
    modalBtnReview: document.getElementById('modal-btn-review'),
    modalBtnRetake: document.getElementById('modal-btn-retake'),

    lightboxModal: document.getElementById('lightbox-modal'),
    lightboxImg: document.getElementById('lightbox-img'),
    lightboxClose: document.getElementById('lightbox-close')
  };

  // --- AUDIO CONTROLLER ---
  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function playAudio(urlLocal, urlCdn, trackTitle) {
    if (!urlLocal && !urlCdn) return;
    
    // Test local first, if error switch to CDN
    const targetUrl = urlLocal || urlCdn;
    dom.audioTrackName.textContent = trackTitle || 'Audio bài nghe';
    
    if (dom.audio.src.indexOf(encodeURI(targetUrl)) === -1 && dom.audio.src !== targetUrl) {
      dom.audio.src = targetUrl;
      dom.audio.playbackRate = state.audioSpeed;
      dom.audio.load();
    }
    
    dom.audio.play().then(() => {
      updateAudioUI(true);
    }).catch(err => {
      console.warn('Local audio playback error, trying CDN fallback:', err);
      if (urlCdn && dom.audio.src !== urlCdn) {
        dom.audio.src = urlCdn;
        dom.audio.play().then(() => updateAudioUI(true)).catch(e => console.error('CDN play failed:', e));
      }
    });
  }

  function togglePlayPause() {
    if (dom.audio.paused) {
      if (dom.audio.src) {
        dom.audio.play();
        updateAudioUI(true);
      }
    } else {
      dom.audio.pause();
      updateAudioUI(false);
    }
  }

  function updateAudioUI(isPlaying) {
    if (isPlaying) {
      dom.playIcon.style.display = 'none';
      dom.pauseIcon.style.display = 'block';
      dom.audioPlayerBar.classList.add('playing');
    } else {
      dom.playIcon.style.display = 'block';
      dom.pauseIcon.style.display = 'none';
      dom.audioPlayerBar.classList.remove('playing');
    }
  }

  dom.audio.addEventListener('timeupdate', () => {
    const cur = dom.audio.currentTime;
    const dur = dom.audio.duration || 0;
    dom.audioCurTime.textContent = formatTime(cur);
    dom.audioDurTime.textContent = formatTime(dur);
    if (dur > 0) {
      const pct = (cur / dur) * 100;
      dom.audioScrubFill.style.width = pct + '%';
    }
  });

  dom.audio.addEventListener('ended', () => {
    updateAudioUI(false);
  });

  dom.audioScrubBar.addEventListener('click', (e) => {
    const rect = dom.audioScrubBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    if (dom.audio.duration) {
      dom.audio.currentTime = pos * dom.audio.duration;
    }
  });

  dom.audioPlayBtn.addEventListener('click', togglePlayPause);
  
  dom.audioReplay5s.addEventListener('click', () => {
    dom.audio.currentTime = Math.max(0, dom.audio.currentTime - 5);
  });
  
  dom.audioForward5s.addEventListener('click', () => {
    if (dom.audio.duration) {
      dom.audio.currentTime = Math.min(dom.audio.duration, dom.audio.currentTime + 5);
    }
  });

  const SPEEDS = [0.8, 1.0, 1.2, 1.5];
  dom.audioSpeedBtn.addEventListener('click', () => {
    const curIdx = SPEEDS.indexOf(state.audioSpeed);
    const nextIdx = (curIdx + 1) % SPEEDS.length;
    state.audioSpeed = SPEEDS[nextIdx];
    dom.audioSpeedBtn.textContent = state.audioSpeed + 'x';
    dom.audio.playbackRate = state.audioSpeed;
  });

  // --- THEME SWITCHER ---
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      dom.themeSun.style.display = 'block';
      dom.themeMoon.style.display = 'none';
    } else {
      dom.themeSun.style.display = 'none';
      dom.themeMoon.style.display = 'block';
    }
    localStorage.setItem('TOEIC_THEME', theme);
  }

  const savedTheme = localStorage.getItem('TOEIC_THEME') || 'light';
  setTheme(savedTheme);

  dom.themeToggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  });

  // --- PRACTICE / TEST MODE TOGGLE ---
  function updateModeUI() {
    if (state.practiceMode) {
      dom.modeLabel.innerHTML = '⚡ <b>Luyện tập</b> <span class="mode-desc">(Xem giải thích)</span>';
      dom.modeToggleBtn.style.color = 'var(--primary)';
      dom.modeToggleBtn.style.borderColor = 'var(--primary)';
    } else {
      dom.modeLabel.innerHTML = '🎯 <b>Thi thử</b> <span class="mode-desc">(Ẩn đáp án)</span>';
      dom.modeToggleBtn.style.color = 'var(--accent-orange)';
      dom.modeToggleBtn.style.borderColor = 'var(--accent-orange)';
    }
    renderActivePart();
    persistState();
  }

  dom.modeToggleBtn.addEventListener('click', () => {
    state.practiceMode = !state.practiceMode;
    updateModeUI();
  });

  // --- EXAM TIMER ---
  let timerInterval = null;
  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (state.timerRunning && state.timerSeconds > 0 && !state.submitted) {
        state.timerSeconds--;
        const m = Math.floor(state.timerSeconds / 60);
        const s = state.timerSeconds % 60;
        dom.timerDisplay.textContent = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
        
        if (state.timerSeconds <= 300) {
          dom.timerBox.classList.add('warning');
        } else {
          dom.timerBox.classList.remove('warning');
        }
        
        if (state.timerSeconds % 10 === 0) persistState();
        if (state.timerSeconds === 0) submitExam();
      }
    }, 1000);
  }

  dom.timerBox.addEventListener('click', () => {
    state.timerRunning = !state.timerRunning;
    dom.timerBox.style.opacity = state.timerRunning ? '1' : '0.6';
  });

  // --- PART NAVIGATION TABS ---
  function renderPartTabs() {
    dom.partTabsList.innerHTML = '';
    state.data.parts.forEach(part => {
      const btn = document.createElement('button');
      btn.className = `part-tab ${part.partNumber === state.activePart ? 'active' : ''}`;
      
      // Calculate answered questions in this part
      let answeredInPart = 0;
      let totalInPart = 0;
      part.groups.forEach(g => {
        g.questions.forEach(q => {
          totalInPart++;
          if (state.userAnswers[q.qNum]) answeredInPart++;
        });
      });

      btn.innerHTML = `
        <span>Part ${part.partNumber}</span>
        <span class="part-badge-count" id="part-count-${part.partNumber}">${answeredInPart}/${totalInPart}</span>
      `;

      btn.addEventListener('click', () => {
        switchPart(part.partNumber);
      });

      dom.partTabsList.appendChild(btn);
    });
  }

  function switchPart(partNumber) {
    state.activePart = partNumber;
    renderPartTabs();
    renderActivePart();
    persistState();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- OVERALL PROGRESS BAR & STATS ---
  function updateProgressAndStats() {
    let answered = 0;
    const total = 200;

    for (let i = 1; i <= total; i++) {
      if (state.userAnswers[i]) answered++;
    }

    const pct = ((answered / total) * 100).toFixed(1);
    dom.overallProgressFill.style.width = pct + '%';
    dom.completionBadge.textContent = `${answered} / ${total}`;
    dom.statAnswered.textContent = `${answered} Đã làm`;
    dom.statUnanswered.textContent = `${total - answered} Chưa làm`;
    dom.statFlagged.textContent = `${state.flagged.size} Cờ`;

    // Update part counts in tabs
    if (state.data) {
      state.data.parts.forEach(part => {
        let partAnswered = 0;
        let partTotal = 0;
        part.groups.forEach(g => {
          g.questions.forEach(q => {
            partTotal++;
            if (state.userAnswers[q.qNum]) partAnswered++;
          });
        });
        const badge = document.getElementById(`part-count-${part.partNumber}`);
        if (badge) badge.textContent = `${partAnswered}/${partTotal}`;
      });
    }

    // Update Question Matrix visual state
    renderMatrixButtons();
    persistState();
  }

  // --- RENDER SIDEBAR QUESTION MATRIX ---
  function renderMatrixButtons() {
    dom.matrixGridScroll.innerHTML = '';
    if (!state.data) return;

    state.data.parts.forEach(part => {
      const partSection = document.createElement('div');
      partSection.className = 'matrix-part-section';

      const title = document.createElement('div');
      title.className = 'matrix-part-title';
      title.textContent = `Part ${part.partNumber}: ${part.name}`;
      partSection.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'matrix-buttons-grid';

      part.groups.forEach(g => {
        g.questions.forEach(q => {
          const qNum = q.qNum;
          const isAnswered = !!state.userAnswers[qNum];
          const isFlagged = state.flagged.has(qNum);

          // Filtering
          if (state.matrixFilter === 'unanswered' && isAnswered) return;
          if (state.matrixFilter === 'flagged' && !isFlagged) return;

          const btn = document.createElement('button');
          btn.className = `q-matrix-btn ${isAnswered ? 'answered' : ''} ${isFlagged ? 'flagged' : ''}`;
          btn.textContent = qNum;

          // If submitted or in practice mode and answered, show correct/wrong
          if ((state.submitted || state.practiceMode) && isAnswered) {
            const userChoice = state.userAnswers[qNum];
            if (userChoice === q.correctLetter) {
              btn.classList.add('correct');
            } else {
              btn.classList.add('wrong');
            }
          }

          btn.addEventListener('click', () => {
            jumpToQuestion(qNum, part.partNumber);
          });

          grid.appendChild(btn);
        });
      });

      if (grid.children.length > 0) {
        partSection.appendChild(grid);
        dom.matrixGridScroll.appendChild(partSection);
      }
    });
  }

  // Matrix Filter Pill clicks
  document.querySelectorAll('.matrix-filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.matrix-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.matrixFilter = btn.getAttribute('data-filter');
      renderMatrixButtons();
    });
  });

  // Mobile matrix drawer toggle with backdrop
  function setMatrixDrawer(open) {
    const shouldOpen = open !== undefined ? open : !dom.sidebarMatrix.classList.contains('open');
    dom.sidebarMatrix.classList.toggle('open', shouldOpen);
    if (dom.matrixBackdrop) {
      dom.matrixBackdrop.classList.toggle('open', shouldOpen);
    }
  }

  dom.mobileMatrixBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setMatrixDrawer();
  });

  if (dom.matrixBackdrop) {
    dom.matrixBackdrop.addEventListener('click', () => {
      setMatrixDrawer(false);
    });
  }

  // Close matrix on outside click (mobile)
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 1024 && dom.sidebarMatrix.classList.contains('open')) {
      if (!dom.sidebarMatrix.contains(e.target) && !dom.mobileMatrixBtn.contains(e.target)) {
        setMatrixDrawer(false);
      }
    }
  });

  // Jump smoothly to a specific question
  function jumpToQuestion(qNum, partNumber) {
    if (partNumber && partNumber !== state.activePart) {
      switchPart(partNumber);
    }
    state.currentQuestionNum = qNum;
    dom.floatingQIndicator.textContent = `Câu ${qNum} / 200`;

    setTimeout(() => {
      const qEl = document.getElementById(`question-card-${qNum}`);
      if (qEl) {
        qEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        qEl.style.outline = '2px solid var(--primary)';
        setTimeout(() => qEl.style.outline = 'none', 1500);
      }
      if (window.innerWidth <= 1024) {
        setMatrixDrawer(false);
      }
    }, 150);
  }

  // --- RENDER ACTIVE PART QUESTIONS ---
  function renderActivePart() {
    dom.examArea.innerHTML = '';
    const currentPart = state.data.parts.find(p => p.partNumber === state.activePart);
    if (!currentPart) return;

    // Part Banner Card
    const banner = document.createElement('div');
    banner.className = 'part-banner-card';
    banner.innerHTML = `
      <div class="part-banner-title">
        <span>Part ${currentPart.partNumber}: ${currentPart.name.toUpperCase()}</span>
        <span class="brand-badge">${currentPart.totalQuestions} Câu hỏi</span>
      </div>
      <div class="part-banner-desc">
        ${getPartInstructions(currentPart.partNumber)}
      </div>
    `;
    dom.examArea.appendChild(banner);

    // Render Question Groups
    currentPart.groups.forEach((group, gIdx) => {
      const groupCard = document.createElement('div');
      groupCard.className = 'question-group-card';
      groupCard.id = `group-card-${group.groupId}`;

      // 1. Audio Bar if audio exists
      if (group.audioLocal || group.audioCdn) {
        const audioBar = document.createElement('div');
        audioBar.className = 'group-audio-bar';
        audioBar.innerHTML = `
          <button class="audio-btn primary" title="Nghe đoạn âm thanh">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
          <div class="audio-wave-anim">
            <div class="audio-wave-bar"></div>
            <div class="audio-wave-bar"></div>
            <div class="audio-wave-bar"></div>
            <div class="audio-wave-bar"></div>
          </div>
          <span style="font-size: 13px; font-weight: 700; flex: 1;">
            Audio nghe: Part ${currentPart.partNumber} (Câu ${group.questions[0].qNum}${group.questions.length > 1 ? ' - ' + group.questions[group.questions.length - 1].qNum : ''})
          </span>
          <span class="audio-shortcut-hint" style="font-size: 11px; color: var(--text-muted);">Phím Space để phát/dừng</span>
        `;

        audioBar.querySelector('button').addEventListener('click', (e) => {
          e.stopPropagation();
          playAudio(group.audioLocal, group.audioCdn, `Part ${currentPart.partNumber} (Câu ${group.questions[0].qNum})`);
        });

        groupCard.appendChild(audioBar);
      }

      // 2. Part 7 Split View or Normal Image Container
      if (currentPart.partNumber === 7 && (group.imageLocal || group.imageCdn)) {
        // Create Split Layout Container
        const splitView = document.createElement('div');
        splitView.className = 'part7-split-view';

        // Left Panel: Sticky Passage Image
        const leftPanel = document.createElement('div');
        leftPanel.className = 'passage-sticky-panel';
        
        const imgSrc = group.imageLocal || group.imageCdn;
        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = `Reading Passage Q${group.questions[0].qNum}`;
        img.onerror = () => { img.src = group.imageCdn; };
        img.addEventListener('click', () => openLightbox(img.src));

        leftPanel.appendChild(img);
        splitView.appendChild(leftPanel);

        // Right Panel: Questions List
        const rightPanel = document.createElement('div');
        rightPanel.className = 'passage-questions-panel';

        group.questions.forEach(q => {
          rightPanel.appendChild(renderQuestionItem(q, group));
        });

        splitView.appendChild(rightPanel);
        groupCard.appendChild(splitView);

      } else {
        // Normal View (Part 1, 2, 3, 4, 5, 6)

        // Passage Text (for Part 6 memo or Part 3/4 context)
        if (group.passageText) {
          const passBox = document.createElement('div');
          passBox.className = 'passage-text-box';
          passBox.textContent = group.passageText;
          groupCard.appendChild(passBox);
        } else if (group.parentText) {
          const passBox = document.createElement('div');
          passBox.className = 'passage-text-box';
          passBox.textContent = group.parentText;
          groupCard.appendChild(passBox);
        }

        // Image (e.g. Part 1 Photographs or Part 3/4 Graphic chart)
        if (group.imageLocal || group.imageCdn) {
          const imgContainer = document.createElement('div');
          imgContainer.className = 'group-image-container';

          const imgSrc = group.imageLocal || group.imageCdn;
          const img = document.createElement('img');
          img.className = 'group-image';
          img.src = imgSrc;
          img.alt = `Question ${group.questions[0].qNum}`;
          img.onerror = () => { img.src = group.imageCdn; };
          img.addEventListener('click', () => openLightbox(img.src));

          const hint = document.createElement('div');
          hint.className = 'image-zoom-hint';
          hint.innerHTML = '🔍 Nhấp để phóng to ảnh';

          imgContainer.appendChild(img);
          imgContainer.appendChild(hint);
          groupCard.appendChild(imgContainer);
        }

        // Render Questions in Group
        group.questions.forEach(q => {
          groupCard.appendChild(renderQuestionItem(q, group));
        });
      }

      // Audio Script / Transcript Accordion (Available in Practice Mode or After Submission)
      if ((state.practiceMode || state.submitted) && group.audioScript) {
        const accordion = document.createElement('div');
        accordion.className = 'transcript-accordion';

        const header = document.createElement('div');
        header.className = 'transcript-header';
        header.innerHTML = `
          <span>📝 Lời thoại (Audio Transcript) & Giải thích</span>
          <span>▼</span>
        `;

        const content = document.createElement('div');
        content.className = 'transcript-content';
        content.style.display = 'none';
        content.textContent = group.audioScript;

        header.addEventListener('click', () => {
          const isOpen = content.style.display === 'block';
          content.style.display = isOpen ? 'none' : 'block';
          header.querySelector('span:last-child').textContent = isOpen ? '▼' : '▲';
        });

        accordion.appendChild(header);
        accordion.appendChild(content);
        groupCard.appendChild(accordion);
      }

      dom.examArea.appendChild(groupCard);
    });
  }

  // Render a single question item (Question Title + Option choices list)
  function renderQuestionItem(q, group) {
    const item = document.createElement('div');
    item.className = 'single-question-item';
    item.id = `question-card-${q.qNum}`;

    const isFlagged = state.flagged.has(q.qNum);
    const selectedAnswer = state.userAnswers[q.qNum] || null;

    // Header
    const qHeader = document.createElement('div');
    qHeader.className = 'q-header';
    qHeader.innerHTML = `
      <span class="q-number-pill">Câu ${q.qNum}</span>
      <div class="q-title">${q.cleanTitle || q.text}</div>
      <button class="q-flag-btn ${isFlagged ? 'flagged' : ''}" title="Đánh dấu câu hỏi này">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="${isFlagged ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
      </button>
    `;

    qHeader.querySelector('.q-flag-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFlag(q.qNum);
    });

    item.appendChild(qHeader);

    // Choices Grid
    const choicesGrid = document.createElement('div');
    choicesGrid.className = 'choices-grid';

    const defaultLabels = ['(A)', '(B)', '(C)', '(D)'];
    const choicesList = (q.choices && q.choices.length > 0) ? q.choices : defaultLabels;

    choicesList.forEach((choiceText, cIdx) => {
      const letter = String.fromCharCode(65 + cIdx); // 'A', 'B', 'C', 'D'
      const label = document.createElement('label');
      label.className = `choice-label ${selectedAnswer === letter ? 'selected' : ''}`;

      // In Practice Mode or Submitted Mode: show immediate green/red feedback
      if ((state.practiceMode || state.submitted) && selectedAnswer) {
        if (letter === q.correctLetter) {
          label.classList.add('is-correct');
        } else if (selectedAnswer === letter && selectedAnswer !== q.correctLetter) {
          label.classList.add('is-wrong');
        }
      }

      label.innerHTML = `
        <div class="choice-indicator">${letter}</div>
        <span>${choiceText}</span>
      `;

      label.addEventListener('click', () => {
        selectChoice(q.qNum, letter);
      });

      choicesGrid.appendChild(label);
    });

    item.appendChild(choicesGrid);
    return item;
  }

  // Handle choice selection
  function selectChoice(qNum, letter) {
    if (state.submitted) return; // Locked when submitted
    state.userAnswers[qNum] = letter;
    state.currentQuestionNum = qNum;
    dom.floatingQIndicator.textContent = `Câu ${qNum} / 200`;

    updateProgressAndStats();

    // Re-render choices in that card
    const card = document.getElementById(`question-card-${qNum}`);
    if (card) {
      const labels = card.querySelectorAll('.choice-label');
      labels.forEach((lbl, idx) => {
        const cLetter = String.fromCharCode(65 + idx);
        lbl.classList.toggle('selected', cLetter === letter);

        // Instant feedback in practice mode
        if (state.practiceMode) {
          // Find correct letter from data
          const qObj = findQuestionByNum(qNum);
          if (qObj) {
            lbl.classList.remove('is-correct', 'is-wrong');
            if (cLetter === qObj.correctLetter) {
              lbl.classList.add('is-correct');
            } else if (letter === cLetter && letter !== qObj.correctLetter) {
              lbl.classList.add('is-wrong');
            }
          }
        }
      });
    }
  }

  function findQuestionByNum(qNum) {
    for (const part of state.data.parts) {
      for (const group of part.groups) {
        for (const q of group.questions) {
          if (q.qNum === qNum) return q;
        }
      }
    }
    return null;
  }

  // Toggle question flag
  function toggleFlag(qNum) {
    if (state.flagged.has(qNum)) {
      state.flagged.delete(qNum);
    } else {
      state.flagged.add(qNum);
    }
    updateProgressAndStats();

    const card = document.getElementById(`question-card-${qNum}`);
    if (card) {
      const flagBtn = card.querySelector('.q-flag-btn');
      if (flagBtn) {
        flagBtn.classList.toggle('flagged', state.flagged.has(qNum));
        flagBtn.querySelector('svg').setAttribute('fill', state.flagged.has(qNum) ? 'currentColor' : 'none');
      }
    }
  }

  // --- SUBMIT EXAM & SCORING ---
  function submitExam() {
    if (state.submitted) {
      showResultModal();
      return;
    }

    const answeredCount = Object.keys(state.userAnswers).length;
    const confirmModal = document.getElementById('confirm-modal');
    const confirmMsg = document.getElementById('confirm-modal-msg');
    if (confirmModal && confirmMsg) {
      confirmMsg.textContent = `Bạn đã hoàn thành ${answeredCount} / 200 câu hỏi. Bạn có chắc chắn muốn kết thúc bài thi và xem bảng điểm chi tiết?`;
      confirmModal.classList.add('open');
      return;
    }

    finishExamAndScore();
  }

  function finishExamAndScore() {
    const confirmModal = document.getElementById('confirm-modal');
    if (confirmModal) confirmModal.classList.remove('open');

    state.submitted = true;
    state.timerRunning = false;
    persistState();

    evaluateAndShowScore();
    renderMatrixButtons();
    renderActivePart();
  }

  function evaluateAndShowScore() {
    let listeningCorrect = 0;
    let readingCorrect = 0;
    const partStats = {};

    state.data.parts.forEach(part => {
      let pCorrect = 0;
      let pTotal = 0;

      part.groups.forEach(group => {
        group.questions.forEach(q => {
          pTotal++;
          const userAns = state.userAnswers[q.qNum];
          if (userAns === q.correctLetter) {
            pCorrect++;
            if (part.partNumber <= 4) {
              listeningCorrect++;
            } else {
              readingCorrect++;
            }
          }
        });
      });

      partStats[part.partNumber] = {
        name: part.name,
        correct: pCorrect,
        total: pTotal,
        pct: ((pCorrect / pTotal) * 100).toFixed(0)
      };
    });

    const scaledListening = TOEIC_SCALE_LISTENING[Math.min(100, listeningCorrect)];
    const scaledReading = TOEIC_SCALE_READING[Math.min(100, readingCorrect)];
    const totalScore = scaledListening + scaledReading;
    const totalCorrect = listeningCorrect + readingCorrect;

    // Fill Modal
    dom.modalTotalScore.textContent = `${totalScore} / 990`;
    dom.modalCorrectRatio.textContent = `Đúng ${totalCorrect} / 200 câu (${((totalCorrect / 200) * 100).toFixed(1)}%)`;
    
    dom.modalListeningScore.textContent = `${scaledListening} / 495`;
    dom.modalListeningDetail.textContent = `Đúng ${listeningCorrect} / 100 câu`;

    dom.modalReadingScore.textContent = `${scaledReading} / 495`;
    dom.modalReadingDetail.textContent = `Đúng ${readingCorrect} / 100 câu`;

    dom.modalPartBreakdown.innerHTML = '';
    for (let pNum = 1; pNum <= 7; pNum++) {
      const p = partStats[pNum];
      const row = document.createElement('div');
      row.className = 'part-stat-row';
      row.innerHTML = `
        <span>Part ${pNum}: ${p.name}</span>
        <span style="color: ${p.pct >= 70 ? 'var(--success)' : (p.pct >= 50 ? 'var(--warning)' : 'var(--danger)')};">
          ${p.correct} / ${p.total} câu (${p.pct}%)
        </span>
      `;
      dom.modalPartBreakdown.appendChild(row);
    }

    showResultModal();
  }

  function showResultModal() {
    dom.resultModal.classList.add('open');
  }

  function hideResultModal() {
    dom.resultModal.classList.remove('open');
  }

  dom.submitBtn.addEventListener('click', submitExam);
  
  const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
  if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener('click', () => {
      document.getElementById('confirm-modal')?.classList.remove('open');
    });
  }

  const confirmSubmitBtn = document.getElementById('confirm-submit-btn');
  if (confirmSubmitBtn) {
    confirmSubmitBtn.addEventListener('click', () => {
      finishExamAndScore();
    });
  }
  
  dom.modalBtnReview.addEventListener('click', () => {
    hideResultModal();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  dom.modalBtnRetake.addEventListener('click', () => {
    const confirmReset = confirm('Bạn có chắc muốn xoá toàn bộ bài làm để làm lại từ đầu không?');
    if (confirmReset) {
      localStorage.removeItem(STORAGE_KEY);
      state.userAnswers = {};
      state.flagged = new Set();
      state.submitted = false;
      state.timerSeconds = 120 * 60;
      state.timerRunning = true;
      hideResultModal();
      updateProgressAndStats();
      renderActivePart();
    }
  });

  // --- LIGHTBOX IMAGE VIEWER ---
  function openLightbox(src) {
    dom.lightboxImg.src = src;
    dom.lightboxModal.classList.add('open');
  }

  dom.lightboxClose.addEventListener('click', () => {
    dom.lightboxModal.classList.remove('open');
  });

  dom.lightboxModal.addEventListener('click', (e) => {
    if (e.target === dom.lightboxModal) {
      dom.lightboxModal.classList.remove('open');
    }
  });

  // --- MATRIX DRAWER ITEM CLICK (MOBILE AUTO-CLOSE) ---
  if (dom.sidebarMatrix) {
    dom.sidebarMatrix.addEventListener('click', (e) => {
      if (e.target.closest('.matrix-btn') && window.innerWidth <= 1024) {
        setMatrixDrawer(false);
      }
    });
  }

  // --- FLOATING PREV / NEXT NAVIGATION ---
  dom.btnPrevQ.addEventListener('click', () => {
    if (state.currentQuestionNum > 1) {
      const prevNum = state.currentQuestionNum - 1;
      const partNum = getPartNumberForQuestion(prevNum);
      jumpToQuestion(prevNum, partNum);
    }
  });

  dom.btnNextQ.addEventListener('click', () => {
    if (state.currentQuestionNum < 200) {
      const nextNum = state.currentQuestionNum + 1;
      const partNum = getPartNumberForQuestion(nextNum);
      jumpToQuestion(nextNum, partNum);
    }
  });

  function getPartNumberForQuestion(qNum) {
    if (qNum <= 6) return 1;
    if (qNum <= 31) return 2;
    if (qNum <= 70) return 3;
    if (qNum <= 100) return 4;
    if (qNum <= 130) return 5;
    if (qNum <= 146) return 6;
    return 7;
  }

  // --- GLOBAL KEYBOARD SHORTCUTS ---
  document.addEventListener('keydown', (e) => {
    // Avoid triggering when user is in input or contenteditable
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    // Space: Play/Pause audio
    if (e.code === 'Space') {
      e.preventDefault();
      togglePlayPause();
    }

    // Keys 1, 2, 3, 4 or A, B, C, D to pick choices
    const key = e.key.toUpperCase();
    if (['A', 'B', 'C', 'D'].includes(key)) {
      selectChoice(state.currentQuestionNum, key);
    } else if (['1', '2', '3', '4'].includes(key)) {
      const letter = String.fromCharCode(65 + parseInt(key) - 1);
      selectChoice(state.currentQuestionNum, letter);
    }
  });

  // --- INSTRUCTIONS TEXT HELPER ---
  function getPartInstructions(partNum) {
    switch (partNum) {
      case 1:
        return "Xem từng bức tranh và nghe 4 câu mô tả (A, B, C, D). Chọn câu mô tả chính xác nhất những gì bạn thấy trong hình.";
      case 2:
        return "Nghe một câu hỏi/phát biểu và 3 câu hồi đáp (A, B, C). Chọn câu hồi đáp phù hợp nhất.";
      case 3:
        return "Nghe đoạn hội thoại giữa 2 hoặc 3 người. Mỗi đoạn có 3 câu hỏi với 4 lựa chọn (A, B, C, D).";
      case 4:
        return "Nghe một bài nói ngắn (thông báo, tin nhắn thoại, bản tin). Mỗi bài có 3 câu hỏi với 4 lựa chọn.";
      case 5:
        return "Chọn từ hoặc cụm từ thích hợp nhất (A, B, C, D) để điền vào chỗ trống hoàn thành câu.";
      case 6:
        return "Đọc 4 bài văn bản ngắn (memo, thư điện tử, thông báo). Chọn phương án phù hợp nhất cho mỗi chỗ trống.";
      case 7:
        return "Đọc các bài đọc đơn và bài đọc kép (quảng cáo, email, bài báo, tin nhắn). Đọc bài ở khung bên trái và trả lời các câu hỏi ở khung bên phải.";
      default:
        return "";
    }
  }

  // --- APP BOOTSTRAP ---
  function init() {
    // 1. Exam Pill Buttons Handler (Đề 1, Đề 2, Đề Xáo Trộn)
    document.querySelectorAll('.exam-pill-btn').forEach(btn => {
      const eIdAttr = btn.getAttribute('data-exam');
      if (!eIdAttr) return; // Skip buttons without data-exam (e.g. shuffle button)
      const eId = parseInt(eIdAttr, 10);
      btn.classList.toggle('active', eId === currentTestId);
      btn.addEventListener('click', () => {
        try {
          localStorage.setItem('TOEIC_SELECTED_TEST_ID', eId.toString());
          localStorage.setItem('TOEIC_SELECTED_STUDY_ID', eId.toString());
          if (eId === 3) {
            localStorage.removeItem('TOEIC_MASTER_PROGRESS_ULSA_3');
          }
        } catch (err) {}
        window.location.reload();
      });
    });

    // 1b. Button "🎲 Trộn Đề Mới (Random)"
    const btnShuffleExam = document.getElementById('btn-shuffle-exam-now');
    if (btnShuffleExam) {
      btnShuffleExam.addEventListener('click', () => {
        try {
          localStorage.setItem('TOEIC_SELECTED_TEST_ID', '3');
          localStorage.setItem('TOEIC_SELECTED_STUDY_ID', '3');
          localStorage.removeItem('TOEIC_MASTER_PROGRESS_ULSA_3');
        } catch (err) {}
        window.location.reload();
      });
    }

    // 2. Sync Study Hub Buttons
    document.querySelectorAll('.btn-study-hub, #banner-study-hub-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        try {
          localStorage.setItem('TOEIC_SELECTED_STUDY_ID', currentTestId.toString());
        } catch (err) {}
      });
    });

    const badge = document.getElementById('exam-badge');
    if (badge && state.data) {
      badge.textContent = state.data.insiderName || `Đề ${currentTestId}`;
    }

    if (state.data && state.data.insiderName) {
      document.title = "TOEIC Master - " + state.data.insiderName;
    }

    loadPersistedState();
    renderPartTabs();
    renderActivePart();
    updateModeUI();
    updateProgressAndStats();
    startTimer();
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
