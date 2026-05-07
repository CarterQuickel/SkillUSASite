document.addEventListener("DOMContentLoaded", () => {
  const cards = Array.from(document.querySelectorAll(".sponsor-card"));
  cards.forEach((card, index) => {
    card.style.animationDelay = `${index * 80}ms`;
  });
  
  // Nav submenu toggle for click-to-open on desktop and touch on small screens
  const navItems = Array.from(document.querySelectorAll('.nav-item'));
  navItems.forEach(item => {
    const link = item.querySelector('a');
    const submenu = item.querySelector('.submenu');
    
    if (!submenu) return; // Skip if no submenu
    
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Close any other open submenus first
      navItems.forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove('open');
          const otherSubmenu = otherItem.querySelector('.submenu');
          if (otherSubmenu && window.matchMedia('(max-width: 960px)').matches) {
            otherSubmenu.style.display = '';
          }
        }
      });
      
      // Toggle this item's submenu
      item.classList.toggle('open');
      
      // On small screens, manually control display; on desktop, CSS :hover + .open class handles it
      if (window.matchMedia('(max-width: 960px)').matches) {
        submenu.style.display = item.classList.contains('open') ? 'flex' : 'none';
      }
    });
  });

  // Close submenus when clicking outside the nav
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.main-nav')) {
      navItems.forEach(item => {
        item.classList.remove('open');
        const submenu = item.querySelector('.submenu');
        if (submenu && window.matchMedia('(max-width: 960px)').matches) {
          submenu.style.display = '';
        }
      });
    }
  });

});
