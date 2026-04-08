// Global type augmentations for Popcorn Cinema

/// <reference types="vite/client" />

// Extend Window if needed
declare global {
  interface Window {
    __socket?: import('socket.io-client').Socket
  }
}

export {}
