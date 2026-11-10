(function () {
  "use strict";

  var data = window.libraryData || { books: [] };
  var config = window.catalogueConfig || {};
  var syncStatus = document.getElementById("sync-status");
  var searchInput = document.getElementById("book-search");
  var count = document.getElementById("catalogue-count");
  var empty = document.getElementById("book-empty");
  var bookList = document.getElementById("book-list");
  var toggleBooks = document.getElementById("toggle-books");

  function safe(value) {
    return String(value == null || value === "" ? "Not recorded" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function updateToggleLabel() {
    if (!toggleBooks || !bookList) return;
    var records = Array.prototype.slice.call(bookList.querySelectorAll("[data-book-record]"));
    var allOpen = records.length > 0 && records.every(function (record) {
      return record.open;
    });
    toggleBooks.setAttribute("aria-expanded", allOpen ? "true" : "false");
    toggleBooks.innerHTML = allOpen
      ? 'Collapse all records <span aria-hidden="true">−</span>'
      : 'Expand all records <span aria-hidden="true">＋</span>';
  }

  function renderBooks() {
    if (!bookList || !searchInput || !count || !empty) return;

    var query = (searchInput.value || "").trim().toLowerCase();
    var books = Array.isArray(data.books) ? data.books : [];
    var matches = books.filter(function (book) {
      var searchable = (String(book.title || "") + " " + String(book.author || "") + " " + String(book.location || "") + " " + String(book.copies || "")).toLowerCase();
      return !query || searchable.indexOf(query) !== -1;
    });

    bookList.innerHTML = matches.map(function (book) {
      return '<details class="book-record" data-book-record>' +
        '<summary class="book-record__summary">' +
          '<span class="book-record__title"><strong>' + safe(book.title) + '</strong><span>' + safe(book.author) + '</span></span>' +
          '<span class="book-record__quick"><span>' + safe(book.copies) + ' copies / notes</span><span>View details</span></span>' +
          '<span class="book-record__chevron" aria-hidden="true">＋</span>' +
        '</summary>' +
        '<div class="book-record__details">' +
          '<div class="book-detail"><span class="book-detail__label">Author</span><span>' + safe(book.author) + '</span></div>' +
          '<div class="book-detail"><span class="book-detail__label">Copies / notes</span><span>' + safe(book.copies) + '</span></div>' +
          '<div class="book-detail"><span class="book-detail__label">Current location</span><span>' + safe(book.location) + '</span></div>' +
        '</div>' +
      '</details>';
    }).join("");

    count.textContent = "Showing " + matches.length + " of " + books.length + " titles";
    empty.hidden = matches.length !== 0;
    updateToggleLabel();
  }

  if (searchInput && bookList) {
    searchInput.addEventListener("input", renderBooks);
    bookList.addEventListener("toggle", updateToggleLabel, true);

    if (toggleBooks) {
      toggleBooks.addEventListener("click", function () {
        var records = Array.prototype.slice.call(bookList.querySelectorAll("[data-book-record]"));
        var shouldOpen = records.some(function (record) { return !record.open; });
        records.forEach(function (record) { record.open = shouldOpen; });
        updateToggleLabel();
      });
    }

    renderBooks();
    updateFromSheet();
    if (config.csvUrl && config.refreshMinutes > 0) {
      setInterval(updateFromSheet, Math.max(1, config.refreshMinutes) * 60000);
    }
  }

  function parseCSV(csv) {
    var rows = [], row = [], cell = "", quoted = false;
    for (var i = 0; i < csv.length; i++) {
      var c = csv[i];
      if (c === '"') {
        if (quoted && csv[i + 1] === '"') { cell += '"'; i++; }
        else quoted = !quoted;
      } else if (c === ',' && !quoted) { row.push(cell); cell = ""; }
      else if ((c === '\n' || c === '\r') && !quoted) {
        if (c === '\r' && csv[i + 1] === '\n') i++;
        row.push(cell); if (row.some(function (x) { return x.trim(); })) rows.push(row);
        row = []; cell = "";
      } else cell += c;
    }
    row.push(cell); if (row.some(function (x) { return x.trim(); })) rows.push(row);
    return rows;
  }
  function fromCSV(csv) {
    var rows = parseCSV(csv);
    if (rows.length < 2) throw Error("No book records found");
    var headers = rows.shift().map(function (h) { return h.toLowerCase().trim(); });
    function column(patterns) {
      return headers.findIndex(function (h) { return patterns.some(function (p) { return h.indexOf(p) !== -1; }); });
    }
    var title = column(["title", "book name", "text name"]);
    var author = column(["author", "writer"]);
    var copies = column(["copies", "quantity", "number", "stock", "notes"]);
    var location = column(["location", "shelf", "room", "where"]);
    if (title < 0) throw Error("Sheet needs a Title column");
    return rows.map(function (r) {
      return {title:r[title] || "", author:r[author] || "", copies:r[copies] || "", location:r[location] || ""};
    }).filter(function (r) { return r.title.trim(); });
  }
  async function updateFromSheet() {
    if (!config.csvUrl) {
      if (syncStatus) syncStatus.textContent = "Showing the included inventory snapshot. Live Google Sheets sync requires a published CSV URL in catalogue-config.js.";
      return;
    }
    try {
      var separator = config.csvUrl.indexOf('?') === -1 ? '?' : '&';
      var response = await fetch(config.csvUrl + separator + '_=' + Date.now(), {cache:'no-store'});
      if (!response.ok) throw Error('HTTP ' + response.status);
      var books = fromCSV(await response.text());
      data = {books:books}; renderBooks();
      if (syncStatus) syncStatus.textContent = "Live Google Sheets catalogue · " + books.length + " titles · Updated " + new Date().toLocaleTimeString();
    } catch (err) {
      if (syncStatus) syncStatus.textContent = "Live sync unavailable (" + err.message + "). Showing last available catalogue data.";
    }
  }
})();
