/* 由 工具/make-index.mjs 自动生成 */
(function () {
  var issues = [{"file":"20261124.html","date":"2026-11-24"},{"file":"20261123.html","date":"2026-11-23"},{"file":"20261122.html","date":"2026-11-22"},{"file":"20261121.html","date":"2026-11-21"},{"file":"20261119.html","date":"2026-11-19"},{"file":"20261118.html","date":"2026-11-18"},{"file":"20261117.html","date":"2026-11-17"},{"file":"20261116.html","date":"2026-11-16"},{"file":"20261109.html","date":"2026-11-09"},{"file":"20261108.html","date":"2026-11-08"},{"file":"20261107.html","date":"2026-11-07"},{"file":"20261106.html","date":"2026-11-06"},{"file":"20261105.html","date":"2026-11-05"},{"file":"20261104.html","date":"2026-11-04"},{"file":"20261103.html","date":"2026-11-03"}];
  window.EVERYNEWS_ISSUES = issues;
  var nav = document.querySelector(".issue-nav");
  var sel = document.getElementById("issue-select");
  if (!sel) return;
  var current = (nav && nav.getAttribute("data-current")) || (issues[0] && issues[0].file) || "";
  sel.innerHTML = issues
    .map(function (it, idx) {
      var label = it.date + (idx === 0 ? " · 最新" : "");
      return '<option value="' + it.file + '"' + (it.file === current ? " selected" : "") + ">" + label + "</option>";
    })
    .join("") + '<option value="archive.html">全部期次 · 按日期篩選</option>';
  var hint = document.getElementById("issue-nav-hint");
  if (hint) hint.textContent = "共 " + issues.length + " 期";
  sel.addEventListener("change", function () {
    if (this.value) location.href = this.value;
  });
})();
