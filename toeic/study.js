/**
 * TOEIC STUDY & MASTERY HUB - LOGIC CONTROLLER
 * Empowering foundational learners to achieve 100% test accuracy
 */

(function () {
  'use strict';

  const currentStudyId = parseInt(localStorage.getItem('TOEIC_SELECTED_STUDY_ID') || localStorage.getItem('TOEIC_SELECTED_TEST_ID') || '1', 10);
  const studyItems = (window.STUDY_DATA_LIST && window.STUDY_DATA_LIST[currentStudyId]) || window.STUDY_DATA || [];

  const state = {
    items: studyItems,
    currentQNum: 1,
    activeTab: 'mastery', // 'mastery' | 'dictation' | 'vocab'
    masteredSet: new Set(),
    audioSpeed: 1.0,
    sidebarFilter: 'all'
  };

  const STORAGE_KEY = 'TOEIC_MASTERED_QS_' + currentStudyId;
  function loadMastery() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        state.masteredSet = new Set(JSON.parse(saved));
      }
    } catch (e) {}
  }

  function saveMastery() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(state.masteredSet)));
    } catch (e) {}
  }

  // --- DOM REFERENCES ---
  const dom = {
    audio: document.getElementById('study-audio-core'),
    contentArea: document.getElementById('study-content-area'),
    matrixGrid: document.getElementById('study-matrix-grid'),
    masteryStat: document.getElementById('mastery-stat'),
    masteredBadge: document.getElementById('mastered-count-badge'),
    themeToggle: document.getElementById('study-theme-toggle'),

    tabMastery: document.getElementById('tab-btn-mastery'),
    tabDictation: document.getElementById('tab-btn-dictation'),
    tabVocab: document.getElementById('tab-btn-vocab'),
    tabRescue: document.getElementById('tab-btn-rescue'),

    filterAll: document.getElementById('filter-all-study'),
    filterUnmastered: document.getElementById('filter-unmastered'),

    lightbox: document.getElementById('study-lightbox'),
    lightboxImg: document.getElementById('study-lightbox-img'),
    lightboxClose: document.getElementById('study-lightbox-close'),

    // Mobile Drawer References
    mobileMatrixTrigger: document.getElementById('btn-open-mobile-matrix'),
    mobileMatrixDrawer: document.getElementById('mobile-matrix-drawer'),
    mobileDrawerClose: document.getElementById('mobile-drawer-close'),
    mobileDrawerBackdrop: document.getElementById('mobile-drawer-backdrop'),
    mobileMatrixGrid: document.getElementById('mobile-matrix-grid'),
    mobileMasteredBadge: document.getElementById('mobile-mastered-badge'),
    mobileFilterAll: document.getElementById('mobile-filter-all'),
    mobileFilterUnmastered: document.getElementById('mobile-filter-unmastered'),

    // Mobile Bottom Floating Nav References
    mobileBottomNav: document.getElementById('mobile-bottom-nav'),
    mobileNavPrev: document.getElementById('mobile-nav-prev'),
    mobileNavMatrixBtn: document.getElementById('mobile-nav-matrix-btn'),
    mobileNavQNum: document.getElementById('mobile-nav-qnum'),
    mobileNavNext: document.getElementById('mobile-nav-next')
  };

  // --- AUDIO HELPER ---
  function playAudio(urlLocal, urlCdn, speed = 1.0) {
    if (!urlLocal && !urlCdn) return;
    const targetUrl = urlLocal || urlCdn;
    dom.audio.src = targetUrl;
    dom.audio.playbackRate = speed;
    dom.audio.load();
    dom.audio.play().catch(err => {
      if (urlCdn && dom.audio.src !== urlCdn) {
        dom.audio.src = urlCdn;
        dom.audio.playbackRate = speed;
        dom.audio.play();
      }
    });
  }

  // --- MASTERY COUNTER ---
  function updateMasteryCounters() {
    const total = 200;
    const count = state.masteredSet.size;
    const pct = ((count / total) * 100).toFixed(1);
    dom.masteryStat.textContent = `${count} / ${total} câu (${pct}%)`;
    dom.masteredBadge.textContent = `${count} Đã thuộc`;
    if (dom.mobileMasteredBadge) {
      dom.mobileMasteredBadge.textContent = `${count} Đã thuộc`;
    }
    renderSidebarMatrix();
    saveMastery();
  }

  // --- TAB 1: QUESTION MASTERY (HỌC TỪNG CÂU) ---
  function renderMasteryView(qNum) {
    state.currentQNum = qNum;
    const item = state.items.find(i => i.qNum === qNum);
    if (!item) return;

    if (dom.audio) {
      dom.audio.pause();
      dom.audio.currentTime = 0;
    }

    // Cập nhật nút active trên thanh mục lục 200 câu
    dom.matrixGrid.querySelectorAll('.study-q-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.textContent, 10) === qNum);
    });

    // Cập nhật thanh điều hướng di động (Mobile Bottom Nav)
    if (dom.mobileNavQNum) {
      dom.mobileNavQNum.textContent = `Câu ${item.qNum} / 200`;
    }
    if (dom.mobileNavPrev) {
      dom.mobileNavPrev.disabled = (qNum === 1);
      dom.mobileNavPrev.style.opacity = (qNum === 1) ? '0.4' : '1';
    }
    if (dom.mobileNavNext) {
      dom.mobileNavNext.disabled = (qNum === 200);
      dom.mobileNavNext.style.opacity = (qNum === 200) ? '0.4' : '1';
    }
    if (dom.mobileBottomNav) {
      dom.mobileBottomNav.style.display = '';
    }

    const isMastered = state.masteredSet.has(qNum);
    dom.contentArea.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'mastery-card';

    // Top Badge & Navigation
    card.innerHTML = `
      <div class="mastery-badge-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="part-indicator-tag">Part ${item.part}: ${item.partName}</span>
          <span style="font-size: 15px; font-weight: 800;">Câu ${item.qNum} / 200</span>
        </div>
        <div>
          ${isMastered ? '<span style="color:var(--success); font-weight:800; font-size:13px;">✓ ĐÃ THÔNG THẠO (100%)</span>' : '<span style="color:var(--warning); font-weight:700; font-size:13px;">⚪ Đang học</span>'}
        </div>
      </div>
    `;

    // 1. Audio Box (if available) - Sticky Player
    if (item.audioLocal || item.audioCdn) {
      const audioBox = document.createElement('div');
      audioBox.className = 'study-audio-box';
      audioBox.innerHTML = `
        <div class="audio-box-badge">Part ${item.part} • Câu ${item.qNum}</div>
        <button class="btn-speed-slow" id="btn-play-slow" title="Nghe với tốc độ chậm (0.75x) để nghe rõ từng phát âm">
          🐢 Nghe Rùa Bò (0.75x)
        </button>
        <button class="study-tab-btn active" id="btn-play-normal" style="padding: 6px 16px; font-size: 12px;">
          ▶ Nghe Chuẩn (1.0x)
        </button>
        <button class="study-tab-btn" id="btn-replay-3s" style="padding: 6px 12px; font-size: 12px;">
          ↺ Lùi 3s
        </button>
        <span class="audio-shortcut-hint" style="font-size: 11px; color: var(--text-muted); margin-left: auto; display: flex; align-items: center; gap: 4px;">
          ⌨️ Phím Space để phát/dừng
        </span>
      `;

      const btnSlow = audioBox.querySelector('#btn-play-slow');
      const btnNormal = audioBox.querySelector('#btn-play-normal');
      const btnReplay = audioBox.querySelector('#btn-replay-3s');

      function updateAudioButtons() {
        const isPlaying = !dom.audio.paused;
        audioBox.classList.toggle('is-playing', isPlaying);
        if (isPlaying) {
          if (dom.audio.playbackRate === 0.75) {
            btnSlow.innerHTML = '⏸ Tạm Dừng (0.75x)';
            btnSlow.classList.add('active');
            btnNormal.innerHTML = '▶ Nghe Chuẩn (1.0x)';
            btnNormal.classList.remove('active');
          } else {
            btnNormal.innerHTML = '⏸ Tạm Dừng (1.0x)';
            btnNormal.classList.add('active');
            btnSlow.innerHTML = '🐢 Nghe Rùa Bò (0.75x)';
            btnSlow.classList.remove('active');
          }
        } else {
          btnSlow.innerHTML = '🐢 Nghe Rùa Bò (0.75x)';
          btnSlow.classList.remove('active');
          btnNormal.innerHTML = '▶ Nghe Chuẩn (1.0x)';
          btnNormal.classList.remove('active');
        }
      }

      dom.audio.onplay = updateAudioButtons;
      dom.audio.onpause = updateAudioButtons;
      dom.audio.onended = updateAudioButtons;

      btnSlow.addEventListener('click', () => {
        if (!dom.audio.paused && dom.audio.playbackRate === 0.75) {
          dom.audio.pause();
        } else {
          playAudio(item.audioLocal, item.audioCdn, 0.75);
        }
      });

      btnNormal.addEventListener('click', () => {
        if (!dom.audio.paused && dom.audio.playbackRate === 1.0) {
          dom.audio.pause();
        } else {
          playAudio(item.audioLocal, item.audioCdn, 1.0);
        }
      });

      btnReplay.addEventListener('click', () => {
        dom.audio.currentTime = Math.max(0, dom.audio.currentTime - 3);
        if (dom.audio.paused) dom.audio.play();
      });

      card.appendChild(audioBox);
    }

    // 2. Image (if Part 1 Photo or Part 7 Passage)
    if (item.imageLocal || item.imageCdn) {
      const imgWrap = document.createElement('div');
      imgWrap.style.cssText = 'text-align: center; margin-bottom: 20px; background: var(--bg-card-subtle); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);';
      
      const img = document.createElement('img');
      img.src = item.imageLocal || item.imageCdn;
      img.alt = `Question ${qNum}`;
      img.style.cssText = 'max-width: 100%; max-height: 400px; object-fit: contain; border-radius: 6px; cursor: zoom-in;';
      img.onerror = () => { img.src = item.imageCdn; };
      img.addEventListener('click', () => openLightbox(img.src));

      const hint = document.createElement('div');
      hint.style.cssText = 'font-size: 12.5px; font-weight: 700; color: var(--primary); margin-bottom: 8px; display: flex; align-items: center; justify-content: center; gap: 6px;';
      hint.innerHTML = '🔍 Bài đọc gốc • Nhấp vào ảnh để phóng to toàn màn hình';
      imgWrap.appendChild(hint);

      imgWrap.appendChild(img);
      card.appendChild(imgWrap);
    }

    // 2b. Passage Text (cho Part 6 và các câu đọc hiểu có văn bản)
    if (item.passage && item.passage.trim()) {
      const passBox = document.createElement('div');
      passBox.className = 'study-section-box';
      passBox.style.cssText = 'border-left: 4px solid var(--primary); background: var(--bg-card-subtle); margin-bottom: 20px; padding: 18px 22px; border-radius: var(--radius-md); border-top: 1px solid var(--border-subtle); border-right: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle);';
      passBox.innerHTML = `
        <div style="font-size: 15px; font-weight: 800; color: var(--primary); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <span>📖 Đoạn Văn Bản Gốc (Reading Passage) • Part ${item.part}</span>
        </div>
        <div style="font-size: 14.5px; line-height: 1.85; color: var(--text-primary); white-space: pre-line; font-family: inherit;">${item.passage}</div>
      `;
      card.appendChild(passBox);
    }

    // 3. Question Title
    const titleP = document.createElement('div');
    titleP.style.cssText = 'font-size: 16px; font-weight: 800; margin-bottom: 16px; color: var(--text-primary);';
    titleP.textContent = item.cleanTitle || item.questionText;
    card.appendChild(titleP);

    // 3.5. Mẹo Mất Gốc (Dành cho Part 5-6-7)
    if (item.zeroFoundation) {
      const zfBox = document.createElement('div');
      zfBox.className = 'zero-foundation-box';

      // Chuyển markdown formatting sang HTML
      let htmlGuide = item.zeroFoundation
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/_(.*?)_/g, '<i>$1</i>')
        .replace(/`(.*?)`/g, "<span style='color:var(--danger); font-weight:800; background:rgba(239,68,68,0.1); padding:2px 6px; border-radius:4px;'>$1</span>");

      let boxTitle = '👶 CỨU CÁNH CHO NGƯỜI MẤT GỐC (KHÔNG CẦN DỊCH!)';
      if (item.part === 6) {
        boxTitle = '👶 CỨU CÁNH PART 6 (CHỈ NHÌN ĐÚNG 1 CÂU NÀY - KHÔNG ĐỌC CẢ BÀI)';
      } else if (item.part === 7) {
        boxTitle = '👶 CỨU CÁNH PART 7 (TỌA ĐỘ MANH MỐI BÀI ĐỌC - SĂN CHỮ TRONG BÀI)';
      }

      zfBox.innerHTML = `
        <div class="zero-foundation-header">
          <span style="font-size: 20px;">⚡</span>
          <span>${boxTitle}</span>
        </div>
        <div class="zero-foundation-body">
          ${htmlGuide}
        </div>
      `;
      card.appendChild(zfBox);
    }

    // 4. Vocabulary Box
    if (item.vocab && item.vocab.length > 0) {
      const vocabBox = document.createElement('div');
      vocabBox.className = 'study-section-box';
      vocabBox.innerHTML = `
        <div class="study-section-title vocab">
          <span>💡 1. Bẻ Khóa Từ Vựng Then Chốt</span>
        </div>
      `;
      const chips = document.createElement('div');
      chips.className = 'vocab-chips-container';

      item.vocab.forEach(v => {
        const chip = document.createElement('div');
        chip.className = 'vocab-card-chip';
        chip.innerHTML = `
          <div class="vocab-word">${v.word}</div>
          <div class="vocab-ipa">${v.ipa} (${v.pos})</div>
          <div class="vocab-meaning">${v.meaning}</div>
        `;
        chips.appendChild(chip);
      });

      vocabBox.appendChild(chips);
      card.appendChild(vocabBox);
    }

    // 5. Bilingual Translation Box
    if (item.translation) {
      const transBox = document.createElement('div');
      transBox.className = 'study-section-box';
      transBox.innerHTML = `
        <div class="study-section-title trans">
          <span>📜 2. Lời Dịch Song Ngữ Chi Tiết</span>
        </div>
        <div class="bilingual-box">${item.translation}</div>
      `;
      card.appendChild(transBox);
    }

    // 6. Tactics & Traps (Ngữ pháp & Mẹo bẫy)
    const trapBox = document.createElement('div');
    trapBox.className = 'study-section-box';
    trapBox.innerHTML = `
      <div class="study-section-title explain">
        <span>⚡ 3. Phân Tích Vì Sao Chọn (${item.correctLetter}) & Mẹo Bẫy</span>
      </div>
      <div style="font-size: 14.5px; color: var(--text-secondary); line-height: 1.7; margin-bottom: 8px; white-space: pre-line;">
        ${item.explanation || 'Xem xét kỹ ngữ cảnh ngữ pháp và từ khóa then chốt.'}
      </div>
      <div style="font-size: 13.5px; color: var(--accent-orange); font-weight: 700; border-top: 1px dashed var(--border-subtle); padding-top: 8px; white-space: pre-line;">
        ${item.trapNote || ''}
      </div>
    `;
    card.appendChild(trapBox);

    // 7. Interactive Drill Box (Thực hành ngay)
    const drillBox = document.createElement('div');
    drillBox.className = 'interactive-drill-box';
    drillBox.innerHTML = `
      <div class="drill-title">🎯 4. Thử Làm Lại Câu Này (Bấm chọn đáp án đúng):</div>
      <div class="drill-question-prompt">
        <span class="drill-qnum-tag">Câu ${item.qNum}</span>
        <span class="drill-qtext">${item.cleanTitle || item.questionText}</span>
      </div>
      <div class="drill-choices-list"></div>
      <div class="drill-feedback-banner" id="drill-fb-success">
        <span>🎉 XUẤT SẮC! Bạn đã chọn đúng đáp án (${item.correctLetter}). Câu này đã được lưu vào danh sách THÀNH THẠO!</span>
        <button class="study-tab-btn active" id="btn-next-mastery" style="padding: 6px 14px; font-size: 12px; margin-left: 12px; cursor: pointer;">
          Sang câu tiếp theo ►
        </button>
      </div>
      <div class="drill-feedback-banner" id="drill-fb-error">
        ⚠️ Chưa chính xác rồi! Hãy đọc lại phần "Bẻ khóa từ vựng" và "Phân tích ngữ pháp" phía trên rồi thử lại nhé!
      </div>
    `;

    const choicesList = drillBox.querySelector('.drill-choices-list');
    const fbSuccess = drillBox.querySelector('#drill-fb-success');
    const fbError = drillBox.querySelector('#drill-fb-error');

    const defaultOpts = ['(A)', '(B)', '(C)', '(D)'];
    const opts = (item.choices && item.choices.length > 0) ? item.choices : defaultOpts;

    opts.forEach((cText, idx) => {
      const letter = String.fromCharCode(65 + idx);
      const btn = document.createElement('button');
      btn.className = 'drill-choice-btn';
      const cleanChoice = (cText || '').replace(/^\(?[A-D]\)?[\.\s]*/, '').trim();
      const displayContent = cleanChoice ? cleanChoice : cText;
      btn.innerHTML = `<span style="width:26px; height:26px; border-radius:50%; background:var(--bg-card); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:12px; flex-shrink:0;">${letter}</span> <span>${displayContent}</span>`;

      btn.addEventListener('click', () => {
        choicesList.querySelectorAll('.drill-choice-btn').forEach(b => b.classList.remove('selected', 'is-correct', 'is-wrong'));
        btn.classList.add('selected');

        if (letter === item.correctLetter) {
          btn.classList.add('is-correct');
          fbError.classList.remove('show-error');
          fbSuccess.classList.add('show-success');
          state.masteredSet.add(qNum);
          updateMasteryCounters();
        } else {
          btn.classList.add('is-wrong');
          fbSuccess.classList.remove('show-success');
          fbError.classList.add('show-error');
        }
      });

      choicesList.appendChild(btn);
    });

    drillBox.querySelector('#btn-next-mastery')?.addEventListener('click', () => {
      if (qNum < 200) renderMasteryView(qNum + 1);
    });

    card.appendChild(drillBox);

    // Navigation Footers (Prev / Next)
    const footerNav = document.createElement('div');
    footerNav.style.cssText = 'display: flex; justify-content: space-between; margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--border-subtle);';
    footerNav.innerHTML = `
      <button class="btn-back-test" id="btn-prev-lesson" ${qNum === 1 ? 'disabled style="opacity:0.4;"' : ''}>
        ◄ Câu ${Math.max(1, qNum - 1)}
      </button>
      <button class="btn-back-test" id="btn-next-lesson" ${qNum === 200 ? 'disabled style="opacity:0.4;"' : ''}>
        Câu ${Math.min(200, qNum + 1)} ►
      </button>
    `;

    footerNav.querySelector('#btn-prev-lesson').addEventListener('click', () => {
      if (qNum > 1) renderMasteryView(qNum - 1);
    });
    footerNav.querySelector('#btn-next-lesson').addEventListener('click', () => {
      if (qNum < 200) renderMasteryView(qNum + 1);
    });

    card.appendChild(footerNav);

    dom.contentArea.appendChild(card);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- TAB 2: DICTATION TRAINER (NGHE CHÉP CHÍNH TẢ) ---
  function renderDictationView() {
    dom.contentArea.innerHTML = '';

    const listeningItems = state.items.filter(i => i.part <= 4 && i.audioScript);
    let curDictIndex = 0;

    const container = document.createElement('div');
    container.className = 'dictation-container';

    function loadDictationItem(idx) {
      curDictIndex = idx;
      const curItem = listeningItems[idx];
      const targetSentence = curItem.dictationSentence || curItem.questionText;
      const blankWord = curItem.dictationBlank || "correct";

      container.innerHTML = `
        <div class="dictation-hero">
          <span class="part-indicator-tag">Part ${curItem.part} - Câu ${curItem.qNum}</span>
          <h2 style="margin-top: 10px;">Luyện Tai Nghe & Chép Chính Tả</h2>
          <p style="color: var(--text-secondary); font-size: 14px;">Nghe đoạn audio bên dưới và gõ từ còn thiếu vào ô trống để rèn luyện phản xạ nghe từng âm.</p>
        </div>

        <div class="dictation-audio-center">
          <button class="btn-speed-slow" id="dict-play-slow">
            🐢 Nghe chậm (0.75x)
          </button>
          <button class="study-tab-btn active" id="dict-play-normal">
            ▶ Nghe chuẩn (1.0x)
          </button>
        </div>

        <div style="font-size: 20px; font-weight: 700; text-align: center; margin-bottom: 20px; color: var(--primary);">
          "${targetSentence.replace(blankWord, '_______')}"
        </div>

        <div class="dictation-input-area">
          <input type="text" class="dictation-input-box" id="dict-input" placeholder="Gõ từ bạn nghe được vào đây..." autocomplete="off">
          <div class="dictation-hint-text" id="dict-hint">Gợi ý: Từ này có ${blankWord.length} chữ cái. Bắt đầu bằng chữ "${blankWord[0].toUpperCase()}"</div>
          
          <div style="display: flex; gap: 10px; justify-content: center; margin-top: 8px;">
            <button class="study-tab-btn" id="dict-btn-hint">💡 Xem gợi ý</button>
            <button class="study-tab-btn active" id="dict-btn-check">Kiểm tra</button>
          </div>
          <div id="dict-result-msg" style="text-align: center; font-weight: 700; margin-top: 10px; display: none;"></div>
        </div>

        <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--border-subtle); padding-top: 16px; margin-top: 24px;">
          <button class="btn-back-test" id="dict-prev" ${idx === 0 ? 'disabled style="opacity:0.4;"' : ''}>◄ Câu trước</button>
          <span style="font-weight: 700; font-size: 13px; align-self: center;">${idx + 1} / ${listeningItems.length} câu nghe</span>
          <button class="btn-back-test" id="dict-next" ${idx === listeningItems.length - 1 ? 'disabled style="opacity:0.4;"' : ''}>Câu tiếp theo ►</button>
        </div>
      `;

      container.querySelector('#dict-play-slow').addEventListener('click', () => {
        playAudio(curItem.audioLocal, curItem.audioCdn, 0.75);
      });
      container.querySelector('#dict-play-normal').addEventListener('click', () => {
        playAudio(curItem.audioLocal, curItem.audioCdn, 1.0);
      });

      const input = container.querySelector('#dict-input');
      const msg = container.querySelector('#dict-result-msg');

      container.querySelector('#dict-btn-check').addEventListener('click', () => {
        const val = input.value.trim().toLowerCase();
        if (val === blankWord.toLowerCase()) {
          msg.style.display = 'block';
          msg.style.color = 'var(--success)';
          msg.innerHTML = `✓ CHÍNH XÁC! Lời thoại đầy đủ: <b>"${targetSentence}"</b>`;
          state.masteredSet.add(curItem.qNum);
          updateMasteryCounters();
        } else {
          msg.style.display = 'block';
          msg.style.color = 'var(--danger)';
          msg.textContent = `Chưa đúng rồi! Hãy bấm "Nghe chậm" và thử lại.`;
        }
      });

      container.querySelector('#dict-btn-hint').addEventListener('click', () => {
        input.value = blankWord.substring(0, Math.ceil(blankWord.length / 2));
      });

      container.querySelector('#dict-prev').addEventListener('click', () => {
        if (curDictIndex > 0) loadDictationItem(curDictIndex - 1);
      });
      container.querySelector('#dict-next').addEventListener('click', () => {
        if (curDictIndex < listeningItems.length - 1) loadDictationItem(curDictIndex + 1);
      });
    }

    loadDictationItem(0);
    dom.contentArea.appendChild(container);
  }

  // --- TAB 3: VOCABULARY VAULT (SỔ TAY TỪ VỰNG TOÀN DIỆN) ---
  const vocabState = {
    search: '',
    selectedPart: 'all',
    uniqueOnly: false
  };

  function speakWord(word) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const clean = word.replace(/\(.*?\)/g, '').trim();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'en-US';
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  }

  function renderVocabView() {
    dom.contentArea.innerHTML = '';

    // Collect all vocab
    const rawVocab = [];
    state.items.forEach(i => {
      if (i.vocab) {
        i.vocab.forEach(v => {
          rawVocab.push({ ...v, qNum: i.qNum, part: i.part, partName: i.partName });
        });
      }
    });

    const uniqueCount = new Set(rawVocab.map(v => v.word.toLowerCase().trim())).size;

    const wrap = document.createElement('div');
    wrap.className = 'vocab-vault-wrap';
    wrap.innerHTML = `
      <div class="vocab-vault-header">
        <h2 style="font-size: 22px; font-weight: 800; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
          🗂️ Sổ Tay Từ Vựng Toàn Diện (${rawVocab.length} Từ Then Chốt)
        </h2>
        <p style="color: var(--text-secondary); font-size: 14px;">
          Toàn bộ từ vựng trọng tâm trích xuất từ 200 câu thi thực tế. Bấm biểu tượng 🔊 để nghe phát âm giọng Mỹ bản xứ!
        </p>
      </div>

      <!-- Controls bar: Search & Filters -->
      <div class="vocab-vault-controls">
        <div class="vocab-search-wrap">
          <span style="font-size: 15px;">🔍</span>
          <input type="text" id="vocab-search-input" class="vocab-search-input" placeholder="Tìm kiếm từ tiếng Anh hoặc nghĩa tiếng Việt..." value="${vocabState.search}">
          ${vocabState.search ? '<button id="vocab-search-clear" style="background:none; border:none; cursor:pointer; color:var(--text-muted); font-size:14px;">✕</button>' : ''}
        </div>

        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; cursor: pointer; user-select: none;">
            <input type="checkbox" id="vocab-unique-toggle" ${vocabState.uniqueOnly ? 'checked' : ''}>
            <span>Chỉ từ không trùng (${uniqueCount} từ)</span>
          </label>
        </div>
      </div>

      <!-- Part Filter Pills -->
      <div class="vocab-part-filters" id="vocab-part-filters">
        <button class="vocab-filter-pill ${vocabState.selectedPart === 'all' ? 'active' : ''}" data-part="all">
          Tất cả (${rawVocab.length})
        </button>
        ${[1, 2, 3, 4, 5, 6, 7].map(p => {
          const count = rawVocab.filter(v => v.part === p).length;
          return `<button class="vocab-filter-pill ${vocabState.selectedPart === String(p) ? 'active' : ''}" data-part="${p}">Part ${p} (${count})</button>`;
        }).join('')}
      </div>

      <!-- Stats Bar -->
      <div id="vocab-stat-bar" style="font-size: 13px; font-weight: 700; color: var(--text-muted); margin: 12px 0 16px;">
        Đang hiển thị...
      </div>

      <!-- Grid -->
      <div class="flashcards-grid" id="vocab-cards-grid"></div>
    `;

    dom.contentArea.appendChild(wrap);

    // Filter Logic
    function updateGrid() {
      let filtered = rawVocab;

      // Filter by Part
      if (vocabState.selectedPart !== 'all') {
        const pNum = parseInt(vocabState.selectedPart, 10);
        filtered = filtered.filter(v => v.part === pNum);
      }

      // Filter by Search Query
      if (vocabState.search.trim()) {
        const q = vocabState.search.trim().toLowerCase();
        filtered = filtered.filter(v => 
          (v.word && v.word.toLowerCase().includes(q)) || 
          (v.meaning && v.meaning.toLowerCase().includes(q)) ||
          (v.ipa && v.ipa.toLowerCase().includes(q))
        );
      }

      // Deduplicate if toggle on
      if (vocabState.uniqueOnly) {
        const seen = new Set();
        const deduped = [];
        filtered.forEach(v => {
          const key = v.word.toLowerCase().trim();
          if (!seen.has(key)) {
            seen.add(key);
            deduped.push(v);
          }
        });
        filtered = deduped;
      }

      // Update Stat
      const statBar = wrap.querySelector('#vocab-stat-bar');
      if (statBar) {
        statBar.textContent = `Hiển thị ${filtered.length} từ vựng phù hợp`;
      }

      const grid = wrap.querySelector('#vocab-cards-grid');
      grid.innerHTML = '';

      if (filtered.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
            <div style="font-size: 40px; margin-bottom: 12px;">🔍</div>
            <div style="font-size: 16px; font-weight: 700;">Không tìm thấy từ vựng nào khớp với "${vocabState.search}"</div>
            <p style="font-size: 13px; margin-top: 6px;">Hãy thử gõ từ khóa khác hoặc chuyển sang Part khác nhé!</p>
          </div>
        `;
        return;
      }

      filtered.forEach(v => {
        const card = document.createElement('div');
        card.className = 'flashcard-item';
        card.innerHTML = `
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span class="vocab-badge-part">Part ${v.part} • Câu ${v.qNum}</span>
              <button class="vocab-speak-btn" title="Phát âm từ này (giọng chuẩn Mỹ)">
                🔊 Nghe
              </button>
            </div>
            <div class="flashcard-front">${v.word}</div>
            <div class="flashcard-ipa">${v.ipa} • <span style="color:var(--primary); font-weight:700;">${v.pos}</span></div>
          </div>
          <div class="flashcard-back">
            <div class="flashcard-meaning">${v.meaning}</div>
            <button class="vocab-jump-btn" title="Chuyển đến học câu hỏi này">
              📖 Xem ngữ cảnh câu ${v.qNum} ►
            </button>
          </div>
        `;

        // Click speaker
        card.querySelector('.vocab-speak-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          speakWord(v.word);
        });

        // Click jump
        card.querySelector('.vocab-jump-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          renderMasteryView(v.qNum);
          switchTab('mastery');
        });

        // Click card also jumps to question
        card.addEventListener('click', () => {
          renderMasteryView(v.qNum);
          switchTab('mastery');
        });

        grid.appendChild(card);
      });
    }

    // Attach Event Listeners
    const searchInput = wrap.querySelector('#vocab-search-input');
    searchInput.addEventListener('input', (e) => {
      vocabState.search = e.target.value;
      updateGrid();
    });

    const clearBtn = wrap.querySelector('#vocab-search-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        vocabState.search = '';
        searchInput.value = '';
        renderVocabView();
      });
    }

    const uniqueToggle = wrap.querySelector('#vocab-unique-toggle');
    uniqueToggle.addEventListener('change', (e) => {
      vocabState.uniqueOnly = e.target.checked;
      updateGrid();
    });

    wrap.querySelectorAll('.vocab-filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        wrap.querySelectorAll('.vocab-filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        vocabState.selectedPart = btn.getAttribute('data-part');
        updateGrid();
      });
    });

    updateGrid();
  }

  // --- SIDEBAR & MOBILE MATRIX (200 QUESTIONS) ---
  function renderSidebarMatrix() {
    // 1. Render Desktop Grid
    if (dom.matrixGrid) {
      dom.matrixGrid.innerHTML = '';
      state.items.forEach(item => {
        const isMastered = state.masteredSet.has(item.qNum);
        if (state.sidebarFilter === 'unmastered' && isMastered) return;

        const btn = document.createElement('button');
        btn.className = `study-q-btn ${item.qNum === state.currentQNum ? 'active' : ''} ${isMastered ? 'mastered' : ''}`;
        btn.textContent = item.qNum;

        btn.addEventListener('click', () => {
          renderMasteryView(item.qNum);
          switchTab('mastery');
        });

        dom.matrixGrid.appendChild(btn);
      });
    }

    // 2. Render Mobile Drawer Grid
    if (dom.mobileMatrixGrid) {
      dom.mobileMatrixGrid.innerHTML = '';
      state.items.forEach(item => {
        const isMastered = state.masteredSet.has(item.qNum);
        if (state.sidebarFilter === 'unmastered' && isMastered) return;

        const btn = document.createElement('button');
        btn.className = `study-q-btn ${item.qNum === state.currentQNum ? 'active' : ''} ${isMastered ? 'mastered' : ''}`;
        btn.textContent = item.qNum;

        btn.addEventListener('click', () => {
          renderMasteryView(item.qNum);
          switchTab('mastery');
          closeMobileDrawer();
        });

        dom.mobileMatrixGrid.appendChild(btn);
      });
    }
  }

  function openMobileDrawer() {
    if (dom.mobileMatrixDrawer) {
      dom.mobileMatrixDrawer.classList.add('is-open');
      renderSidebarMatrix();
    }
  }

  function closeMobileDrawer() {
    if (dom.mobileMatrixDrawer) {
      dom.mobileMatrixDrawer.classList.remove('is-open');
    }
  }

  dom.mobileMatrixTrigger?.addEventListener('click', openMobileDrawer);
  dom.mobileDrawerClose?.addEventListener('click', closeMobileDrawer);
  dom.mobileDrawerBackdrop?.addEventListener('click', closeMobileDrawer);

  dom.filterAll.addEventListener('click', () => {
    state.sidebarFilter = 'all';
    dom.filterAll.classList.add('active');
    dom.filterUnmastered.classList.remove('active');
    if (dom.mobileFilterAll) dom.mobileFilterAll.classList.add('active');
    if (dom.mobileFilterUnmastered) dom.mobileFilterUnmastered.classList.remove('active');
    renderSidebarMatrix();
  });

  dom.filterUnmastered.addEventListener('click', () => {
    state.sidebarFilter = 'unmastered';
    dom.filterUnmastered.classList.add('active');
    dom.filterAll.classList.remove('active');
    if (dom.mobileFilterUnmastered) dom.mobileFilterUnmastered.classList.add('active');
    if (dom.mobileFilterAll) dom.mobileFilterAll.classList.remove('active');
    renderSidebarMatrix();
  });

  dom.mobileFilterAll?.addEventListener('click', () => {
    state.sidebarFilter = 'all';
    dom.filterAll.classList.add('active');
    dom.filterUnmastered.classList.remove('active');
    dom.mobileFilterAll.classList.add('active');
    dom.mobileFilterUnmastered.classList.remove('active');
    renderSidebarMatrix();
  });

  dom.mobileFilterUnmastered?.addEventListener('click', () => {
    state.sidebarFilter = 'unmastered';
    dom.filterUnmastered.classList.add('active');
    dom.filterAll.classList.remove('active');
    dom.mobileFilterUnmastered.classList.add('active');
    dom.mobileFilterAll.classList.remove('active');
    renderSidebarMatrix();
  });

  // --- TAB 4: CẤP CỨU TRƯỚC GIỜ THI ---
  function renderRescueView() {
    const box = (color, title, body) => `
      <div style="border-left:5px solid ${color}; background:var(--bg-card-subtle); border-radius:10px; padding:16px 20px; margin-bottom:18px;">
        <div style="font-size:16px; font-weight:800; color:${color}; margin-bottom:10px;">${title}</div>
        <div style="font-size:14.5px; line-height:1.85; color:var(--text-primary);">${body}</div>
      </div>`;

    const t = (a, b) => `<tr><td style="padding:6px 10px; border-bottom:1px solid var(--border-subtle); font-weight:800; color:var(--primary);">${a}</td><td style="padding:6px 10px; border-bottom:1px solid var(--border-subtle);">${b}</td></tr>`;

    dom.contentArea.innerHTML = `
      <div class="mastery-card">
        <h2 style="font-size:22px; font-weight:800; margin-bottom:6px;">🚑 Cấp Cứu Trước Giờ Thi (cho người mất gốc)</h2>
        <p style="color:var(--text-secondary); font-size:14px; margin-bottom:18px;">Thời gian gấp thì <b>đừng cố hiểu hết</b>. Hãy lấy điểm chỗ dễ trước, phần khó dùng luật máy móc.</p>

        ${box('#16a34a', '🥇 BƯỚC 1: Ưu tiên lấy điểm ở đâu?', `
          <b>Part 1 (câu 1–6) + Part 2 (câu 7–31)</b> = 31 câu, ngắn, dễ nhất → <b>học kỹ trước</b>, mỗi ngày nghe lại + dùng tab Nghe Chép Chính Tả.<br>
          <b>Part 5 (101–130)</b> = 30 câu, chỉ cần <b>luật nhìn đáp án</b> (bên dưới), không cần dịch.<br>
          <b>Part 3-4, 6-7</b>: câu dài, mất gốc rất khó → làm theo mẹo bên dưới, <b>đừng dành quá nhiều thời gian</b>.`)}

        ${box('#d97706', '🔎 BƯỚC 2: Part 5 — nhìn 4 đáp án là biết dạng câu', `
          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            ${t('4 đáp án giống nhau, khác ĐUÔI', 'Câu <b>từ loại</b>. Nhìn từ ngay TRƯỚC chỗ trống:<br>• <b>the / a / his / good / new / of</b> → chọn <b>DANH TỪ</b> (đuôi <b>-tion, -ment, -ness, -ity, -er, -ance</b>)<br>• <b>is / are / very / be</b> → chọn <b>TÍNH TỪ</b> (đuôi <b>-ful, -ive, -al, -able, -ous</b>)<br>• Chỗ trống đứng giữa <b>chủ ngữ và động từ</b> hoặc ngay <b>sau động từ</b> → <b>TRẠNG TỪ</b> (đuôi <b>-ly</b>)')}
            ${t('Đáp án là 1 động từ nhiều dạng', 'Câu <b>chia động từ</b>:<br>• Có <b>will / can / must / to</b> đứng trước → <b>động từ gốc</b><br>• Có <b>has / have / had</b> đứng trước → <b>V-ed (quá khứ phân từ)</b><br>• Có <b>is / are / was + by</b> → <b>V-ed (bị động)</b><br>• Có <b>yesterday / last</b> → <b>V-ed</b>; <b>tomorrow / next</b> → <b>will + V</b>')}
            ${t('Đáp án là giới từ', 'Nhìn từ SAU chỗ trống:<br>• <b>năm / tháng (2002, May)</b> → <b>since / in</b><br>• <b>một khoảng thời gian (3 years)</b> → <b>for</b><br>• <b>ngày (Monday) / giờ (5 pm)</b> → <b>on / at</b><br>• <b>địa điểm</b> → <b>in / at</b>')}
            ${t('Đáp án là đại từ', 'Sau chỗ trống là danh từ → <b>his / her / their / my / our</b>.<br>Trước chỗ trống là động từ → <b>him / her / them / us</b>.<br>Chỗ trống đứng đầu câu làm chủ → <b>he / she / they / we</b>.')}
            ${t('4 đáp án khác hẳn nghĩa', 'Câu <b>từ vựng</b>: chỉ nhìn 1-2 từ NGAY CẠNH chỗ trống, chọn từ đi cặp tự nhiên nhất. <b>Không biết thì loại 2 đáp án vô lý rồi đoán.</b>')}
          </table>`)}

        ${box('#7c3aed', '📖 BƯỚC 3: Part 6 & 7 — không hiểu hết vẫn làm được', `
          <b>1.</b> Đọc <b>câu hỏi trước</b>, gạch từ khóa (<b>tên người, số, ngày, tiền, địa điểm</b>).<br>
          <b>2.</b> Quay lại bài đọc, <b>tìm đúng từ khóa đó</b> (chữ hoa, con số dễ thấy nhất), đọc 1 câu trước + 1 câu sau.<br>
          <b>3.</b> Đáp án đúng thường <b>dùng từ ĐỒNG NGHĨA</b> với bài đọc, đáp án <b>copy y nguyên</b> một cụm dài trong bài thường là <b>bẫy</b>.<br>
          <b>4.</b> Câu hỏi <b>"Why is the email written?"</b> → đáp án nằm ở <b>câu đầu</b> bài. <b>"What will happen next?"</b> → nằm ở <b>câu cuối</b>.<br>
          <b>5.</b> Part 6 chọn câu điền vào đoạn văn: chọn câu có từ <b>nối ý (however, also, therefore)</b> khớp với câu trước và sau.`)}

        ${box('#dc2626', '🎧 BƯỚC 4: Part 2 — luật tai nghe (câu 7–31)', `
          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            ${t('Who', 'Trả lời bằng <b>tên người / chức vụ</b>')}
            ${t('When', 'Trả lời bằng <b>thời gian</b> (at 5, next week, tomorrow)')}
            ${t('Where', 'Trả lời bằng <b>địa điểm</b> (in the office, on the second floor)')}
            ${t('Why', 'Trả lời bằng <b>lý do</b> (Because…, To…)')}
            ${t('How much / many', 'Trả lời bằng <b>số lượng / giá</b>')}
            ${t('Câu hỏi Wh-', '<b>Không chọn</b> đáp án bắt đầu bằng <b>Yes / No</b>')}
            ${t('Bẫy', 'Đáp án có <b>từ nghe giống y hệt</b> từ trong câu hỏi → thường là <b>SAI</b>')}
          </table>`)}

        ${box('#0891b2', '🎯 BƯỚC 5: Đoán thông minh khi bí', `
          • <b>KHÔNG BỎ TRỐNG</b> câu nào — TOEIC <b>không trừ điểm</b> câu sai.<br>
          • Câu quá khó: <b>loại đáp án vô lý</b> (đáp án lệch chủ đề, đáp án có từ tuyệt đối như <b>always, never, only</b> thường sai), rồi chọn 1 trong 2 còn lại.<br>
          • Câu hoàn toàn không đoán được: <b>chọn cùng 1 đáp án</b> cho tất cả (ví dụ luôn chọn C) để xác suất trúng ổn định ~25%.<br>
          • Đừng ngồi 2 phút cho 1 câu; Part 5 mỗi câu <b>tối đa 20–30 giây</b>.`)}

        ${box('#475569', '📝 15 TỪ HAY GẶP NHẤT — học thuộc ngay', `
          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            ${t('schedule', 'lịch trình')}${t('meeting', 'cuộc họp')}${t('manager', 'quản lý')}
            ${t('order', 'đơn hàng / đặt hàng')}${t('report', 'báo cáo')}${t('deadline', 'hạn chót')}
            ${t('customer', 'khách hàng')}${t('delivery', 'giao hàng')}${t('invoice', 'hóa đơn')}
            ${t('employee', 'nhân viên')}${t('apply', 'ứng tuyển / nộp đơn')}${t('available', 'có sẵn / rảnh')}
            ${t('require', 'yêu cầu')}${t('increase', 'tăng')}${t('reduce', 'giảm')}
          </table>`)}

        <div style="text-align:center; margin-top:16px;">
          <button class="study-tab-btn active" id="rescue-go-p5" style="padding:10px 22px; font-size:14px;">▶ Đi làm thử Part 5 (câu 101) ngay</button>
        </div>
      </div>`;

    dom.contentArea.querySelector('#rescue-go-p5').addEventListener('click', () => {
      switchTab('mastery');
      renderMasteryView(101);
    });
  }

  // --- TAB SWITCHER ---
  function switchTab(tab) {
    state.activeTab = tab;
    dom.tabMastery.classList.toggle('active', tab === 'mastery');
    dom.tabDictation.classList.toggle('active', tab === 'dictation');
    dom.tabVocab.classList.toggle('active', tab === 'vocab');
    dom.tabRescue.classList.toggle('active', tab === 'rescue');

    if (tab === 'mastery') {
      if (dom.mobileBottomNav) dom.mobileBottomNav.style.display = '';
      renderMasteryView(state.currentQNum);
    } else {
      if (dom.mobileBottomNav) dom.mobileBottomNav.style.display = 'none';
      if (tab === 'dictation') renderDictationView();
      else if (tab === 'vocab') renderVocabView();
      else if (tab === 'rescue') renderRescueView();
    }
  }

  dom.tabMastery.addEventListener('click', () => switchTab('mastery'));
  dom.tabDictation.addEventListener('click', () => switchTab('dictation'));
  dom.tabVocab.addEventListener('click', () => switchTab('vocab'));
  dom.tabRescue.addEventListener('click', () => switchTab('rescue'));

  // Mobile Floating Bottom Nav Events
  dom.mobileNavPrev?.addEventListener('click', () => {
    if (state.currentQNum > 1) renderMasteryView(state.currentQNum - 1);
  });

  dom.mobileNavNext?.addEventListener('click', () => {
    if (state.currentQNum < 200) renderMasteryView(state.currentQNum + 1);
  });

  dom.mobileNavMatrixBtn?.addEventListener('click', openMobileDrawer);

  // Mobile Touch Swipe Gesture: Swipe left to go to Next Question, Swipe right for Previous Question
  let touchStartX = 0;
  let touchStartY = 0;

  dom.contentArea.addEventListener('touchstart', (e) => {
    if (state.activeTab !== 'mastery') return;
    if (e.changedTouches && e.changedTouches.length > 0) {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }
  }, { passive: true });

  dom.contentArea.addEventListener('touchend', (e) => {
    if (state.activeTab !== 'mastery') return;
    if (e.changedTouches && e.changedTouches.length > 0) {
      const touchEndX = e.changedTouches[0].screenX;
      const touchEndY = e.changedTouches[0].screenY;
      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;

      // Only trigger if horizontal swipe is decisive and not a vertical scroll
      if (Math.abs(diffX) > 65 && Math.abs(diffY) < 50) {
        if (diffX < 0 && state.currentQNum < 200) {
          // Swipe left -> Next question
          renderMasteryView(state.currentQNum + 1);
        } else if (diffX > 0 && state.currentQNum > 1) {
          // Swipe right -> Prev question
          renderMasteryView(state.currentQNum - 1);
        }
      }
    }
  }, { passive: true });

  // --- LIGHTBOX ---
  function openLightbox(src) {
    dom.lightboxImg.src = src;
    dom.lightbox.style.display = 'flex';
  }

  dom.lightboxClose.addEventListener('click', () => {
    dom.lightbox.style.display = 'none';
  });

  dom.lightbox.addEventListener('click', (e) => {
    if (e.target === dom.lightbox) dom.lightbox.style.display = 'none';
  });

  // --- THEME ---
  dom.themeToggle.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
  });

  // Spacebar audio play
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      if (dom.audio.paused) dom.audio.play();
      else dom.audio.pause();
    }
  });

  // --- STUDY EXAM PILLS SETUP ---
  document.querySelectorAll('.study-pill-btn').forEach(btn => {
    const sIdAttr = btn.getAttribute('data-study');
    if (!sIdAttr) return; // Skip buttons without data-study (e.g. shuffle button)
    const sId = parseInt(sIdAttr, 10);
    btn.classList.toggle('active', sId === currentStudyId);
    btn.addEventListener('click', () => {
      try {
        localStorage.setItem('TOEIC_SELECTED_STUDY_ID', sId.toString());
        localStorage.setItem('TOEIC_SELECTED_TEST_ID', sId.toString());
      } catch (err) {}
      window.location.reload();
    });
  });

  // Handle "🎲 Trộn Đề Mới (Random)" button in Study Hub
  const btnShuffleStudy = document.getElementById('btn-shuffle-study-now');
  if (btnShuffleStudy) {
    btnShuffleStudy.addEventListener('click', () => {
      try {
        localStorage.setItem('TOEIC_SELECTED_STUDY_ID', '3');
        localStorage.setItem('TOEIC_SELECTED_TEST_ID', '3');
      } catch (err) {}
      window.location.reload();
    });
  }

  const backTestBtn = document.getElementById('btn-back-to-test');
  if (backTestBtn) {
    backTestBtn.addEventListener('click', () => {
      try {
        localStorage.setItem('TOEIC_SELECTED_TEST_ID', currentStudyId.toString());
      } catch (err) {}
    });
  }

  // --- INIT ---
  loadMastery();
  updateMasteryCounters();
  renderMasteryView(1);

})();
