/**
 * Keyframe Strip Thumbnail Cards, Pagination & In-Place DOM Diffing Controller
 */
(function () {
  const collapsedGroups = new Set();
  const groupPages = new Map();
  let lastActiveIndex = -1, cachedAllFrames = null, cachedLoadFrameFn = null, cachedCurrentIndex = 0;

  function getPageSize() {
    const val = parseInt(localStorage.getItem('ezlab_page_size'), 10);
    return (!isNaN(val) && val > 0) ? val : 20;
  }

  function stepGroupPage(vid, delta) {
    if (typeof vid === 'number') { delta = vid; vid = null; }
    if (!vid && cachedAllFrames && cachedAllFrames[cachedCurrentIndex]) {
      vid = cachedAllFrames[cachedCurrentIndex].video_id || 'default';
    }
    const PAGE_SIZE = getPageSize(), sameVidFrames = cachedAllFrames.filter((f) => (f.video_id || 'default') === vid), totalPages = Math.ceil(sameVidFrames.length / PAGE_SIZE) || 1;
    const cur = groupPages.get(vid) || 1, targetPage = Math.max(1, Math.min(totalPages, cur + delta));
    groupPages.set(vid, targetPage); const targetIdx = Math.max(0, Math.min(cachedAllFrames.length - 1, cachedCurrentIndex + delta * PAGE_SIZE));
    if (window.ViewerUI?.showToast) window.ViewerUI.showToast(`⚡ Jumped to Page ${targetPage}/${totalPages} (Preloading ±2 pages...)`, 'info');
    if (cachedLoadFrameFn) cachedLoadFrameFn(targetIdx); else renderThumbnails(cachedAllFrames, cachedCurrentIndex, cachedLoadFrameFn);
  }

  function initPageSizeSelector(allFrames, currentIndex, loadFrameFn) {
    const select = document.getElementById('select-page-size');
    if (!select || select.dataset.bound) return;
    select.dataset.bound = 'true'; select.value = String(getPageSize());
    select.onchange = () => { localStorage.setItem('ezlab_page_size', select.value); groupPages.clear(); renderThumbnails(allFrames, currentIndex, loadFrameFn); };
  }

  function renderThumbnails(allFrames, currentIndex, loadFrameFn) {
    cachedAllFrames = allFrames; cachedCurrentIndex = currentIndex; cachedLoadFrameFn = loadFrameFn;
    initPageSizeSelector(allFrames, currentIndex, loadFrameFn);
    const PAGE_SIZE = getPageSize();
    const container = document.getElementById('thumbnail-strip');
    if (!container) return;

    const groups = [];
    const groupMap = new Map();
    allFrames.forEach((frame, globalIdx) => {
      const vid = frame.video_id || 'default';
      if (!groupMap.has(vid)) {
        const groupObj = { video_id: vid, video_title: frame.video_title || vid, items: [] };
        groupMap.set(vid, groupObj);
        groups.push(groupObj);
      }
      groupMap.get(vid).items.push({ ...frame, globalIdx });
    });

    const activeFrame = allFrames[currentIndex];
    const activeVid = activeFrame ? activeFrame.video_id : null;

    const validGroupVids = new Set(groups.map((g) => g.video_id));
    Array.from(container.children).forEach((child) => {
      if (child.dataset.vid && !validGroupVids.has(child.dataset.vid)) container.removeChild(child);
    });

    groups.forEach((group) => {
      let groupEl = Array.from(container.children).find((c) => c.dataset.vid === group.video_id);
      const isActiveGroup = group.video_id === activeVid;
      const isCollapsed = collapsedGroups.has(group.video_id);
      if (!groupEl) {
        groupEl = document.createElement('div');
        groupEl.dataset.vid = group.video_id;
        container.appendChild(groupEl);
      }
      groupEl.className = `thumb-group ${isActiveGroup ? 'thumb-group--active' : ''} ${isCollapsed ? 'thumb-group--collapsed' : ''}`;

      const totalCount = group.items.length;
      const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

      let curPage = groupPages.get(group.video_id) || 1;
      if (isActiveGroup && activeFrame) {
        const activeLocalIdx = group.items.findIndex((item) => item.globalIdx === currentIndex);
        if (activeLocalIdx !== -1) {
          const autoPage = Math.floor(activeLocalIdx / PAGE_SIZE) + 1;
          if (!groupPages.has(group.video_id) || autoPage !== curPage) { curPage = autoPage; groupPages.set(group.video_id, curPage); }
        }
      }
      if (curPage > totalPages) { curPage = totalPages; groupPages.set(group.video_id, curPage); }

      const processedCount = group.items.filter((item) => item.is_processed === true).length, pendingCount = totalCount - processedCount;
      const totalGroupObjects = group.items.reduce((sum, item) => sum + (item.detections || []).filter((d) => !d.deleted).length, 0);
      const segText = `${processedCount}S • ${pendingCount}P`;
      const segBadgeClass = processedCount > 0 ? 'thumb-group__obj-pill' : 'thumb-group__obj-pill thumb-group__obj-pill--pending', objPart = processedCount > 0 ? ` • ${totalGroupObjects}o` : '';

      const pagerHtml = totalPages > 1
        ? `<span class="thumb-group__pager" onclick="event.stopPropagation();"><button class="thumb-pager-btn" ${curPage <= 1 ? 'disabled' : ''} data-vid="${group.video_id}" data-dir="-1" title="Previous Page">‹</button><span class="thumb-pager-text">Pg ${curPage}/${totalPages}</span><button class="thumb-pager-btn" ${curPage >= totalPages ? 'disabled' : ''} data-vid="${group.video_id}" data-dir="1" title="Next Page">›</button></span>`
        : '';

      let headerEl = groupEl.querySelector('.thumb-group__header');
      if (!headerEl) {
        headerEl = document.createElement('div');
        groupEl.appendChild(headerEl);
      }
      headerEl.className = `thumb-group__header ${isActiveGroup ? 'thumb-group__header--active' : ''}`;
      const chevron = isCollapsed ? '▸' : '▾';
      const rawVidId = group.video_id || 'Video';
      const shortVidId = rawVidId.length > 4 ? (rawVidId.substring(0, 2) + '..') : rawVidId;
      headerEl.innerHTML = `<span class="thumb-group__title" title="${group.video_id}"><span class="thumb-group__chevron">${chevron}</span> 📹 ${shortVidId}${pagerHtml}</span><span class="thumb-group__count">${totalCount} F • <span class="${segBadgeClass}">${segText}</span>${objPart}</span>`;

      headerEl.querySelectorAll('.thumb-pager-btn:not([disabled])').forEach((btn) => {
        btn.onclick = (e) => { e.stopPropagation(); e.preventDefault(); stepGroupPage(btn.dataset.vid, parseInt(btn.dataset.dir, 10)); };
      });

      if (window.UnifiedPreloader && window.UnifiedPreloader.preloadThumbnailPage) {
        window.UnifiedPreloader.preloadThumbnailPage(allFrames, group.video_id, curPage, PAGE_SIZE);
      }

      let listEl = groupEl.querySelector('.thumb-group__list');
      if (!listEl) {
        listEl = document.createElement('div');
        listEl.className = 'thumb-group__list';
        groupEl.appendChild(listEl);
      }
      listEl.style.display = isCollapsed ? 'none' : '';

      headerEl.onclick = (e) => {
        if (e.target.closest('.thumb-group__pager')) return;
        e.stopPropagation(); e.preventDefault();
        const isNowCollapsed = !collapsedGroups.has(group.video_id);
        if (isNowCollapsed) collapsedGroups.add(group.video_id); else collapsedGroups.delete(group.video_id);
        listEl.style.display = isNowCollapsed ? 'none' : '';
        groupEl.classList.toggle('thumb-group--collapsed', isNowCollapsed);
        const chev = headerEl.querySelector('.thumb-group__chevron');
        if (chev) chev.textContent = isNowCollapsed ? '▸' : '▾';
      };

      const startIdx = (curPage - 1) * PAGE_SIZE;
      const pageFrames = group.items.slice(startIdx, startIdx + PAGE_SIZE);
      const validPageGlobalIdxs = new Set(pageFrames.map((f) => f.globalIdx));

      Array.from(listEl.children).forEach((child) => {
        const gIdx = parseInt(child.dataset.globalIdx, 10);
        if (!validPageGlobalIdxs.has(gIdx)) listEl.removeChild(child);
      });

      pageFrames.forEach((frame, idxInPage) => {
        const globalIdx = frame.globalIdx;
        const isProcessing = frame.is_processing === true, isProcessed = frame.is_processed === true;
        const detCount = (frame.detections || []).filter((d) => !d.deleted).length;
        const st = frame.verification ? (frame.verification.status || 'pending') : 'pending';
        const vIcon = st === 'verified' ? '✓' : st === 'rejected' ? '✕' : st === 'flagged' ? '!' : '•';
        let sam3Icon = isProcessed ? '⚡' : '⌛';
        let sam3Class = isProcessed ? 'badge--sam3-done' : isProcessing ? 'badge--sam3-processing' : 'badge--sam3-pending';

        const timeStr = frame.timestamp_sec !== undefined ? `${frame.timestamp_sec}s` : '';
        const realFrameNum = (frame.frame_index !== undefined) ? frame.frame_index : (startIdx + idxInPage + 1);
        const objText = isProcessed ? `${detCount} obj` : (isProcessing ? '⚡ Proc...' : 'Pending');
        const objClass = isProcessed ? 'thumb-card__obj-count' : 'thumb-card__obj-count thumb-card__obj-count--pending';
        const thumbSrc = frame.thumbnail_url || frame.image_url;

        let card = Array.from(listEl.children).find((c) => parseInt(c.dataset.globalIdx, 10) === globalIdx);
        if (!card) {
          card = document.createElement('div');
          card.dataset.globalIdx = globalIdx;
          card.innerHTML = `<div class="thumb-card__img-wrap"><img src="${thumbSrc}" alt="Frame" class="thumb-card__img" decoding="async" loading="lazy" /><span class="thumb-badge thumb-badge--verify badge--${st}">${vIcon}</span><span class="thumb-badge thumb-badge--sam3 ${sam3Class}">${sam3Icon}</span></div><div class="thumb-card__meta"><span>F${realFrameNum}</span><span class="${objClass}">${objText}</span><span class="thumb-card__time">${timeStr}</span></div>`;
          listEl.appendChild(card);
        } else {
          const img = card.querySelector('.thumb-card__img');
          if (img && img.getAttribute('src') !== thumbSrc) img.src = thumbSrc;
          const vBadge = card.querySelector('.thumb-badge--verify');
          if (vBadge) { vBadge.className = `thumb-badge thumb-badge--verify badge--${st}`; vBadge.textContent = vIcon; }
          const sam3Badge = card.querySelector('.thumb-badge--sam3');
          if (sam3Badge) { sam3Badge.className = `thumb-badge thumb-badge--sam3 ${sam3Class}`; sam3Badge.textContent = sam3Icon; }
          const objEl = card.querySelector('.thumb-card__obj-count');
          if (objEl) { objEl.className = objClass; objEl.textContent = objText; }
        }

        card.className = `thumb-card ${globalIdx === currentIndex ? 'thumb-card--active' : ''} ${isProcessing ? 'thumb-card--processing' : ''}`;
        card.onclick = () => loadFrameFn(globalIdx);
        card.title = `${group.video_id} • F${realFrameNum} • ${objText} (${timeStr})`;
      });
    });
  }

  function highlightActiveThumbnail(currentIndex, allFrames, loadFrameFn) {
    const activeFrame = (allFrames && allFrames[currentIndex]) ? allFrames[currentIndex] : null;
    const activeVid = activeFrame ? activeFrame.video_id : null;

    if (currentIndex !== lastActiveIndex) {
      lastActiveIndex = currentIndex;
      if (activeVid && collapsedGroups.has(activeVid)) collapsedGroups.delete(activeVid);
      if (loadFrameFn) renderThumbnails(allFrames, currentIndex, loadFrameFn);
    }

    document.querySelectorAll('.thumb-group').forEach((groupEl) => {
      const isActiveGroup = groupEl.dataset.vid === activeVid;
      groupEl.classList.toggle('thumb-group--active', isActiveGroup);
      const header = groupEl.querySelector('.thumb-group__header');
      if (header) header.classList.toggle('thumb-group__header--active', isActiveGroup);
    });

    document.querySelectorAll('.thumb-card').forEach((card) => {
      const gIdx = parseInt(card.dataset.globalIdx, 10);
      const isAct = gIdx === currentIndex;
      card.classList.toggle('thumb-card--active', isAct);
      if (isAct) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  window.ViewerUI = window.ViewerUI || {};
  Object.assign(window.ViewerUI, { renderThumbnails, highlightActiveThumbnail, stepGroupPage, getPageSize });
})();
