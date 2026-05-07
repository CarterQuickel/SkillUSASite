document.addEventListener("DOMContentLoaded", () => {
  const editModal = document.getElementById("adminEditModal");
  if (!editModal) {
    return;
  }

  const editForm = document.getElementById("adminEditForm");
  const modalTitle = document.getElementById("adminModalTitle");
  const newsSection = editModal.querySelector('[data-admin-section="news"]');
  const eventSection = editModal.querySelector('[data-admin-section="event"]');
  const newsImageInput = document.getElementById("adminNewsImage");
  const newsDateInput = document.getElementById("adminNewsDate");
  const newsTitleInput = document.getElementById("adminNewsTitle");
  const newsInfoInput = document.getElementById("adminNewsInfo");
  const eventTitleInput = document.getElementById("adminEventTitle");
  const eventMonthInput = document.getElementById("adminEventMonth");
  const eventDateInput = document.getElementById("adminEventDate");
  const eventLocationInput = document.getElementById("adminEventLocation");
  const eventInfoInput = document.getElementById("adminEventInfo");

  let activeCard = null;

  const closeModal = () => {
    editModal.classList.remove("is-open");
    editModal.setAttribute("aria-hidden", "true");
    activeCard = null;
  };

  const openModal = (card) => {
    activeCard = card;
    const type = card.dataset.itemType;
    newsSection.classList.remove("is-active");
    eventSection.classList.remove("is-active");

    if (type === "news") {
      const img = card.querySelector(".article-image img");
      const date = card.querySelector(".news-date");
      const title = card.querySelector("h3");
      const info = card.querySelector(".news-info");
      newsImageInput.value = img ? img.getAttribute("src") : "";
      newsDateInput.value = date ? date.textContent.trim() : "";
      newsTitleInput.value = title ? title.textContent.trim() : "";
      newsInfoInput.value = info ? info.textContent.trim() : "";
      newsSection.classList.add("is-active");
      modalTitle.textContent = "Edit news";
    } else {
      const title = card.querySelector("h3");
      const month = card.querySelector(".event-month");
      const date = card.querySelector(".event-day, .date-display");
      const location = card.querySelector(".event-location-text");
      const info = card.querySelector(".event-info");
      eventTitleInput.value = title ? title.textContent.trim() : "";
      eventMonthInput.value = month ? month.textContent.trim() : "";
      eventDateInput.value = date ? date.textContent.trim() : "";
      eventLocationInput.value = location ? location.textContent.replace(/^📍\s*/, "").trim() : "";
      eventInfoInput.value = info ? info.textContent.trim() : "";
      eventSection.classList.add("is-active");
      modalTitle.textContent = "Edit event";
    }

    editModal.classList.add("is-open");
    editModal.setAttribute("aria-hidden", "false");
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
        openModal(newCard);
      }
      return;
    }

    const deleteButton = event.target.closest(".admin-delete-button");
    if (deleteButton) {
      const card = deleteButton.closest("[data-item-type]");
      if (card) {
        card.remove();
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

  editForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!activeCard) {
      return;
    }

    if (activeCard.dataset.itemType === "news") {
      const img = activeCard.querySelector(".article-image img");
      const date = activeCard.querySelector(".news-date");
      const title = activeCard.querySelector("h3");
      const info = activeCard.querySelector(".news-info");
      if (img) {
        img.setAttribute("src", newsImageInput.value.trim());
        img.setAttribute("alt", newsTitleInput.value.trim() || "News image");
      }
      if (date) {
        date.textContent = newsDateInput.value.trim();
      }
      if (title) {
        title.textContent = newsTitleInput.value.trim();
      }
      if (info) {
        info.textContent = newsInfoInput.value.trim();
      }
    } else {
      const title = activeCard.querySelector("h3");
      const month = activeCard.querySelector(".event-month");
      const date = activeCard.querySelector(".event-day, .date-display");
      const location = activeCard.querySelector(".event-location-text");
      const info = activeCard.querySelector(".event-info");
      if (title) {
        title.textContent = eventTitleInput.value.trim();
      }
      if (month) {
        month.textContent = eventMonthInput.value.trim();
      }
      if (date) {
        date.textContent = eventDateInput.value.trim();
      }
      if (location) {
        const text = eventLocationInput.value.trim();
        location.textContent = text ? `📍 ${text}` : "";
      }
      if (info) {
        info.textContent = eventInfoInput.value.trim();
      }
    }

    closeModal();
  });
});
