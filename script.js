// Smooth scrolling for internal anchor links
document.querySelectorAll('nav a').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    // Check if the link is an internal anchor (starts with #)
    if (this.getAttribute('href').startsWith('#')) {
      e.preventDefault();
      document.querySelector(this.getAttribute('href')).scrollIntoView({
        behavior: 'smooth'
      });
    }
    // If it's a link to another page, don't prevent default
  });
});