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



// Select the footer content
const footer = document.querySelector('.footer-content');

// Create an Intersection Observer
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      footer.classList.add('p-visible'); // Add class when in view
    } else {
      footer.classList.remove('p-visible'); // Optional: Remove class if out of view
    }
  });
});

// Observe the footer content
observer.observe(footer);

function scrollToPosition(targetPosition) {
  window.scrollTo({
    top: targetPosition,
    behavior: 'smooth'
  });
}

document.getElementById('scroll-up').addEventListener('click', function () {
  scrollToPosition(0);
});

document.getElementById('scroll-down').addEventListener('click', function () {
  scrollToPosition(document.body.scrollHeight);
});

// Open Dialog
document.querySelectorAll('.open-dialog').forEach(button => {
    button.addEventListener('click', function() {
        const dialogId = this.getAttribute('data-dialog');
        document.getElementById(dialogId).style.display = 'block';
    });
});

// Close Dialog
document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        this.closest('.dialog').style.display = 'none';
    });
});

// Close dialog if user clicks outside the dialog content
window.addEventListener('click', function(event) {
    if (event.target.classList.contains('dialog')) {
        event.target.style.display = 'none';
    }
});