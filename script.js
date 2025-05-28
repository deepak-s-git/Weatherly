const apiKey = 'ebbec3fe6c8aba81ed0b421a0bafc1ab'; // Replace with your OpenWeatherMap API key

function getWeatherByCity() {
  const city = document.getElementById('cityInput').value.trim();
  if (!city) return alert('Please enter a city name');
  fetchWeather(city);
}

async function fetchWeather(city) {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`
    );
    const data = await res.json();

    if (data.cod !== 200) {
      alert('City not found');
      return;
    }

    updateWeatherUI(data);
    fetchForecast(data.coord.lat, data.coord.lon);
  } catch (error) {
    console.error(error);
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

  // Show the current weather card with fade-in effect
  const currentWeather = document.getElementById('currentWeather');
  currentWeather.classList.add('fade-in');
  currentWeather.style.opacity = 1;

  // Change background based on weather
  setBackground(data.weather[0].main);
}

async function fetchForecast(lat, lon) {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,alerts&appid=${apiKey}&units=metric`
    );
    const data = await res.json();

    updateHourlyForecast(data.hourly.slice(0, 12));
    updateWeeklyForecast(data.daily.slice(0, 7));
    updateAQI(data);
  } catch (error) {
    console.error(error);
  }
}

function updateHourlyForecast(hourly) {
  const container = document.getElementById('hourlyForecast');
  container.innerHTML = '';
  hourly.forEach(hour => {
    const time = new Date(hour.dt * 1000).getHours();
    const hourDiv = document.createElement('div');
    hourDiv.className = 'glass min-w-[100px] text-center p-3 rounded-xl flex flex-col items-center';
    hourDiv.innerHTML = `
      <p class="text-sm">${time}:00</p>
      <img src="https://openweathermap.org/img/wn/${hour.weather[0].icon}@2x.png" alt="${hour.weather[0].description}" class="w-12 h-12" />
      <p class="text-md font-semibold">${Math.round(hour.temp)}°C</p>
      <p class="text-xs mt-1">Wind: ${hour.wind_speed} m/s ${degToCompass(hour.wind_deg)}</p>
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
    dayDiv.className = 'glass text-center p-4 rounded-xl';
    dayDiv.innerHTML = `
      <p class="text-sm">${weekday}</p>
      <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png" alt="${day.weather[0].description}" class="w-12 h-12 mx-auto" />
      <p class="text-sm">${Math.round(day.temp.min)}° ~ ${Math.round(day.temp.max)}°</p>
      <p class="text-xs">Rain: ${Math.round((day.pop || 0) * 100)}%</p>
    `;
    container.appendChild(dayDiv);
  });
}

function updateAQI(data) {
  // OpenWeatherMap OneCall API doesn't provide AQI directly here
  // So for demo, we will show UV Index as AQI and '-' for pollutants
  document.getElementById('aqi').textContent = data.current.uvi.toFixed(1);
  document.getElementById('pm25').textContent = '-';
  document.getElementById('pm10').textContent = '-';
  document.getElementById('co').textContent = '-';
  document.getElementById('so2').textContent = '-';
}

function degToCompass(num) {
  const val = Math.floor((num / 22.5) + 0.5);
  const arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return arr[(val % 16)];
}

function setBackground(weatherMain) {
  const body = document.body;
  // Simple background sets for demo, can be expanded with animations or Lottie later
  switch (weatherMain.toLowerCase()) {
    case 'clear':
      body.style.background = 'linear-gradient(to bottom right, #fceabb, #f8b500)'; // bright sunny yellow
      break;
    case 'clouds':
      body.style.background = 'linear-gradient(to bottom right, #667eea, #764ba2)'; // moody purple-blue
      break;
    case 'rain':
    case 'drizzle':
      body.style.background = 'linear-gradient(to bottom right, #3a7bd5, #3a6073)'; // blue rain
      break;
    case 'thunderstorm':
      body.style.background = 'linear-gradient(to bottom right, #0f2027, #203a43, #2c5364)'; // dark stormy
      break;
    case 'snow':
      body.style.background = 'linear-gradient(to bottom right, #83a4d4, #b6fbff)'; // icy light blue
      break;
    case 'mist':
    case 'fog':
      body.style.background = 'linear-gradient(to bottom right, #606c88, #3f4c6b)'; // foggy gray
      break;
    default:
      body.style.background = 'linear-gradient(to bottom right, #0f172a, #1e293b, #111827)'; // default dark
  }
}
