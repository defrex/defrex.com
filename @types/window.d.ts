declare global {
  interface Window {
    fbq?: facebook.Pixel.Event
    dataLayer?: any[]
  }
}

export {}
