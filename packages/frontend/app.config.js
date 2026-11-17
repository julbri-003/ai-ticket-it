// Config dinámica de Expo. EXPO_PUBLIC_API_URL se lee de packages/frontend/.env
// (ver .env.example). Expo además la inyecta en el bundle como process.env.EXPO_PUBLIC_API_URL.
export default {
  expo: {
    name: "AI Ticket It",
    slug: "ai-ticket-it",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#f6efe2",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: ["expo-secure-store", "expo-image", "expo-font"],
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000/api",
    },
  },
};
