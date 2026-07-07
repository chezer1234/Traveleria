import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Route changes keep the old scroll position by default, so clicking a country
// at the bottom of a long list used to land you mid-page on the next route.
// Only the pathname matters — tab switches via ?tab= must not jump the page.
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
