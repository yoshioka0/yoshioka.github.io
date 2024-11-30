
// header js
const imageSources = [
    '/nihongo/img/dp/icon1.png', 
    '/nihongo/img/dp/icon2.png', 
    '/nihongo/img/dp/icon3.png', 
    '/nihongo/img/dp/icon4.png',
    '/nihongo/img/dp/icon5.png',
    '/nihongo/img/dp/icon6.png',
    '/nihongo/img/dp/icon7.png',
    '/nihongo/img/dp/icon8.png'
  ];

  // Load the image source from localStorage or set the default one
  window.onload = function() {
    const savedImage = localStorage.getItem('profileImage');
    const img = document.getElementById('profileImg');
    img.src = savedImage ? savedImage : imageSources[0]; // Use saved image or default
  };

  function changeImage() {
    const img = document.getElementById('profileImg');
    const currentSrc = img.src.split('/').slice(-3).join('/'); // Extract the relative path
    const currentIndex = imageSources.findIndex(src => src === currentSrc);

    // Cycle to the next image
    const nextIndex = (currentIndex + 1) % imageSources.length;
    img.src = imageSources[nextIndex];

    // Save the selected image source in localStorage
    localStorage.setItem('profileImage', imageSources[nextIndex]);
}


// Toggle notification dropdown
const notificationBtn = document.getElementById("notification-btn");
const notificationDropdown = document.getElementById("notification-dropdown");

notificationBtn.addEventListener("click", () => {
  notificationDropdown.style.display = notificationDropdown.style.display === "block" ? "none" : "block";
});


// Toggle hamburger menu
const hamburgerBtn = document.getElementById("hamburger-btn");
hamburgerBtn.addEventListener("click", () => {
  document.body.classList.toggle("show-menu");
});
