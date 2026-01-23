# Kabalikat Agent ("The Ally")

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Built With Capacitor](https://img.shields.io/badge/Built%20With-Capacitor-blue)
![Built With React](https://img.shields.io/badge/Built%20With-React-61DAFB)

> An autonomous personal agent providing total life management: Academic, Work, Organizations, and Personal well-being.

Kabalikat (Tagalog for "Ally") is a hybrid AI agent built with **React**, **Capacitor**, and **Google Gemini 2.0**. It is designed to act as a proactive "Background Sentry" that monitors your life streams (Email, Calendar) and a "Companion" that you can talk to.

It features **Hardware-Level Alerts** (Flashlight Strobe, Screen Wake, Native Alarm) for critical deadlines and conflicts, ensuring you never miss what matters even if your phone is silent.

<div align="center">
  <img src="public/Kabalikat.svg" width="100" />
</div>

## 🚀 Features

*   **🛡️ Background Sentry Mode**: Autonomously analyzes emails and schedule conflicts.
*   **🚨 Tier 1 Hardware Alerts**: Triggers real physical alarms (Flashlight Strobe + Siren + Screen Wake) for critical events.
*   **🧠 Total Recall Memory**: Remembers your preferences, routines, and identity using the TOON memory format.
*   **👁️ Vision Sentry**: Uses AI Vision to scan and extract schedules from photos of documents or whiteboards.
*   **📅 Intelligent Calendar**: Auto-schedules events and detects conflicts between Work, School, and Org commitments.
*   **🔌 Plugin Architecture**: Built on Capacitor to access Native Android features (AlarmManager, Flashlight, Notifications).

## 🛠️ Tech Stack

*   **Framework**: React 19 + Vite
*   **Native Runtime**: Capacitor 8 (Android)
*   **AI Core**: Google Gemini 2.0 Flash (via Google AI SDK)
*   **Styling**: TailwindCSS
*   **Icons**: Lucide React
*   **Storage**: LocalStorage + FileSystem (Hybrid)

## ⚡ Prerequisites

*   Node.js (v18 or higher)
*   Android Studio (for building the APK)
*   A Google Gemini API Key

## 📦 Installation

### 📲 Download APK (Android)

You can download the latest pre-built APK from the [Releases Page](https://github.com/yourusername/kabalikat-agent/releases) of this repository.

### 🏗️ Build from Source

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/kabalikat-agent.git
    cd kabalikat-agent
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env.local` file in the root directory:
    ```bash
    GEMINI_API_KEY=your_gemini_api_key_here
    ```

4.  **Sync Native Project**
    ```bash
    npm run build
    npx cap sync android
    ```

## 📱 Running on Device

To test the **Hardware Alerts** and **Native Alarm** features, you must run this on a physical Android device or Emulator.

1.  **Open in Android Studio**
    ```bash
    npx cap open android
    ```
2.  Wait for Gradle to sync, then press the **Run** (▶️) button.

*(Note: Web-only features work directly with `npm run dev`, but native alarms will fallback to console logs.)*

## 🔑 OAuth Configuration (For Google Sign-In)

If you are using the Google Classroom or Gmail integration features, you need to configure your Google Cloud Console:

1.  Create an OAuth 2.0 Client ID (Web Application).
2.  Add `https://localhost` to **Authorized Redirect URIs**.
3.  Add the Client ID and Secret in the App Settings inside the application.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.