const apiKey = 'YOUR_API_KEY_HERE'; // Replace with your OpenWeatherMap API key

async function getWeatherByCity() {
  const city = document.getElementById('cityInput').value.trim();
  if (!city) return alert('Please enter a city name');
  await fetchWeather(city);
}

async function fetchWeather(city) {
  try {
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`
    );
    const weatherData = await weatherRes.json();

    if (weatherData.cod !== 200) {
      alert('City not found');
      return;
    }

    updateWeatherUI(weatherData);

    // Fetch forecast & air quality by lat/lon
    const { lat, lon } = weatherData.coord;
    await fetchForecast(lat, lon);
    await fetchAirQuality(lat, lon);
  } catch (error) {
    console.error('Error fetching weather:', error);
  }
}

function updateWeatherUI(data) {
  document.getElementById('cityName').textContent = data.name;
  document.getElementById('temperature').textContent = `${Math.round(data.main.temp)}°C`;
  document.getElementById('condition').textContent = data.weather[0].description;
  document.getElementById('feelsLike').textContent = `Feels like ${Math.round(data.main.feels_like)}°C`;
  document.getElementById('highLow').textContent = `${Math.round(data.main.temp_min)}° ~ ${Math.round(data.main.temp_max)}°`;

  document.getElementById('humidity').textContent = `${data.main.humidity}%`;
  document.getElementById('wind').textContent = `${data.wind.speed} m/s, ${degToCompass(data.wind.deg)}`;
  document.getElementById('visibility').textContent = `${(data.visibility / 1000).toFixed(1)} km`;
  document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;

  const sunrise = new Date(data.sys.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const sunset = new Date(data.sys.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.getElementById('sunrise').textContent = sunrise;
  document.getElementById('sunset').textContent = sunset;

  // Show current weather card with fade-in
  const currentWeather = document.getElementById('currentWeather');
  currentWeather.classList.add('fade-in');
  currentWeather.style.opacity = 1;

  // Set dynamic background based on weather
  setBackground(data.weather[0].main);
}

async function fetchForecast(lat, lon) {
  try {
    const forecastRes = await fetch(
      `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,alerts,current&appid=${apiKey}&units=metric`
    );
    const forecastData = await forecastRes.json();

    updateHourlyForecast(forecastData.hourly.slice(0, 12));
    updateWeeklyForecast(forecastData.daily.slice(0, 7));
  } catch (error) {
    console.error('Error fetching forecast:', error);
  }
}

function updateHourlyForecast(hourly) {
  const container = document.getElementById('hourlyForecast');
  container.innerHTML = '';
  hourly.forEach(hour => {
    const time = new Date(hour.dt * 1000).getHours();
    const hourDiv = document.createElement('div');
    hourDiv.className =
      'glass min-w-[100px] text-center p-3 rounded-xl flex flex-col items-center transition-transform duration-300 hover:scale-110 hover:shadow-lg cursor-pointer';
    hourDiv.innerHTML = `
      <p class="text-sm">${time}:00</p>
      <img src="https://openweathermap.org/img/wn/${hour.weather[0].icon}@2x.png" alt="${hour.weather[0].description}" class="w-12 h-12" />
      <p class="text-md font-semibold">${Math.round(hour.temp)}°C</p>
      <p class="text-xs mt-1">Wind: ${hour.wind_speed.toFixed(1)} m/s ${degToCompass(hour.wind_deg)}</p>
      <p class="text-xs">UV: ${hour.uvi.toFixed(1)}</p>
    `;
    container.appendChild(hourDiv);
  });
}

function updateWeeklyForecast(daily) {
  const container = document.getElementById('weeklyForecast');
  container.innerHTML = '';
  daily.forEach(day => {
    const date = new Date(day.dt * 1000);
    const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
    const dayDiv = document.createElement('div');
    dayDiv.className =
      'glass text-center p-4 rounded-xl transition-transform duration-300 hover:scale-105 hover:shadow-lg cursor-pointer';
    dayDiv.innerHTML = `
      <p class="text-sm">${weekday}</p>
      <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png" alt="${day.weather[0].description}" class="w-12 h-12 mx-auto" />
      <p class="text-sm">${Math.round(day.temp.min)}° ~ ${Math.round(day.temp.max)}°</p>
      <p class="text-xs">Rain: ${Math.round((day.pop || 0) * 100)}%</p>
    `;
    container.appendChild(dayDiv);
  });
}

// Fetch air quality info separately
async function fetchAirQuality(lat, lon) {
  try {
    const aqiRes = await fetch(
      `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`
    );
    const aqiData = await aqiRes.json();

    if (!aqiData.list || !aqiData.list.length) {
      console.warn('No AQI data available');
      return;
    }

    const aqi = aqiData.list[0];
    const aqiIndex = aqi.main.aqi;

    document.getElementById('aqi').textContent = aqiIndexToText(aqiIndex);
    document.getElementById('pm25').textContent = aqi.components.pm2_5 + ' µg/m³';
    document.getElementById('pm10').textContent = aqi.components.pm10 + ' µg/m³';
    document.getElementById('co').textContent = aqi.components.co + ' µg/m³';
    document.getElementById('so2').textContent = aqi.components.so2 + ' µg/m³';

    // Set AQI color (background) dynamically
    const aqiBox = document.getElementById('aqi').parentElement;
    aqiBox.style.color = aqiColor(aqiIndex);
  } catch (error) {
    console.error('Error fetching air quality:', error);
  }
}

function aqiIndexToText(aqi) {
  switch (aqi) {
    case 1:
      return 'Good';
    case 2:
      return 'Fair';
    case 3:
      return 'Moderate';
    case 4:
      return 'Poor';
    case 5:
      return 'Very Poor';
    default:
      return 'Unknown';
  }
}

function aqiColor(aqi) {
  switch (aqi) {
    case 1:
      return '#10B981'; // Green
    case 2:
      return '#FBBF24'; // Yellow
    case 3:
      return '#F97316'; // Orange
    case 4:
      return '#EF4444'; // Red
    case 5:
      return '#B91C1C'; // Dark Red
    default:
      return '#9CA3AF'; // Gray
  }
}

function degToCompass(num) {
  const val = Math.floor((num / 22.5) + 0.5);
  const arr = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
  ];
  return arr[(val % 16)];
}

function setBackground(weatherMain) {
  const body = document.body;
  body.style.transition = 'background 1s ease-in-out';

  switch (weatherMain.toLowerCase()) {
    case 'clear':
      body.style.background = 'linear-gradient(to bottom right, #fceabb, #f8b500)';
      break;
    case 'clouds':
      body.style.background = 'linear-gradient(to bottom right, #667eea, #764ba2)';
      break;
    case 'rain':
    case 'drizzle':
      body.style.background = 'linear-gradient(to bottom right, #3a7bd5, #3a6073)';
      break;
    case 'thunderstorm':
      body.style.background = 'linear-gradient(to bottom right, #0f2027, #203a43, #2c5364)';
      break;
    case 'snow':
      body.style.background = 'linear-gradient(to bottom right, #83a4d4, #b6fbff)';
      break;
    case 'mist':
    case 'fog':
    case 'haze':
      body.style.background = 'linear-gradient(to bottom right, #757f9a, #d7dde8)';
      break;
    default:
      body.style.background = 'linear-gradient(to bottom right, #0f172a, #1e293b, #111827)';
      break;
  }
}

document.getElementById('cityInput').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    getWeatherByCity();
  }
});

document.getElementById('searchBtn').addEventListener('click', getWeatherByCity);

// On load, try geolocation:
window.onload = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async position => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
        const data = await res.json();
        updateWeatherUI(data);
        await fetchForecast(lat, lon);
        await fetchAirQuality(lat, lon);
      },
      () => alert('Geolocation permission denied. Please search city manually.')
    );
  }
};