(function () {
  let isExpanding = false;
  let activeTargetTier = null;
  let lastProgressInfo = null;
  let currentVideoId = null;

  function generateTiers(totalVideoFrames, extractedCount) {
    const numExtracted = parseInt(extractedCount, 10) || 2;
    const hasTotal = typeof totalVideoFrames === "number" && totalVideoFrames > 0;
    const limit = hasTotal ? totalVideoFrames : Math.max(numExtracted * 4, 16384);

    const tiers = [2];
    let val = 4;
    while (val < limit) {
      tiers.push(val);
      val *= 2;
    }
    if (hasTotal) {
      if (tiers[tiers.length - 1] < totalVideoFrames) {
        tiers.push(totalVideoFrames);
      }
    } else {
      tiers.push(val);
    }
    return tiers;
  }

  function getActiveIndex(tiers, extractedCount) {
    const num = parseInt(extractedCount, 10);
    if (isNaN(num) || num <= 2) return 0;

    for (let i = tiers.length - 1; i >= 0; i--) {
      if (typeof tiers[i] === "number" && num >= tiers[i]) {
        return i;
      }
    }
    return 0;
  }

  function renderStepper(container, videoId, extractedCount, maxFrames, loadingTier = null, progressInfo = null) {
    if (!container) return;

    currentVideoId = videoId || container.getAttribute("data-video-id") || null;
    const tiers = generateTiers(maxFrames, extractedCount);
    const activeIdx = getActiveIndex(tiers, extractedCount);

    // Up to 2 completed previous steps
    const prevStart = Math.max(0, activeIdx - 2);
    const prevSteps = tiers.slice(prevStart, activeIdx);

    // Active step
    const activeStep = tiers[activeIdx];

    // Next 2 steps
    const nextSteps = tiers.slice(activeIdx + 1, activeIdx + 3);

    let html = "";

    // Render completed steps (disabled with checkmark)
    prevSteps.forEach(tier => {
      html += `<span class="hud-stepper__step hud-stepper__step--completed" title="Completed tier: ${tier}">✓ ${tier}</span>`;
    });

    // Render active step
    html += `<span class="hud-stepper__step hud-stepper__step--active" title="Current extracted frame tier: ${activeStep}">${activeStep}</span>`;

    // Render next steps (only immediate next step is clickable)
    nextSteps.forEach((tier, idx) => {
      const isImmediateNext = idx === 0;
      if (isImmediateNext) {
        if ((loadingTier === tier || isExpanding) && progressInfo && progressInfo.total > 0) {
          const pct = Math.round(progressInfo.percent || 0);
          const labelText = `⚡ ${progressInfo.processed}/${progressInfo.total} frames (${pct}%)`;
          html += `<button class="hud-stepper__step hud-stepper__step--next hud-stepper__step--loading" disabled title="SAM3 segmenting ${progressInfo.processed} of ${progressInfo.total} frames (${pct}%)...">${labelText} <span class="hud-stepper__spinner"></span></button>`;
        } else if (loadingTier === tier || isExpanding) {
          html += `<button class="hud-stepper__step hud-stepper__step--next hud-stepper__step--loading" disabled title="Extracting ${tier} frames...">⚡ Next: ${tier} <span class="hud-stepper__spinner"></span></button>`;
        } else {
          html += `<button class="hud-stepper__step hud-stepper__step--next" data-tier="${tier}" title="Extract keyframes for next tier: ${tier} frames for ${currentVideoId || 'active video'}">⚡ Next: ${tier}</button>`;
        }
      } else {
        html += `<span class="hud-stepper__step hud-stepper__step--upcoming-disabled" title="Upcoming tier ${tier} (unlocked after ${nextSteps[0]})">+ ${tier}</span>`;
      }
    });

    container.innerHTML = html;
    container.setAttribute("data-total-frames", extractedCount);
    if (currentVideoId) container.setAttribute("data-video-id", currentVideoId);

    // Attach click handler to immediate next step
    const nextBtn = container.querySelector(".hud-stepper__step--next:not([disabled])");
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        const targetTier = this.getAttribute("data-tier");
        if (targetTier) {
          triggerFrameExpansion(container, currentVideoId, extractedCount, maxFrames, targetTier);
        }
      });
    }
  }

  async function triggerFrameExpansion(container, videoId, currentExtracted, maxFrames, targetTier) {
    if (isExpanding) return;
    isExpanding = true;
    activeTargetTier = targetTier;
    lastProgressInfo = null;
    renderStepper(container, videoId, currentExtracted, maxFrames, targetTier);

    try {
      const fd = new FormData();
      fd.append("playlist_name", window.PLAYLIST_NAME || "");
      fd.append("num_frames", targetTier);
      if (videoId) fd.append("video_id", videoId);
      fd.append("targets", window.TARGETS_STR || "");

      const res = await fetch("/api/frames/expand", { method: "POST", body: fd });
      const data = await res.json();

      if (data.status === "busy" || res.status === 409) {
        if (window.showToast) window.showToast(data.message || "⚠️ Frame expansion is already in progress.", "warning");
      } else if (data.status === "ok") {
        const msg = data.message || `Started frame expansion for ${targetTier} frames tier (${videoId || 'video'}).`;
        if (window.showToast) window.showToast(msg, "success");
        const statusElem = document.getElementById("sam3-status-container");
        if (statusElem && window.htmx) {
          window.htmx.trigger(statusElem, "load");
        }
      }
    } catch (err) {
      console.error("Stepper frame expansion error:", err);
      if (window.showToast) window.showToast("Failed to start frame expansion.", "error");
      isExpanding = false;
      activeTargetTier = null;
      renderStepper(container, videoId, currentExtracted, maxFrames);
    }
  }

  // Global per-video stepper trigger
  window.updateFrameStepperForVideo = function (videoId, extractedCount, maxFrames) {
    const container = document.getElementById("hud-frame-stepper");
    if (!container) return;
    currentVideoId = videoId;
    renderStepper(container, videoId, extractedCount, maxFrames, activeTargetTier, isExpanding ? lastProgressInfo : null);
  };

  // HTMX Polling progress callback
  window.updateFrameStepperProgress = function (processed, total, isComplete, percent) {
    const container = document.getElementById("hud-frame-stepper");
    if (!container) return;

    lastProgressInfo = { processed, total, percent: percent || 0 };

    if (isComplete || (processed > 0 && processed >= total)) {
      isExpanding = false;
      activeTargetTier = null;
      const vid = currentVideoId || container.getAttribute("data-video-id");
      renderStepper(container, vid, total, total);
    } else if (isExpanding) {
      const vid = currentVideoId || container.getAttribute("data-video-id");
      const currentExtracted = container.getAttribute("data-total-frames") || 4;
      renderStepper(container, vid, currentExtracted, total, activeTargetTier, lastProgressInfo);
    }
  };

  // Global initializer
  window.initFrameStepper = function (currentTotalFrames) {
    const container = document.getElementById("hud-frame-stepper");
    if (!container) return;
    const count = currentTotalFrames !== undefined ? currentTotalFrames : (container.getAttribute("data-total-frames") || 4);
    renderStepper(container, currentVideoId, count, 0, activeTargetTier, isExpanding ? lastProgressInfo : null);
  };

  document.addEventListener("DOMContentLoaded", function () {
    window.initFrameStepper();
  });

  document.addEventListener("htmx:afterSwap", function (evt) {
    const container = document.getElementById("hud-frame-stepper");
    if (container) {
      const count = container.getAttribute("data-total-frames");
      const vid = container.getAttribute("data-video-id");
      if (count && !isExpanding) window.initFrameStepper(count);
    }
  });
})();
