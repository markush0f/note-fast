// Apply the cached appearance before the first paint. The workspace is authoritative.
try {
  const theme = localStorage.getItem("ntbk:theme");
  document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
} catch {
  document.documentElement.dataset.theme = "light";
}
