

//

window._origFetch = window.fetch;
window.fetch = function(url, ...args) {
  if (String(url).startsWith('chrome-extension://')) return Promise.reject(new Error('blocked'));
  return window._origFetch(url, ...args);
};

// REMOVE PANELS & ELEMENTS
document.querySelectorAll('.global-nav__a11y-menu.global-alert-offset-top').forEach(el => el.remove());
document.querySelectorAll('.application-outlet__overlay-container').forEach(el => el.remove());
document.querySelectorAll('.global-footer.global-footer--static').forEach(el => el.remove());
document.getElementById('global-nav')?.remove();

const sections = document.querySelectorAll('section.artdeco-card');
if (sections.length > 1) sections[1].remove();

// Set aside background immediately to avoid flash
const aside = document.querySelector('.scaffold-layout__aside');
if (aside) aside.style.background = 'white';

// Poll until "show more" buttons appear, then click them
const waitForButtons = setInterval(() => {
  const buttons = document.querySelectorAll('.inline-show-more-text__button.inline-show-more-text__button--light.link');
  if (buttons.length === 0) return;

  clearInterval(waitForButtons);
  buttons.forEach((el, i) => setTimeout(() => el.click(), i * 150));

  // Clone after all clicks have fired (text is expanded)
  setTimeout(() => {
    const aboutSection = document.querySelector('section:has(#about)');
    if (aside && aboutSection) {
      aside.replaceChildren(aboutSection.cloneNode(true));
      aside.style.background = 'white';
    }

    // Remove 2nd artdeco-card section now (after clone)
    const sections2 = document.querySelectorAll('section.artdeco-card');
    if (sections2.length > 1) sections2[1].remove();

    document.querySelectorAll('.scaffold-layout-toolbar').forEach(el => el.remove());
    document.querySelectorAll('.link-without-hover-visited').forEach(el => el.remove());
    const sections3 = document.querySelectorAll('section.artdeco-card');
    if (sections3.length > 7) sections3[7].remove();
    console.log('Cleanup complete.');
  }, buttons.length * 150 + 200);

}, 150);