import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Dialog } from '@capacitor/dialog';
import { Capacitor } from '@capacitor/core';

export function BackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let isDialogShowing = false;

    const listener = CapacitorApp.addListener('backButton', async () => {
      if (isDialogShowing) return;

      // 1. Check if a Vaul Drawer (Bottom Sheet) is open
      const activeDrawer = document.querySelector('[vaul-drawer]') || document.querySelector('[data-vaul-drawer]');
      if (activeDrawer) {
        // Dispatch Escape to let Vaul gracefully close the drawer
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        return;
      }

      const path = location.pathname;
      // Define all logical "root" endpoints where back button should ask to exit
      const isRootPath = path === '/app' || path === '/app/' || path === '/login' || path === '/';

      if (isRootPath) {
        // At the root, prompt before exiting
        isDialogShowing = true;
        const { value } = await Dialog.confirm({
          title: 'Exit App',
          message: 'Are you sure you want to exit Nivasa?',
          okButtonTitle: 'Exit',
          cancelButtonTitle: 'Stay',
        });
        isDialogShowing = false;

        if (value) {
          CapacitorApp.exitApp();
        }
      } else {
        // If nested somewhere else (like in /app/tenants/123), go back normally!
        navigate(-1);
      }
    });

    // Cleanup listener on unmount/re-render
    return () => {
      listener.then(l => l.remove());
    };
  }, [location, navigate]);

  return null;
}
