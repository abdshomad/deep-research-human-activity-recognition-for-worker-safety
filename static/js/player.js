// YouTube player embedding and url sync module

let currentEmbedUrl = "";

export function getYouTubeEmbedUrl(url) {
  if (!url) return "";
  const cleanUrl = url.trim();
  const listMatch = cleanUrl.match(/[?&]list=([a-zA-Z0-9_-]+)/i);
  if (listMatch) {
    return `https://www.youtube.com/embed/videoseries?list=${listMatch[1]}`;
  }
  const videoMatch = cleanUrl.match(/(?:v=|\/vi\/|youtu\.be\/|\/v\/|\/embed\/|\/shorts\/)([a-zA-Z0-9_-]{11})/i);
  if (videoMatch) {
    return `https://www.youtube.com/embed/${videoMatch[1]}`;
  }
  return "";
}

export function updateYouTubePlayer(url) {
  const container = document.getElementById("youtube-player-container");
  if (!container) return;
  const embedUrl = getYouTubeEmbedUrl(url);
  if (embedUrl) {
    if (currentEmbedUrl !== embedUrl || !container.querySelector("iframe")) {
      currentEmbedUrl = embedUrl;
      container.innerHTML = `
        <div class="youtube-player-wrapper">
          <iframe
            src="${embedUrl}"
            title="YouTube video player"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
          ></iframe>
        </div>
      `;
    }
    container.style.display = "block";
  } else {
    currentEmbedUrl = "";
    container.innerHTML = "";
    container.style.display = "none";
  }
}

export function initPlayerModule() {
  document.addEventListener("submit", (e) => {
    const detectForm = document.getElementById("detect-form");
    if (detectForm && (e.target === detectForm || detectForm.contains(e.target))) {
      const youtubeInput = document.getElementById("youtube-url-input");
      if (youtubeInput) {
        let hiddenUrl = detectForm.querySelector('input[name="youtube_url"]');
        if (!hiddenUrl) {
          hiddenUrl = document.createElement("input");
          hiddenUrl.type = "hidden";
          hiddenUrl.name = "youtube_url";
          detectForm.appendChild(hiddenUrl);
        }
        hiddenUrl.value = youtubeInput.value;
      }
    }
  });

  const youtubeForm = document.querySelector(".youtube-form");
  if (youtubeForm) {
    youtubeForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const detectForm = document.getElementById("detect-form");
      if (detectForm) {
        htmx.trigger(detectForm, "submit");
      }
    });
  }

  ["input", "change", "keyup", "paste", "blur"].forEach((evtType) => {
    document.addEventListener(evtType, (e) => {
      if (e.target && e.target.id === "youtube-url-input") {
        if (evtType === "paste") {
          setTimeout(() => updateYouTubePlayer(e.target.value), 10);
        } else {
          updateYouTubePlayer(e.target.value);
        }
      }
    });
  });

  const youtubeInput = document.getElementById("youtube-url-input");
  if (youtubeInput && youtubeInput.value) {
    updateYouTubePlayer(youtubeInput.value);
  }
}
