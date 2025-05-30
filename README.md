# Weatherly 🌦️

**Weatherly** is a real-time, responsive weather forecast web app built with HTML, CSS, and JavaScript. It offers an intuitive and visually engaging interface for users to get up-to-date weather information, air quality indices, sunrise/sunset times, and more — all powered by **OpenWeatherMap** and **WAQI** APIs.

## 🌟 Features

- 🔍 Search for any city and get instant weather updates
- 📍 Use geolocation to fetch weather for your current location
- 🌤️ Dynamic backgrounds that reflect current weather conditions
- 🌙 Toggle between dark and light themes
- 🌡️ Current temperature, high/low, and "feels like"
- 🕒 3-hour interval hourly forecast with wind and UV data
- 📆 5-day extended forecast
- 📊 Weather details (wind, pressure, humidity, UV index, etc.)
- 🧪 Real-time air quality index with pollutants data
- 🌅 Interactive sunrise and sunset timeline

## 🛠️ Technologies Used

- HTML5
- CSS3 (with custom styling)
- JavaScript (DOM manipulation & API integration)
- Font Awesome (for weather and UI icons)
- Google Fonts (`Montserrat`)
- OpenWeatherMap API
- WAQI (World Air Quality Index) API

## 📦 Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/deepak-s-git/Weatherly.git
   cd weatherly
   ```

2. Open the `index.html` file in a browser or use Live Server (VS Code).

3. Make sure to add your **API keys** for:
   - `OpenWeatherMap` → https://openweathermap.org/api
   - `WAQI` → https://aqicn.org/data-platform/token/

4. Insert your API keys into the appropriate section in `script.js`:
   ```js
   const WEATHER_API_KEY = "YOUR_OPENWEATHERMAP_API_KEY";
   const AQI_API_KEY = "YOUR_WAQI_API_KEY";
   ```

## 📂 File Structure

```
weatherly/
├── index.html
├── style.css
├── script.js
└── README.md
```

## ✨ Future Enhancements

- Add multi-language support
- Save favorite cities
- Offline caching with service workers
- Animated weather icons

## 🙏 Acknowledgments

- [OpenWeatherMap API](https://openweathermap.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Google Fonts – Outfit](https://fonts.google.com/specimen/Outfit)