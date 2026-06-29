# Release Notes: Premium UI/UX Updates

## Web Application Updates
- **3D Parallax Scrolling**: Implemented a highly optimized, scroll-linked CSS variable architecture (`--scroll-offset`). As users scroll through long lists, the dynamic Aurora gradient background now shifts seamlessly at 25% of the scroll speed. This creates a stunning volumetric 3D glass illusion underneath the frosted UI cards without compromising performance or layout structure.
- **Glassmorphism Refinements**: Refined the global `.bg-card` glass panels to feature custom opacities and backdrop-blur filtering, providing maximum clarity against the parallax background.

## Android Native Application (Capacitor) Updates
- **Native Dock Safe Area Fix**: Fixed a critical layout bug where the iOS-style interactive bottom navigation dock (`MobileNav`) was clipping underneath the Android system navigation bar. Dynamic safe-area padding (`env(safe-area-inset-bottom)`) combined with a robust rem-based bottom margin ensures the dock sits perfectly floating above the system controls.
- **Capacitor Core Instability Resolved**: Patched a silent ReferenceError within `AppLayout.tsx` by explicitly importing the `@capacitor/core` plugin. This resolves intermittent rendering failures when evaluating `Capacitor.isNativePlatform()` inside the `AnimatePresence` wrapper during routing.
- **Unified 3D Parallax Support**: The identical CSS-variable driven Parallax Scrolling engine used on the Web App is now fully supported on the native Android WebView, delivering 60FPS fluid depth effects on mobile devices.
