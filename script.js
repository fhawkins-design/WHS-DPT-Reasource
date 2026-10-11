(function () {
  var state = { grade: "all", type: "all" };
  var cards = Array.prototype.slice.call(document.querySelectorAll(".res-card"));
  var emptyState = document.querySelector(".empty-state");

  function applyFilters() {
    var visibleCount = 0;
    cards.forEach(function (card) {
      var gradeMatch = state.grade === "all" || card.dataset.grade === state.grade;
      var typeMatch = state.type === "all" || card.dataset.type === state.type;
      var show = gradeMatch && typeMatch;
      card.classList.toggle("is-hidden", !show);
      if (show) visibleCount++;
    });
    if (emptyState) emptyState.hidden = visibleCount !== 0;
  }

  document.querySelectorAll(".chip-row").forEach(function (row) {
    var filterKey = row.getAttribute("data-filter");
    row.addEventListener("click", function (event) {
      var button = event.target.closest(".chip");
      if (!button) return;
      row.querySelectorAll(".chip").forEach(function (chip) {
        chip.classList.remove("is-active");
      });
      button.classList.add("is-active");
      state[filterKey] = button.getAttribute("data-value");
      applyFilters();
    });
  });
})();
