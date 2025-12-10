/// <reference types="vite/client" />

// Allow importing CSS as inline string
declare module '*.css?inline' {
  const content: string;
  export default content;
}

// Build-time constants injected by Vite
declare const __VERSION__: string;
declare const __PACKAGE_NAME__: string;
declare const __AUTHOR__: string;
declare const __LICENSE__: string;
declare const __REPOSITORY__: string;
declare const __HOMEPAGE__: string;
