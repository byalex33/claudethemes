// Sets the mode before first paint, so a dark-mode visitor never sees a white flash.
// A file, not an inline script, so the content security policy can refuse inline scripts.
try {
  var m = localStorage.getItem('mode')
  if (m === 'dark' || (m !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark')
  }
} catch {
  // Storage is blocked: the system setting decides.
}
