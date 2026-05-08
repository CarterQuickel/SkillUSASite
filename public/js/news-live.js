document.addEventListener("DOMContentLoaded", () => {
  const newsContainer = document.querySelector(".news-grid");
  const eventContainer = document.querySelector(".events-grid");
  if (!newsContainer && !eventContainer) {
    return;
  }

  const formatDisplayDate = (value) => {
    if (!value) {
      return "";
    }
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }
    return parsed.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const updateEventDateDisplay = (card, startValue, endValue) => {
    const startDate = new Date(`${startValue}T00:00:00`);
    if (Number.isNaN(startDate.getTime())) {
      return false;
    }
    const endDate = endValue ? new Date(`${endValue}T00:00:00`) : null;
    if (endDate && Number.isNaN(endDate.getTime())) {
      return false;
    }

    const eventDate = card.querySelector(".event-date");
    if (!eventDate) {
      return false;
    }

    const monthName = startDate.toLocaleString("en-US", { month: "short" });
    const startDay = startDate.getDate();

    if (endDate && endDate.getTime() !== startDate.getTime()) {
      eventDate.classList.add("multi-day");
      let dateRange = eventDate.querySelector(".date-range");
      if (!dateRange) {
        dateRange = document.createElement("div");
        dateRange.className = "date-range";
        eventDate.innerHTML = "";
        eventDate.appendChild(dateRange);
      }

      let monthEl = dateRange.querySelector(".event-month");
      if (!monthEl) {
        monthEl = document.createElement("div");
        monthEl.className = "event-month";
        dateRange.appendChild(monthEl);
      }
      monthEl.textContent = monthName;

      let displayEl = dateRange.querySelector(".date-display");
      if (!displayEl) {
        displayEl = document.createElement("div");
        displayEl.className = "date-display";
        dateRange.appendChild(displayEl);
      }

      const endMonth = endDate.toLocaleString("en-US", { month: "short" });
      const endDay = endDate.getDate();
      displayEl.textContent = endMonth === monthName ? `${startDay}-${endDay}` : `${startDay}-${endMonth} ${endDay}`;
      return true;
    }

    eventDate.classList.remove("multi-day");
    eventDate.innerHTML = "";
    const monthEl = document.createElement("div");
    monthEl.className = "event-month";
    monthEl.textContent = monthName;
    const dayEl = document.createElement("div");
    dayEl.className = "event-day";
    dayEl.textContent = startDay;
    eventDate.appendChild(monthEl);
    eventDate.appendChild(dayEl);
    return true;
  };

  const sortNewsByDate = () => {
    if (!newsContainer) {
      return;
    }
    const featured = newsContainer.querySelectorAll(".news-article.featured");
    const regularItems = Array.from(newsContainer.querySelectorAll(".news-article:not(.featured)"));
    regularItems.sort((a, b) => {
      const aDate = a.dataset.newsDate ? new Date(`${a.dataset.newsDate}T00:00:00`).getTime() : 0;
      const bDate = b.dataset.newsDate ? new Date(`${b.dataset.newsDate}T00:00:00`).getTime() : 0;
      return bDate - aDate;
    });
    featured.forEach((item) => newsContainer.appendChild(item));
    regularItems.forEach((item) => newsContainer.appendChild(item));
  };

  const sortEventsByDate = () => {
    if (!eventContainer) {
      return;
    }
    const cards = Array.from(eventContainer.querySelectorAll(".event-card"));
    cards.sort((a, b) => {
      const aDate = a.dataset.startDate ? new Date(`${a.dataset.startDate}T00:00:00`).getTime() : 0;
      const bDate = b.dataset.startDate ? new Date(`${b.dataset.startDate}T00:00:00`).getTime() : 0;
      return aDate - bDate;
    });
    cards.forEach((card) => eventContainer.appendChild(card));
  };

  const applyLiveAnimation = (card, className) => {
    if (!card || !className) {
      return;
    }
    card.classList.remove("live-insert", "live-update");
    void card.offsetWidth;
    card.classList.add(className);
    card.addEventListener(
      "animationend",
      () => {
        card.classList.remove(className);
      },
      { once: true }
    );
  };

  const animateRemoval = (card) => {
    if (!card) {
      return;
    }
    if (card.classList.contains("live-remove")) {
      return;
    }
    card.classList.add("live-remove");
    const removeNow = () => {
      if (card.isConnected) {
        card.remove();
      }
    };
    card.addEventListener("animationend", removeNow, { once: true });
    setTimeout(removeNow, 400);
  };

  const cloneTemplate = (templateId) => {
    const template = document.getElementById(templateId);
    if (!template) {
      return null;
    }
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector("[data-item-type]");
    if (!card) {
      return null;
    }
    return { fragment, card };
  };

  const normalizeNewsItem = (item) => ({
    id: Number(item.id) || 0,
    tempId: item.tempId || "",
    title: item.title || "",
    info: item.info || "",
    date: item.date || "",
    category: item.category || "Announcements",
    imageUrl: item.imageUrl || item.image_url || ""
  });

  const normalizeEventItem = (item) => ({
    id: Number(item.id) || 0,
    tempId: item.tempId || "",
    title: item.title || "",
    info: item.info || "",
    location: item.location || "",
    startDate: item.startDate || item.start_date || "",
    endDate: item.endDate || item.end_date || "",
    duration: item.duration || ""
  });

  const applyNewsData = (card, item) => {
    card.dataset.id = String(item.id || "");
    card.dataset.newsDate = item.date;
    card.dataset.category = item.category;
    delete card.dataset.isNew;
    delete card.dataset.tempId;

    const img = card.querySelector(".article-image img");
    if (img) {
      const url = item.imageUrl || "/icons/placeholder.png";
      img.setAttribute("src", url);
      img.setAttribute("alt", item.title || "News item");
    }

    const dateEl = card.querySelector(".news-date");
    if (dateEl) {
      dateEl.textContent = formatDisplayDate(item.date);
    }

    const categoryEl = card.querySelector(".article-category");
    if (categoryEl) {
      categoryEl.textContent = item.category || "Announcements";
    }

    const titleEl = card.querySelector("h3");
    if (titleEl) {
      titleEl.textContent = item.title || "";
    }

    const infoEl = card.querySelector(".news-info");
    if (infoEl) {
      infoEl.textContent = item.info || "";
    }
  };

  const applyEventData = (card, item) => {
    card.dataset.id = String(item.id || "");
    card.dataset.startDate = item.startDate || "";
    card.dataset.endDate = item.endDate || "";
    card.dataset.duration = item.duration || "";
    delete card.dataset.isNew;
    delete card.dataset.tempId;

    const titleEl = card.querySelector("h3");
    if (titleEl) {
      titleEl.textContent = item.title || "";
    }

    updateEventDateDisplay(card, item.startDate, item.endDate);

    const durationText = item.duration ? `⏱️ ${item.duration}` : "";
    let durationEl = card.querySelector(".event-duration");
    if (durationText) {
      if (!durationEl && titleEl) {
        durationEl = document.createElement("p");
        durationEl.className = "event-duration";
        titleEl.insertAdjacentElement("afterend", durationEl);
      }
      if (durationEl) {
        durationEl.textContent = durationText;
      }
    } else if (durationEl) {
      durationEl.remove();
    }

    const locationEl = card.querySelector(".event-location-text");
    if (locationEl) {
      locationEl.textContent = item.location ? `📍 ${item.location}` : "";
    }

    const infoEl = card.querySelector(".event-info");
    if (infoEl) {
      infoEl.textContent = item.info || "";
    }
  };

  const upsertNewsCard = (rawItem) => {
    if (!newsContainer) {
      return;
    }
    const item = normalizeNewsItem(rawItem || {});
    if (!item.id && !item.tempId) {
      return;
    }

    let isNew = false;
    let card = null;
    if (item.tempId) {
      card = newsContainer.querySelector(`[data-item-type="news"][data-temp-id="${item.tempId}"]`);
    }
    if (!card && item.id) {
      card = newsContainer.querySelector(`[data-item-type="news"][data-id="${item.id}"]`);
    }
    if (!card) {
      const cloned = cloneTemplate("newsCardTemplate");
      if (!cloned) {
        return;
      }
      card = cloned.card;
      newsContainer.appendChild(cloned.fragment);
      isNew = true;
    }
    if (card.dataset.isNew === "true" || card.dataset.tempId) {
      isNew = true;
    }

    applyNewsData(card, item);
    sortNewsByDate();
    applyLiveAnimation(card, isNew ? "live-insert" : "live-update");
  };

  const upsertEventCard = (rawItem) => {
    if (!eventContainer) {
      return;
    }
    const item = normalizeEventItem(rawItem || {});
    if (!item.id && !item.tempId) {
      return;
    }

    let isNew = false;
    let card = null;
    if (item.tempId) {
      card = eventContainer.querySelector(`[data-item-type="event"][data-temp-id="${item.tempId}"]`);
    }
    if (!card && item.id) {
      card = eventContainer.querySelector(`[data-item-type="event"][data-id="${item.id}"]`);
    }
    if (!card) {
      const cloned = cloneTemplate("eventCardTemplate");
      if (!cloned) {
        return;
      }
      card = cloned.card;
      eventContainer.appendChild(cloned.fragment);
      isNew = true;
    }
    if (card.dataset.isNew === "true" || card.dataset.tempId) {
      isNew = true;
    }

    applyEventData(card, item);
    sortEventsByDate();
    applyLiveAnimation(card, isNew ? "live-insert" : "live-update");
  };

  const removeNewsCard = (id) => {
    if (!newsContainer || !id) {
      return;
    }
    const card = newsContainer.querySelector(`[data-item-type="news"][data-id="${id}"]`);
    if (card) {
      animateRemoval(card);
    }
  };

  const removeEventCard = (id) => {
    if (!eventContainer || !id) {
      return;
    }
    const card = eventContainer.querySelector(`[data-item-type="event"][data-id="${id}"]`);
    if (card) {
      animateRemoval(card);
    }
  };

  const setupSocket = () => {
    if (typeof window.io !== "function") {
      return;
    }

    const socket = window.io();
    socket.on("news-upsert", (item) => upsertNewsCard(item));
    socket.on("news-delete", (payload) => removeNewsCard(Number(payload?.id)));
    socket.on("event-upsert", (item) => upsertEventCard(item));
    socket.on("event-delete", (payload) => removeEventCard(Number(payload?.id)));
  };

  setupSocket();
  sortNewsByDate();
  sortEventsByDate();
});
