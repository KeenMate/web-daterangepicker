/// <reference types="vite/client" />

// Allow importing SCSS as inline string
declare module '*.scss?inline' {
  const content: string;
  export default content;
}

declare module '*.scss' {
  const content: string;
  export default content;
}
