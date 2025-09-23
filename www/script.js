document.addEventListener('DOMContentLoaded', function () {
  // Check if 'cookiesAccepted' is set to 'true' in localStorage
  if (localStorage.getItem('cookiesAccepted') !== 'true') {
    document.getElementById('cookie-banner').style.display = 'flex';
  } else {
      document.getElementById('cookie-banner').style.display = 'none';
  }

  // Set 'cookiesAccepted' to 'true' in localStorage when user accepts
  document.getElementById('accept-cookies').addEventListener('click', function () {
    localStorage.setItem('cookiesAccepted', 'true');
    document.getElementById('cookie-banner').style.display = 'none';
  });
});
