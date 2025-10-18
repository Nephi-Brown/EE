const input = document.querySelector('.search-input');
const button = document.querySelector('.search-btn');
function go() {
  const term = (input?.value || '').trim();
  if (term) {
    const url = `/search_results/index.html?query=${encodeURIComponent(term)}`;
    window.location.href = url;
  }
}
button?.addEventListener('click', (e) => {
  e.preventDefault();
  go();
});
input?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    go();
  }
});
