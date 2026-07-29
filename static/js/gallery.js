// Preset gallery marquee & click handler module

import { updateYouTubePlayer } from "./player.js";

export function applyPresetUrl(url, target) {
  const youtubeInput = document.getElementById("youtube-url-input");
  const targetsInput = document.getElementById("targets");
  if (youtubeInput) {
    youtubeInput.value = url;
    if (targetsInput && target) {
      targetsInput.value = target;
    }
    updateYouTubePlayer(url);
    const uploadCard = document.getElementById("upload-card");
    if (uploadCard) {
      uploadCard.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    youtubeInput.focus();
  } else {
    fetch(`/workspace?youtube_url=${encodeURIComponent(url)}&targets=${encodeURIComponent(target || "")}`)
      .then((res) => res.text())
      .then((html) => {
        const workspace = document.getElementById("workspace");
        if (workspace) {
          workspace.innerHTML = html;
          const newYoutubeInput = document.getElementById("youtube-url-input");
          if (newYoutubeInput) {
            newYoutubeInput.value = url;
            updateYouTubePlayer(url);
            newYoutubeInput.focus();
          }
        }
      });
  }
}

export function initGalleryModule() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".preset-card__button") || e.target.closest(".preset-card");
    if (btn) {
      const presetCard = btn.closest(".preset-card") || btn;
      const btnEl = presetCard.querySelector(".preset-card__button") || btn;
      const url = btnEl.dataset.url || btnEl.getAttribute("data-url");
      const target = btnEl.dataset.target || btnEl.getAttribute("data-target");

      if (url) {
        e.preventDefault();
        applyPresetUrl(url, target);
      }
    }
  });

  const track = document.getElementById("presets-track") || document.querySelector(".presets__track");
  if (track) {
    const originalCards = Array.from(track.children);
    if (originalCards.length > 0) {
      for (let i = 0; i < 3; i++) {
        originalCards.forEach((card) => {
          const clone = card.cloneNode(true);
          track.appendChild(clone);
        });
      }
    }

    let speed = 0.8;
    let direction = 1;
    let isHoveringCard = false;
    let isDragging = false;
    let startX = 0;
    let startScrollLeft = 0;

    const presetsSection = track.closest(".presets") || track;
    if (presetsSection) {
      presetsSection.addEventListener("mousemove", (e) => {
        const rect = presetsSection.getBoundingClientRect();
        const relativeX = e.clientX - rect.left;
        direction = relativeX < rect.width / 2 ? -1 : 1;
      });
    }

    track.addEventListener("mouseover", (e) => {
      if (e.target.closest(".preset-card")) isHoveringCard = true;
    });

    track.addEventListener("mouseout", (e) => {
      if (e.target.closest(".preset-card")) isHoveringCard = false;
    });

    track.addEventListener("mousedown", (e) => {
      isDragging = true;
      startX = e.pageX - track.offsetLeft;
      startScrollLeft = track.scrollLeft;
    });

    window.addEventListener("mouseup", () => {
      isDragging = false;
    });

    track.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.pageX - track.offsetLeft;
      const walk = (x - startX) * 1.5;
      track.scrollLeft = startScrollLeft - walk;
    });

    function animateMarquee() {
      if (!isHoveringCard && !isDragging) {
        track.scrollLeft += speed * direction;
        const singleSetWidth = track.scrollWidth / 4;
        if (track.scrollLeft >= singleSetWidth * 3) {
          track.scrollLeft -= singleSetWidth;
        } else if (track.scrollLeft <= singleSetWidth / 2 && direction === -1) {
          track.scrollLeft += singleSetWidth;
        }
      }
      requestAnimationFrame(animateMarquee);
    }

    setTimeout(() => {
      const singleSetWidth = track.scrollWidth / 4;
      track.scrollLeft = singleSetWidth;
      requestAnimationFrame(animateMarquee);
    }, 150);
  }
}
