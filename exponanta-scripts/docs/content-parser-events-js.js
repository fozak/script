const out = {
  title: document.title,
  text: document.body.innerText.trim(),
  images: [...new Set([...document.querySelectorAll('img')].map(i => i.src).filter(Boolean))],
  links: [...new Set([...document.querySelectorAll('a')].map(a => a.href).filter(s => s.startsWith('http')))]
};
copy(JSON.stringify(out, null, 2));
console.log(out);