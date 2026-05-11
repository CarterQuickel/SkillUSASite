document.addEventListener("DOMContentLoaded", () => {
  const editModal = document.getElementById("adminEditModal");
  if (!editModal) {
    return;
  }

  const editForm = document.getElementById("adminEditForm");
  const modalTitle = document.getElementById("adminModalTitle");
  const newsSection = editModal.querySelector('[data-admin-section="news"]');
  const eventSection = editModal.querySelector('[data-admin-section="event"]');
  const newsImageFileInput = document.getElementById("adminNewsImageFile");
  const newsDateInput = document.getElementById("adminNewsDate");
  const newsTitleInput = document.getElementById("adminNewsTitle");
  const newsInfoInput = document.getElementById("adminNewsInfo");
  const eventTitleInput = document.getElementById("adminEventTitle");
  const eventStartDateInput = document.getElementById("adminEventStartDate");
  const eventEndDateInput = document.getElementById("adminEventEndDate");
  const eventLocationInput = document.getElementById("adminEventLocation");
  const eventInfoInput = document.getElementById("adminEventInfo");
  const previewCard = document.getElementById("adminPreviewCard");
  const saveButton = editForm.querySelector(".admin-modal-save");

  const maxImageSize = 50 * 1024 * 1024;
  const allowedTypes = ["image/png", "image/jpeg"];

  let activeCard = null;
  let activeImageUrl = "";
  let previewObjectUrl = "";

  const validateImageFile = (file) => {
    if (!file) {
      return true;
    }
    if (!allowedTypes.includes(file.type)) {
      alert("Only PNG or JPG images are allowed.");
      return false;
    }
    if (file.size > maxImageSize) {
      alert("Image is too large. Max size is 50 MB.");
      return false;
    }
    return true;
  };

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

  const getIsoDate = (date) => {
    if (!date || Number.isNaN(date.getTime())) {
      return "";
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const parseNewsDateValue = (text) => {
    if (!text) {
      return "";
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }
    const parsed = new Date(text);
    return getIsoDate(parsed);
  };

  const parseEventDatesFromCard = (card) => {
    const startValue = card.dataset.startDate || "";
    const endValue = card.dataset.endDate || "";
    if (startValue) {
      return {
        start: new Date(startValue),
        end: endValue ? new Date(endValue) : null
      };
    }
    const monthText = card.querySelector(".event-month")?.textContent.trim() || "";
    const year = new Date().getFullYear();
    const dayText = card.querySelector(".event-day")?.textContent.trim() || "";
    const rangeText = card.querySelector(".date-display")?.textContent.trim() || "";

    if (dayText) {
      const start = new Date(`${monthText} ${dayText}, ${year}`);
      return { start, end: null };
    }

    if (rangeText.includes("-")) {
      const parts = rangeText.split("-").map((part) => part.trim());
      const startDay = parts[0];
      const endPart = parts[1] || "";
      const endPieces = endPart.split(" ").filter(Boolean);
      const endMonth = endPieces.length > 1 ? endPieces[0] : monthText;
      const endDay = endPieces.length > 1 ? endPieces[1] : endPieces[0];
      const start = new Date(`${monthText} ${startDay}, ${year}`);
      const end = new Date(`${endMonth} ${endDay}, ${year}`);
      return { start, end };
    }

    return { start: null, end: null };
  };

  const requestJson = async (url, options) => {
    const response = await fetch(url, options);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Request failed.");
    }
    return response.json().catch(() => ({}));
  };

  const sortNewsByDate = () => {
    const container = document.querySelector(".news-grid");
    if (!container) {
      return;
    }
    const featured = container.querySelectorAll(".news-article.featured");
    const regularItems = Array.from(container.querySelectorAll(".news-article:not(.featured)"));
    regularItems.sort((a, b) => {
      const aDate = a.dataset.newsDate ? new Date(`${a.dataset.newsDate}T00:00:00`).getTime() : 0;
      const bDate = b.dataset.newsDate ? new Date(`${b.dataset.newsDate}T00:00:00`).getTime() : 0;
      return bDate - aDate;
    });
    featured.forEach((item) => container.appendChild(item));
    regularItems.forEach((item) => container.appendChild(item));
  };

  const sortEventsByDate = () => {
    const container = document.querySelector(".events-grid");
    if (!container) {
      return;
    }
    const cards = Array.from(container.querySelectorAll(".event-card"));
    cards.sort((a, b) => {
      const aDate = a.dataset.startDate ? new Date(`${a.dataset.startDate}T00:00:00`).getTime() : 0;
      const bDate = b.dataset.startDate ? new Date(`${b.dataset.startDate}T00:00:00`).getTime() : 0;
      return aDate - bDate;
    });
    cards.forEach((card) => container.appendChild(card));
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

  const closeModal = () => {
    editModal.classList.remove("is-open");
    editModal.setAttribute("aria-hidden", "true");
    if (activeCard && activeCard.dataset.isNew === "true") {
      activeCard.remove();
    }
    activeCard = null;
    activeImageUrl = "";
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
      previewObjectUrl = "";
    }
    if (previewCard) {
      previewCard.innerHTML = "";
    }
  };

  const buildPreview = () => {
    if (!activeCard || !previewCard) {
      return;
    }

    const clone = activeCard.cloneNode(true);
    const actions = clone.querySelector(".news-admin-actions");
    if (actions) {
      actions.remove();
    }

    if (activeCard.dataset.itemType === "news") {
      const img = clone.querySelector(".article-image img");
      const date = clone.querySelector(".news-date");
      const title = clone.querySelector("h3");
      const info = clone.querySelector(".news-info");

      if (img) {
        const file = newsImageFileInput.files[0];
        if (file && validateImageFile(file)) {
          if (previewObjectUrl) {
            URL.revokeObjectURL(previewObjectUrl);
          }
          previewObjectUrl = URL.createObjectURL(file);
          img.setAttribute("src", previewObjectUrl);
        } else if (activeImageUrl) {
          img.setAttribute("src", activeImageUrl);
        }
      }
      if (date) {
        date.textContent = formatDisplayDate(newsDateInput.value.trim());
      }
      if (title) {
        title.textContent = newsTitleInput.value.trim() || "Untitled";
      }
      if (info) {
        info.textContent = newsInfoInput.value.trim() || "";
      }
    } else {
      const title = clone.querySelector("h3");
      const location = clone.querySelector(".event-location-text");
      const info = clone.querySelector(".event-info");

      if (title) {
        title.textContent = eventTitleInput.value.trim() || "New event";
      }
      updateEventDateDisplay(clone, eventStartDateInput.value.trim(), eventEndDateInput.value.trim());
      if (location) {
        const text = eventLocationInput.value.trim();
        location.textContent = text ? `📍 ${text}` : "";
      }
      if (info) {
        info.textContent = eventInfoInput.value.trim() || "";
      }
    }

    previewCard.innerHTML = "";
    previewCard.appendChild(clone);
  };

  const openModal = (card) => {
    activeCard = card;
    const type = card.dataset.itemType;
    newsSection.classList.remove("is-active");
    eventSection.classList.remove("is-active");
    newsSection.querySelectorAll("input, textarea").forEach((field) => {
      field.disabled = true;
    });
    eventSection.querySelectorAll("input, textarea").forEach((field) => {
      field.disabled = true;
    });

    if (type === "news") {
      const img = card.querySelector(".article-image img");
      const date = card.querySelector(".news-date");
      const title = card.querySelector("h3");
      const info = card.querySelector(".news-info");
      activeImageUrl = img ? img.getAttribute("src") : "";
      newsImageFileInput.value = "";
      newsDateInput.value = card.dataset.newsDate || (date ? parseNewsDateValue(date.textContent.trim()) : "");
      if (!newsDateInput.value) {
        newsDateInput.value = getIsoDate(new Date());
      }
      newsTitleInput.value = title ? title.textContent.trim() : "";
      newsInfoInput.value = info ? info.textContent.trim() : "";
      newsSection.classList.add("is-active");
      newsSection.querySelectorAll("input, textarea").forEach((field) => {
        field.disabled = false;
      });
      modalTitle.textContent = "Edit news";
    } else {
      const title = card.querySelector("h3");
      const location = card.querySelector(".event-location-text");
      const info = card.querySelector(".event-info");
      const { start, end } = parseEventDatesFromCard(card);
      eventTitleInput.value = title ? title.textContent.trim() : "";
      eventStartDateInput.value = start ? getIsoDate(start) : "";
      if (!eventStartDateInput.value || card.dataset.isNew === "true") {
        eventStartDateInput.value = getIsoDate(new Date());
      }
      eventEndDateInput.value = end ? getIsoDate(end) : "";
      eventLocationInput.value = location ? location.textContent.replace(/^📍\s*/, "").trim() : "";
      eventInfoInput.value = info ? info.textContent.trim() : "";
      eventSection.classList.add("is-active");
      eventSection.querySelectorAll("input, textarea").forEach((field) => {
        field.disabled = false;
      });
      modalTitle.textContent = "Edit event";
    }

    editModal.classList.add("is-open");
    editModal.setAttribute("aria-hidden", "false");
    buildPreview();
  };

  document.addEventListener("click", (event) => {
    const addButton = event.target.closest(".admin-add-button[data-add-type]");
    if (addButton) {
      const type = addButton.dataset.addType;
      const templateId = type === "news" ? "newsCardTemplate" : "eventCardTemplate";
      const template = document.getElementById(templateId);
      const container = type === "news" ? document.querySelector(".news-grid") : document.querySelector(".events-grid");
      if (!template || !container) {
        return;
      }

      const fragment = template.content.cloneNode(true);
      const newCard = fragment.querySelector("[data-item-type]");
      if (type === "news") {
        const featured = container.querySelector(".news-article.featured");
        if (featured && featured.nextSibling) {
          container.insertBefore(fragment, featured.nextSibling);
        } else if (featured) {
          container.appendChild(fragment);
        } else {
          container.prepend(fragment);
        }
      } else {
        container.prepend(fragment);
      }

      if (newCard) {
        // mark as new and attach a temp id so we can reconcile client placeholder
        const tempId = `tmp-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        newCard.dataset.isNew = "true";
        newCard.dataset.tempId = tempId;
        openModal(newCard);
      }
      return;
    }

    const deleteButton = event.target.closest(".admin-delete-button");
    if (deleteButton) {
      const card = deleteButton.closest("[data-item-type]");
      if (card) {
        const id = Number(card.dataset.id);
        if (!id || card.dataset.isNew === "true") {
          card.remove();
          return;
        }
        const endpoint = card.dataset.itemType === "news" ? "news" : "events";
        requestJson(`/api/${endpoint}/${id}`, { method: "DELETE" })
          .then(() => card.remove())
          .catch((error) => alert(error.message));
      }
      return;
    }

    const editButton = event.target.closest(".admin-edit-button");
    if (editButton) {
      const card = editButton.closest("[data-item-type]");
      if (card) {
        openModal(card);
      }
    }
  });

  editModal.querySelectorAll("[data-admin-close]").forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && editModal.classList.contains("is-open")) {
      closeModal();
    }
  });

  editForm.addEventListener("input", () => {
    buildPreview();
  });

  newsImageFileInput.addEventListener("change", () => {
    const file = newsImageFileInput.files[0];
    if (!validateImageFile(file)) {
      newsImageFileInput.value = "";
      return;
    }
    buildPreview();
  });

  editForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!activeCard) {
      return;
    }

    // prevent accidental double-submit
    if (saveButton.disabled) {
      return;
    }
    saveButton.disabled = true;

    if (activeCard.dataset.itemType === "news") {
      const isNew = activeCard.dataset.isNew === "true";
      if (!newsDateInput.value) {
        alert("Please enter a valid news date.");
        saveButton.disabled = false;
        return;
      }
      const img = activeCard.querySelector(".article-image img");
      const date = activeCard.querySelector(".news-date");
      const title = activeCard.querySelector("h3");
      const info = activeCard.querySelector(".news-info");
      if (img) {
        const file = newsImageFileInput.files[0];
        if (file) {
          if (!validateImageFile(file)) {
            saveButton.disabled = false;
            return;
          }
          try {
            const formData = new FormData();
            formData.append("image", file);
            const payload = await requestJson("/admin/upload", {
              method: "POST",
              body: formData
            });
            activeImageUrl = payload.url || activeImageUrl;
          } catch (err) {
            saveButton.disabled = false;
            throw err;
          }
        }

        if (activeImageUrl) {
          img.setAttribute("src", activeImageUrl);
        }
        img.setAttribute("alt", newsTitleInput.value.trim() || "News image");
      }
      if (date) {
        date.textContent = formatDisplayDate(newsDateInput.value.trim());
      }
      if (title) {
        title.textContent = newsTitleInput.value.trim();
      }
      if (info) {
        info.textContent = newsInfoInput.value.trim();
      }

      activeCard.dataset.newsDate = newsDateInput.value.trim();
      const category = activeCard.dataset.category || "Announcements";
      const payload = {
        title: newsTitleInput.value.trim(),
        info: newsInfoInput.value.trim(),
        date: newsDateInput.value.trim(),
        imageUrl: activeImageUrl,
        category
      };
      try {
        if (isNew) {
          // include tempId so client can reconcile placeholder if needed
          if (activeCard.dataset.tempId) {
            payload.tempId = activeCard.dataset.tempId;
          }
          const result = await requestJson("/api/news", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          activeCard.dataset.id = result.id;
          activeCard.dataset.isNew = "false";
          // clear temp id after server assigns real id
          delete activeCard.dataset.tempId;
        } else {
          const id = Number(activeCard.dataset.id);
          await requestJson(`/api/news/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
        }
        sortNewsByDate();
      } catch (error) {
        alert(error.message);
        saveButton.disabled = false;
        return;
      }
    } else {
      const isNew = activeCard.dataset.isNew === "true";
      if (!eventStartDateInput.value) {
        alert("Please enter a valid event start date.");
        saveButton.disabled = false;
        return;
      }
      if (eventEndDateInput.value && eventEndDateInput.value < eventStartDateInput.value) {
        alert("Event end date must be the same or after the start date.");
        saveButton.disabled = false;
        return;
      }
      const title = activeCard.querySelector("h3");
      const location = activeCard.querySelector(".event-location-text");
      const info = activeCard.querySelector(".event-info");
      const duration = activeCard.dataset.duration || "";
      if (title) {
        title.textContent = eventTitleInput.value.trim();
      }
      updateEventDateDisplay(activeCard, eventStartDateInput.value.trim(), eventEndDateInput.value.trim());
      if (location) {
        const text = eventLocationInput.value.trim();
        location.textContent = text ? `📍 ${text}` : "";
      }
      if (info) {
        info.textContent = eventInfoInput.value.trim();
      }

      activeCard.dataset.startDate = eventStartDateInput.value.trim();
      activeCard.dataset.endDate = eventEndDateInput.value.trim();
      const payload = {
        title: eventTitleInput.value.trim(),
        info: eventInfoInput.value.trim(),
        location: eventLocationInput.value.trim(),
        startDate: eventStartDateInput.value.trim(),
        endDate: eventEndDateInput.value.trim(),
        duration
      };
      try {
        if (isNew) {
          if (activeCard.dataset.tempId) {
            payload.tempId = activeCard.dataset.tempId;
          }
          const result = await requestJson("/api/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          activeCard.dataset.id = result.id;
          activeCard.dataset.isNew = "false";
          delete activeCard.dataset.tempId;
        } else {
          const id = Number(activeCard.dataset.id);
          await requestJson(`/api/events/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
        }
        sortEventsByDate();
      } catch (error) {
        alert(error.message);
        saveButton.disabled = false;
        return;
      }
    }

    closeModal();
    // re-enable save for next use
    saveButton.disabled = false;
  });

  sortNewsByDate();
  sortEventsByDate();
});