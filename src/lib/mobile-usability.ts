/** Breakpoint alinhado ao hook useIsMobile e padrões Tailwind md. */
export const MOBILE_BREAKPOINT = 768;

/** Tamanho mínimo de alvo de toque (Apple HIG / WCAG 2.5.5). */
export const MIN_TOUCH_TARGET_PX = 44;

/** Altura da barra inferior fixa (sem safe-area). */
export const MOBILE_BOTTOM_BAR_HEIGHT_PX = 56;

export type MobilePanel = "tools" | "slides" | "properties" | "share" | null;

/** Classes utilitárias para alvos de toque acessíveis. */
export const touchTargetClass =
  "inline-flex min-h-11 min-w-11 items-center justify-center touch-manipulation select-none";

/** Padding inferior que respeita notch/home indicator do iOS. */
export const safeAreaBottomClass = "pb-[max(0.5rem,env(safe-area-inset-bottom))]";

/** Padding superior que respeita status bar / Dynamic Island. */
export const safeAreaTopClass = "pt-[max(0px,env(safe-area-inset-top))]";
