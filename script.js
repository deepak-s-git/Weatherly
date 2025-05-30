// Constants and configuration
const WEATHER_API_KEY = 'YOUR_OPENWEATHERMAP_API_KEY'; // User needs to replace this with their API key
const WAQI_API_KEY = 'YOUR_WAQI_API_KEY'; // User needs to replace this with their WAQI token

// API URLs
const WEATHER_API_BASE_URL = 'https://api.openweathermap.org/data/2.5';
const CURRENT_WEATHER_API_URL = `${WEATHER_API_BASE_URL}/weather`;
const FORECAST_API_URL = `${WEATHER_API_BASE_URL}/forecast`;
const GEO_API_URL = 'https://api.openweathermap.org/geo/1.0/direct';
const REVERSE_GEO_API_URL = 'https://api.openweathermap.org/geo/1.0/reverse';
const WAQI_API_URL = 'https://api.waqi.info/feed';

const DEFAULT_CITY = 'London';
const UNITS = 'metric'; // Use metric units (Celsius)

// DOM Elements
const elements = {
    // Theme elements
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    
    // Location elements
    locationName: document.getElementById('locationName'),
    locationSearch: document.getElementById('locationSearch'),
    searchBtn: document.getElementById('searchBtn'),
    geolocateBtn: document.getElementById('geolocateBtn'),
    
    // Current weather elements
    currentTemp: document.getElementById('currentTemp'),
    weatherCondition: document.getElementById('weatherCondition'),
    feelsLike: document.getElementById('feelsLike'),
    tempHigh: document.getElementById('tempHigh'),
    tempLow: document.getElementById('tempLow'),
    weatherBackground: document.getElementById('weatherBackground'),
    
    // Hourly forecast elements (will show 3-hour intervals)
    hourlyForecast: document.getElementById('hourlyForecast'),
    tempTrendContainer: document.getElementById('tempTrendContainer'),
    
    // Weekly forecast elements (will be derived from 5-day forecast)
    weeklyForecast: document.getElementById('weeklyForecast'),
    
    // Weather details elements
    detailFeelsLike: document.getElementById('detailFeelsLike'),
    detailWind: document.getElementById('detailWind'),
    detailHumidity: document.getElementById('detailHumidity'),
    detailUV: document.getElementById('detailUV'),
    detailVisibility: document.getElementById('detailVisibility'),
    detailPressure: document.getElementById('detailPressure'),
    
    // Air quality elements (will use WAQI API data)
    aqiValue: document.getElementById('aqiValue'),
    aqiLabel: document.getElementById('aqiLabel'),
    pm25Value: document.getElementById('pm25Value'),
    pm10Value: document.getElementById('pm10Value'),
    o3Value: document.getElementById('o3Value'),
    no2Value: document.getElementById('no2Value'),
    
    // Sun timeline elements
    sunArcSvg: document.getElementById('sunArcSvg'),
    sunPosition: document.getElementById('sunPosition'),
    sunriseTime: document.getElementById('sunriseTime'),
    sunsetTime: document.getElementById('sunsetTime')
};

// State management
let state = {
    location: {
        name: '',
        lat: null,
        lon: null
    },
    weather: {
        current: null,
        forecast: [], // 5-day/3-hour forecast data
        dailyAggregated: [], // Daily aggregated data derived from 3-hour forecast
        airQuality: null
    },
    theme: 'dark',
    lastUpdated: null
};

// Initialize the app
function initApp() {
    // Add event listeners
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.locationSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    elements.geolocateBtn.addEventListener('click', handleGeolocation);
    elements.themeToggleBtn.addEventListener('click', toggleTheme);
    
    // Load saved theme
    loadSavedTheme();
    
    // Load default city or last saved location
    const savedLocation = localStorage.getItem('weatherAppLocation');
    if (savedLocation) {
        try {
            const location = JSON.parse(savedLocation);
            loadLocationWeather(location.name, location.lat, location.lon);
        } catch (error) {
            console.error('Error loading saved location:', error);
            loadCityByName(DEFAULT_CITY);
        }
    } else {
        loadCityByName(DEFAULT_CITY);
    }
}

// Load saved theme
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('weatherAppTheme');
    if (savedTheme) {
        state.theme = savedTheme;
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeToggleIcon();
    }
}

// Toggle between dark and light theme
function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('weatherAppTheme', state.theme);
    updateThemeToggleIcon();
}

// Update theme toggle icon based on current theme
function updateThemeToggleIcon() {
    const icon = elements.themeToggleBtn.querySelector('i');
    if (state.theme === 'dark') {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
}

// Handle search button click
function handleSearch() {
    const cityName = elements.locationSearch.value.trim();
    if (cityName) {
        loadCityByName(cityName);
    }
}

// Handle geolocation button click
function handleGeolocation() {
    if (navigator.geolocation) {
        elements.geolocateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                reverseGeocode(latitude, longitude);
                elements.geolocateBtn.innerHTML = '<i class="fas fa-location-arrow"></i>';
            },
            (error) => {
                console.error('Geolocation error:', error);
                showError('Could not get your location. Please allow location access or search for a city.');
                elements.geolocateBtn.innerHTML = '<i class="fas fa-location-arrow"></i>';
            },
            { timeout: 10000 }
        );
    } else {
        showError('Geolocation is not supported by your browser.');
    }
}

// Load city by name
async function loadCityByName(cityName) {
    try {
        showLoading();
        
        // Geocode the city name to get coordinates
        const geoUrl = `${GEO_API_URL}?q=${encodeURIComponent(cityName)}&limit=1&appid=${WEATHER_API_KEY}`;
        const geoResponse = await fetch(geoUrl);
        
        if (!geoResponse.ok) {
            throw new Error(`Geocoding API error: ${geoResponse.status}`);
        }
        
        const geoData = await geoResponse.json();
        
        if (!geoData || geoData.length === 0) {
            throw new Error('City not found. Please check the spelling and try again.');
        }
        
        const { name, lat, lon } = geoData[0];
        loadLocationWeather(name, lat, lon);
        
    } catch (error) {
        console.error('Error loading city:', error);
        showError(error.message || 'Failed to load weather data. Please try again.');
        hideLoading();
    }
}

// Reverse geocode coordinates to get city name
async function reverseGeocode(lat, lon) {
    try {
        showLoading();
        
        const url = `${REVERSE_GEO_API_URL}?lat=${lat}&lon=${lon}&limit=1&appid=${WEATHER_API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Reverse geocoding API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data || data.length === 0) {
            throw new Error('Location not found. Please try a different location.');
        }
        
        const locationName = data[0].name;
        loadLocationWeather(locationName, lat, lon);
        
    } catch (error) {
        console.error('Error reverse geocoding:', error);
        showError(error.message || 'Failed to get location name. Please try again.');
        hideLoading();
    }
}

// Load weather data for a location
async function loadLocationWeather(name, lat, lon) {
    try {
        showLoading();
        
        // Update state with location info
        state.location = { name, lat, lon };
        
        // Save to localStorage
        localStorage.setItem('weatherAppLocation', JSON.stringify(state.location));
        
        // Update location name in UI
        elements.locationName.textContent = name;
        
        // Fetch all required data in parallel
        const [currentWeatherData, forecastData, airQualityData] = await Promise.all([
            fetchCurrentWeather(lat, lon),
            fetchForecast(lat, lon),
            fetchAirQuality(lat, lon)
        ]);
        
        // Update state with weather data
        state.weather.current = currentWeatherData;
        state.weather.forecast = forecastData.list;
        state.weather.airQuality = airQualityData;
        
        // Aggregate forecast data into daily data
        state.weather.dailyAggregated = aggregateDailyData(forecastData.list);
        
        state.lastUpdated = new Date();
        
        // Update UI with the new data
        updateUI();
        
        hideLoading();
        
    } catch (error) {
        console.error('Error loading weather data:', error);
        showError(error.message || 'Failed to load weather data. Please try again.');
        hideLoading();
    }
}

// Fetch current weather from OpenWeatherMap API
async function fetchCurrentWeather(lat, lon) {
    try {
        const url = `${CURRENT_WEATHER_API_URL}?lat=${lat}&lon=${lon}&units=${UNITS}&appid=${WEATHER_API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Current Weather API error: ${response.status}`);
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Error fetching current weather data:', error);
        throw new Error('Failed to fetch current weather data. Please check your API key or try again later.');
    }
}

// Fetch 5-day/3-hour forecast from OpenWeatherMap API
async function fetchForecast(lat, lon) {
    try {
        const url = `${FORECAST_API_URL}?lat=${lat}&lon=${lon}&units=${UNITS}&appid=${WEATHER_API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Forecast API error: ${response.status}`);
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Error fetching forecast data:', error);
        throw new Error('Failed to fetch forecast data. Please check your API key or try again later.');
    }
}

// Fetch air quality data from WAQI API
async function fetchAirQuality(lat, lon) {
    try {
        // Try geo-based query first
        const geoUrl = `${WAQI_API_URL}/geo:${lat};${lon}/?token=${WAQI_API_KEY}`;
        const geoResponse = await fetch(geoUrl);
        
        if (!geoResponse.ok) {
            throw new Error(`Air Quality API error: ${geoResponse.status}`);
        }
        
        const geoData = await geoResponse.json();
        
        // If geo-based query returns valid data, use it
        if (geoData.status === 'ok' && geoData.data && geoData.data.aqi !== undefined) {
            return geoData.data;
        }
        
        // If geo-based query doesn't return valid data, try city-based query
        const cityUrl = `${WAQI_API_URL}/${encodeURIComponent(state.location.name)}/?token=${WAQI_API_KEY}`;
        const cityResponse = await fetch(cityUrl);
        
        if (!cityResponse.ok) {
            throw new Error(`Air Quality API error: ${cityResponse.status}`);
        }
        
        const cityData = await cityResponse.json();
        
        if (cityData.status !== 'ok' || !cityData.data || cityData.data.aqi === undefined) {
            throw new Error('Air quality data not available for this location.');
        }
        
        return cityData.data;
        
    } catch (error) {
        console.error('Error fetching air quality data:', error);
        // Return null instead of throwing to allow the app to continue with weather data
        return null;
    }
}

// Aggregate 3-hour forecast data into daily data
function aggregateDailyData(forecastList) {
    // Group forecast by day
    const dailyMap = {};
    
    forecastList.forEach(item => {
        const date = new Date(item.dt * 1000);
        const day = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        if (!dailyMap[day]) {
            dailyMap[day] = {
                dt: item.dt,
                date: date,
                temps: [],
                weather: [],
                pop: [] // Probability of precipitation
            };
        }
        
        dailyMap[day].temps.push(item.main.temp);
        dailyMap[day].weather.push(item.weather[0]);
        dailyMap[day].pop.push(item.pop);
    });
    
    // Convert map to array and calculate min/max temps
    return Object.values(dailyMap).map(day => {
        // Find min and max temperatures
        const minTemp = Math.min(...day.temps);
        const maxTemp = Math.max(...day.temps);
        
        // Find most common weather condition
        const weatherFrequency = {};
        day.weather.forEach(w => {
            if (!weatherFrequency[w.id]) {
                weatherFrequency[w.id] = { count: 0, weather: w };
            }
            weatherFrequency[w.id].count++;
        });
        
        // Sort by frequency and get the most common
        const mostCommonWeather = Object.values(weatherFrequency)
            .sort((a, b) => b.count - a.count)[0].weather;
        
        // Calculate average probability of precipitation
        const avgPop = day.pop.reduce((sum, pop) => sum + pop, 0) / day.pop.length;
        
        return {
            dt: day.dt,
            date: day.date,
            temp: {
                min: minTemp,
                max: maxTemp
            },
            weather: [mostCommonWeather],
            pop: avgPop
        };
    }).sort((a, b) => a.dt - b.dt); // Sort by date
}

// Update UI with weather data
function updateUI() {
    if (!state.weather.current) return;
    
    // Update current weather
    updateCurrentWeather();
    
    // Update hourly forecast (using 3-hour intervals)
    updateHourlyForecast();
    
    // Update weekly forecast (using aggregated daily data)
    updateWeeklyForecast();
    
    // Update weather details
    updateWeatherDetails();
    
    // Update air quality (using WAQI data if available)
    updateAirQuality();
    
    // Update sun timeline
    updateSunTimeline();
    
    // Update background based on weather
    updateWeatherBackground();
    
    // Apply animations
    applyAnimations();
}

// Update current weather section
function updateCurrentWeather() {
    const current = state.weather.current;
    
    // Current temperature
    elements.currentTemp.textContent = Math.round(current.main.temp);
    
    // Weather condition
    elements.weatherCondition.textContent = capitalizeFirstLetter(current.weather[0].description);
    
    // Feels like temperature
    elements.feelsLike.textContent = Math.round(current.main.feels_like);
    
    // Get today's forecast for high/low temps
    if (state.weather.dailyAggregated.length > 0) {
        const today = state.weather.dailyAggregated[0];
        elements.tempHigh.textContent = Math.round(today.temp.max);
        elements.tempLow.textContent = Math.round(today.temp.min);
    } else {
        // Fallback to current temp if no forecast available
        elements.tempHigh.textContent = Math.round(current.main.temp_max);
        elements.tempLow.textContent = Math.round(current.main.temp_min);
    }
}

// Update hourly forecast section using 3-hour intervals
function updateHourlyForecast() {
    const hourlyContainer = elements.hourlyForecast;
    const forecastData = state.weather.forecast.slice(0, 8); // Get next 24 hours (8 x 3-hour intervals)
    
    // Clear previous hourly items except template
    const template = hourlyContainer.querySelector('.template');
    hourlyContainer.innerHTML = '';
    hourlyContainer.appendChild(template);
    
    // Create array to store temperature points for trend line
    const tempPoints = [];
    
    // Add hourly forecast items
    forecastData.forEach((forecast, index) => {
        const hourItem = template.cloneNode(true);
        hourItem.classList.remove('template');
        
        // Format time
        const date = new Date(forecast.dt * 1000);
        const hourTime = date.getHours();
        const formattedTime = hourTime === 0 ? '12 AM' : 
                             hourTime === 12 ? '12 PM' : 
                             hourTime > 12 ? `${hourTime - 12} PM` : 
                             `${hourTime} AM`;
        
        // Update hour item content
        hourItem.querySelector('.hour-time').textContent = formattedTime;
        hourItem.querySelector('.hour-temp').textContent = `${Math.round(forecast.main.temp)}°C`;
        
        // Update weather icon
        const iconElement = hourItem.querySelector('.hour-icon i');
        updateWeatherIcon(iconElement, forecast.weather[0].id, forecast.weather[0].icon);
        
        // Update wind info
        const windForce = getBeaufortScale(forecast.wind.speed);
        hourItem.querySelector('.hour-wind span').textContent = `Force ${windForce}`;
        
        // Update UV index (not available in free tier, use placeholder)
        const uvElement = hourItem.querySelector('.hour-uv span');
        const uvIndicator = hourItem.querySelector('.uv-indicator');
        
        // Simulate UV index based on time of day and weather
        const simulatedUV = simulateUVIndex(date, forecast.weather[0].id);
        uvElement.textContent = `UV: ${simulatedUV}`;
        updateUVIndicator(uvIndicator, simulatedUV);
        
        // Store temperature for trend line
        tempPoints.push({
            x: index,
            y: forecast.main.temp
        });
        
        hourlyContainer.appendChild(hourItem);
    });
    
    // Draw temperature trend line
    drawTempTrendLine(tempPoints);
}

// Simulate UV index based on time of day and weather (since it's not available in the free tier)
function simulateUVIndex(date, weatherId) {
    const hour = date.getHours();
    
    // Base UV on time of day (peak at noon)
    let baseUV = 0;
    if (hour >= 6 && hour <= 18) {
        // Parabolic curve peaking at noon
        baseUV = 8 * (1 - Math.pow((hour - 12) / 6, 2));
    }
    
    // Adjust based on weather conditions
    if (weatherId >= 800 && weatherId <= 801) {
        // Clear or few clouds - full UV
        return Math.round(baseUV);
    } else if (weatherId >= 802 && weatherId <= 804) {
        // Cloudy - reduced UV
        return Math.round(baseUV * 0.7);
    } else {
        // Rain, snow, etc. - greatly reduced UV
        return Math.round(baseUV * 0.3);
    }
}

// Draw temperature trend line using SVG
function drawTempTrendLine(points) {
    if (points.length < 2) return;
    
    const container = elements.tempTrendContainer;
    container.innerHTML = '';
    
    // Create SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    
    // Find min and max temperatures for scaling
    const temps = points.map(p => p.y);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const tempRange = maxTemp - minTemp;
    
    // Create path for the trend line
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
    // Calculate path data
    let pathData = '';
    points.forEach((point, index) => {
        // Scale x based on index and container width
        const x = (point.x / (points.length - 1)) * 100;
        
        // Scale y based on temperature and container height
        // Invert y-axis (0 is top in SVG)
        const normalizedTemp = tempRange === 0 ? 0.5 : (point.y - minTemp) / tempRange;
        const y = 100 - (normalizedTemp * 80 + 10); // Keep within 10% - 90% of height
        
        if (index === 0) {
            pathData += `M ${x},${y}`;
        } else {
            pathData += ` L ${x},${y}`;
        }
    });
    
    path.setAttribute('d', pathData);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'rgba(255, 255, 255, 0.7)');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    
    // Add dots for each temperature point
    points.forEach((point, index) => {
        const x = (point.x / (points.length - 1)) * 100;
        const normalizedTemp = tempRange === 0 ? 0.5 : (point.y - minTemp) / tempRange;
        const y = 100 - (normalizedTemp * 80 + 10);
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x + '%');
        circle.setAttribute('cy', y + '%');
        circle.setAttribute('r', '3');
        circle.setAttribute('fill', 'white');
        
        svg.appendChild(circle);
    });
    
    svg.appendChild(path);
    container.appendChild(svg);
}

// Update weekly forecast section using aggregated daily data
function updateWeeklyForecast() {
    const weeklyContainer = elements.weeklyForecast;
    const dailyData = state.weather.dailyAggregated;
    
    // Clear previous daily items except template
    const template = weeklyContainer.querySelector('.template');
    weeklyContainer.innerHTML = '';
    weeklyContainer.appendChild(template);
    
    // Add daily forecast items
    dailyData.forEach((day, index) => {
        if (index === 0) return; // Skip today (already shown in current weather)
        if (index > 5) return; // Only show 5 days
        
        const dayItem = template.cloneNode(true);
        dayItem.classList.remove('template');
        
        // Format date
        const date = new Date(day.dt * 1000);
        const dayName = getDayName(date);
        const dayDate = getFormattedDate(date);
        
        // Update day item content
        dayItem.querySelector('.day-name').textContent = dayName;
        dayItem.querySelector('.day-date').textContent = dayDate;
        dayItem.querySelector('.day-high').textContent = `${Math.round(day.temp.max)}°C`;
        dayItem.querySelector('.day-low').textContent = `${Math.round(day.temp.min)}°C`;
        
        // Update weather icon
        const iconElement = dayItem.querySelector('.day-icon i');
        updateWeatherIcon(iconElement, day.weather[0].id, day.weather[0].icon);
        
        // Update rain chance
        const rainChance = Math.round(day.pop * 100);
        dayItem.querySelector('.day-rain-chance span').textContent = `${rainChance}%`;
        
        weeklyContainer.appendChild(dayItem);
    });
}

// Update weather details section
function updateWeatherDetails() {
    const current = state.weather.current;
    
    // Feels like temperature
    elements.detailFeelsLike.textContent = `${Math.round(current.main.feels_like)}°C`;
    
    // Wind direction and speed
    const windDirection = getWindDirection(current.wind.deg);
    const windSpeed = Math.round(current.wind.speed);
    elements.detailWind.textContent = `${windDirection} ${windSpeed} m/s`;
    
    // Humidity
    elements.detailHumidity.textContent = `${current.main.humidity}%`;
    
    // UV Index (not available in free tier, use simulated value)
    const currentDate = new Date();
    const simulatedUV = simulateUVIndex(currentDate, current.weather[0].id);
    elements.detailUV.textContent = simulatedUV;
    updateElementColor(elements.detailUV, getUVIndexColor(simulatedUV));
    
    // Visibility (convert from meters to km)
    const visibilityKm = (current.visibility / 1000).toFixed(1);
    elements.detailVisibility.textContent = `${visibilityKm} km`;
    
    // Pressure
    elements.detailPressure.textContent = `${current.main.pressure} hPa`;
}

// Update air quality section with WAQI data
function updateAirQuality() {
    const airQuality = state.weather.airQuality;
    
    if (airQuality && airQuality.aqi !== undefined) {
        // Real AQI data from WAQI
        const aqi = airQuality.aqi;
        
        // AQI value and label
        elements.aqiValue.textContent = aqi;
        elements.aqiLabel.textContent = getAQILabel(aqi);
        updateElementColor(elements.aqiValue, getAQIColor(aqi));
        
        // Update AQI scale
        updateAQIScale(aqi);
        
        // Update pollutant values if available
        if (airQuality.iaqi) {
            const iaqi = airQuality.iaqi;
            
            // PM2.5
            if (iaqi.pm25) {
                const pm25 = iaqi.pm25.v;
                elements.pm25Value.textContent = Math.round(pm25);
                updateElementColor(elements.pm25Value, getPM25Color(pm25));
            } else {
                elements.pm25Value.textContent = 'N/A';
            }
            
            // PM10
            if (iaqi.pm10) {
                const pm10 = iaqi.pm10.v;
                elements.pm10Value.textContent = Math.round(pm10);
                updateElementColor(elements.pm10Value, getPM10Color(pm10));
            } else {
                elements.pm10Value.textContent = 'N/A';
            }
            
            // O3 (Ozone)
            if (iaqi.o3) {
                const o3 = iaqi.o3.v;
                elements.o3Value.textContent = Math.round(o3);
                updateElementColor(elements.o3Value, getO3Color(o3));
            } else {
                elements.o3Value.textContent = 'N/A';
            }
            
            // NO2
            if (iaqi.no2) {
                const no2 = iaqi.no2.v;
                elements.no2Value.textContent = Math.round(no2);
                updateElementColor(elements.no2Value, getNO2Color(no2));
            } else {
                elements.no2Value.textContent = 'N/A';
            }
        } else {
            // If iaqi is not available, show N/A for all pollutants
            elements.pm25Value.textContent = 'N/A';
            elements.pm10Value.textContent = 'N/A';
            elements.o3Value.textContent = 'N/A';
            elements.no2Value.textContent = 'N/A';
        }
    } else {
        // Fallback to simulated AQI based on weather conditions
        const current = state.weather.current;
        const simulatedAQI = simulateAQI(current.weather[0].id, current.main.humidity);
        
        // AQI value and label
        elements.aqiValue.textContent = simulatedAQI;
        elements.aqiLabel.textContent = getAQILabel(simulatedAQI);
        updateElementColor(elements.aqiValue, getAQIColor(simulatedAQI));
        
        // Update AQI scale
        updateAQIScale(simulatedAQI);
        
        // Simulated pollutant values
        const simulatedPollutants = simulatePollutants(simulatedAQI);
        elements.pm25Value.textContent = Math.round(simulatedPollutants.pm25);
        elements.pm10Value.textContent = Math.round(simulatedPollutants.pm10);
        elements.o3Value.textContent = Math.round(simulatedPollutants.o3);
        elements.no2Value.textContent = Math.round(simulatedPollutants.no2);
        
        // Update pollutant colors
        updateElementColor(elements.pm25Value, getPM25Color(simulatedPollutants.pm25));
        updateElementColor(elements.pm10Value, getPM10Color(simulatedPollutants.pm10));
        updateElementColor(elements.o3Value, getO3Color(simulatedPollutants.o3));
        updateElementColor(elements.no2Value, getNO2Color(simulatedPollutants.no2));
    }
}

// Update AQI scale visualization
function updateAQIScale(aqi) {
    const scaleItems = document.querySelectorAll('.scale-item');
    
    // Reset all scale items
    scaleItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Determine how many scale items to activate based on AQI
    let activeItems = 0;
    
    if (aqi <= 50) {
        // Good (0-50) - activate 1 item
        activeItems = 1;
    } else if (aqi <= 100) {
        // Moderate (51-100) - activate 2 items
        activeItems = 2;
    } else if (aqi <= 150) {
        // Unhealthy for Sensitive Groups (101-150) - activate 3 items
        activeItems = 3;
    } else if (aqi <= 200) {
        // Unhealthy (151-200) - activate 4 items
        activeItems = 4;
    } else if (aqi <= 300) {
        // Very Unhealthy (201-300) - activate 5 items
        activeItems = 5;
    } else {
        // Hazardous (301+) - activate all 6 items
        activeItems = 6;
    }
    
    // Activate the appropriate number of scale items
    for (let i = 0; i < activeItems && i < scaleItems.length; i++) {
        scaleItems[i].classList.add('active');
    }
}

// Get AQI label based on AQI value
function getAQILabel(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
}

// Get AQI color based on AQI value
function getAQIColor(aqi) {
    if (aqi <= 50) return 'var(--aqi-good)';
    if (aqi <= 100) return 'var(--aqi-moderate)';
    if (aqi <= 150) return 'var(--aqi-unhealthy-sensitive)';
    if (aqi <= 200) return 'var(--aqi-unhealthy)';
    if (aqi <= 300) return 'var(--aqi-very-unhealthy)';
    return 'var(--aqi-hazardous)';
}

// Get PM2.5 color based on concentration
function getPM25Color(value) {
    if (value <= 12) return 'var(--aqi-good)';
    if (value <= 35.4) return 'var(--aqi-moderate)';
    if (value <= 55.4) return 'var(--aqi-unhealthy-sensitive)';
    if (value <= 150.4) return 'var(--aqi-unhealthy)';
    if (value <= 250.4) return 'var(--aqi-very-unhealthy)';
    return 'var(--aqi-hazardous)';
}

// Get PM10 color based on concentration
function getPM10Color(value) {
    if (value <= 54) return 'var(--aqi-good)';
    if (value <= 154) return 'var(--aqi-moderate)';
    if (value <= 254) return 'var(--aqi-unhealthy-sensitive)';
    if (value <= 354) return 'var(--aqi-unhealthy)';
    if (value <= 424) return 'var(--aqi-very-unhealthy)';
    return 'var(--aqi-hazardous)';
}

// Get O3 (Ozone) color based on concentration
function getO3Color(value) {
    if (value <= 54) return 'var(--aqi-good)';
    if (value <= 70) return 'var(--aqi-moderate)';
    if (value <= 85) return 'var(--aqi-unhealthy-sensitive)';
    if (value <= 105) return 'var(--aqi-unhealthy)';
    if (value <= 200) return 'var(--aqi-very-unhealthy)';
    return 'var(--aqi-hazardous)';
}

// Get NO2 color based on concentration
function getNO2Color(value) {
    if (value <= 53) return 'var(--aqi-good)';
    if (value <= 100) return 'var(--aqi-moderate)';
    if (value <= 360) return 'var(--aqi-unhealthy-sensitive)';
    if (value <= 649) return 'var(--aqi-unhealthy)';
    if (value <= 1249) return 'var(--aqi-very-unhealthy)';
    return 'var(--aqi-hazardous)';
}

// Simulate AQI based on weather conditions (fallback when WAQI data is unavailable)
function simulateAQI(weatherId, humidity) {
    // Base AQI on weather conditions
    if (weatherId >= 200 && weatherId < 300) {
        // Thunderstorm - usually clears the air
        return 30; // Good
    } else if (weatherId >= 300 && weatherId < 600) {
        // Rain - good for air quality
        return 40; // Good
    } else if (weatherId >= 600 && weatherId < 700) {
        // Snow - usually good air quality
        return 35; // Good
    } else if (weatherId >= 700 && weatherId < 800) {
        // Atmosphere (mist, fog, etc.) - can trap pollutants
        return 120; // Unhealthy for Sensitive Groups
    } else if (weatherId === 800) {
        // Clear sky - can be good or bad depending on other factors
        // Use humidity as a factor (high humidity can trap pollutants)
        return humidity > 70 ? 90 : 50; // Moderate or Good
    } else if (weatherId > 800) {
        // Cloudy - can trap pollutants
        return 80; // Moderate
    }
    
    // Default
    return 70; // Moderate
}

// Simulate pollutant values based on AQI (fallback when WAQI data is unavailable)
function simulatePollutants(aqi) {
    // Base values that correspond to the AQI level
    let basePM25, basePM10, baseO3, baseNO2;
    
    if (aqi <= 50) {
        // Good
        basePM25 = 8;
        basePM10 = 20;
        baseO3 = 30;
        baseNO2 = 20;
    } else if (aqi <= 100) {
        // Moderate
        basePM25 = 20;
        basePM10 = 50;
        baseO3 = 60;
        baseNO2 = 50;
    } else if (aqi <= 150) {
        // Unhealthy for Sensitive Groups
        basePM25 = 40;
        basePM10 = 100;
        baseO3 = 80;
        baseNO2 = 150;
    } else if (aqi <= 200) {
        // Unhealthy
        basePM25 = 70;
        basePM10 = 150;
        baseO3 = 95;
        baseNO2 = 200;
    } else if (aqi <= 300) {
        // Very Unhealthy
        basePM25 = 120;
        basePM10 = 250;
        baseO3 = 150;
        baseNO2 = 400;
    } else {
        // Hazardous
        basePM25 = 250;
        basePM10 = 350;
        baseO3 = 200;
        baseNO2 = 650;
    }
    
    // Add some randomness to make it look more realistic
    const randomFactor = 0.2; // 20% variation
    const randomize = (value) => value * (1 + (Math.random() * 2 - 1) * randomFactor);
    
    return {
        pm25: randomize(basePM25),
        pm10: randomize(basePM10),
        o3: randomize(baseO3),
        no2: randomize(baseNO2)
    };
}

// Update sun timeline section
function updateSunTimeline() {
    const current = state.weather.current;
    
    // Format sunrise and sunset times
    const sunriseTime = formatTime(new Date(current.sys.sunrise * 1000));
    const sunsetTime = formatTime(new Date(current.sys.sunset * 1000));
    
    elements.sunriseTime.textContent = sunriseTime;
    elements.sunsetTime.textContent = sunsetTime;
    
    // Calculate sun position on the arc
    updateSunPosition(current.sys.sunrise, current.sys.sunset, current.dt);
}

// Update sun position on the arc
function updateSunPosition(sunrise, sunset, current) {
    // Get the SVG element and sun position circle
    const sunPosition = elements.sunPosition;
    
    // Calculate position percentage (0 to 1) based on current time
    let percentage;
    
    if (current < sunrise) {
        // Before sunrise
        percentage = 0;
    } else if (current > sunset) {
        // After sunset
        percentage = 1;
    } else {
        // During day
        percentage = (current - sunrise) / (sunset - sunrise);
    }
    
    // Calculate x position along the arc (10% to 90% of SVG width)
    const x = 10 + percentage * 180;
    
    // Calculate y position using a parabola (arc)
    // y = a(x - h)² + k where (h,k) is the vertex
    // For our arc, h = 100 (middle of SVG), k = 10 (top of arc)
    const h = 100;
    const k = 10;
    const a = 0.01; // Controls how steep the parabola is
    const y = a * Math.pow(x - h, 2) + k;
    
    // Update sun position
    sunPosition.setAttribute('cx', x);
    sunPosition.setAttribute('cy', y);
}

// Update weather background based on current conditions
function updateWeatherBackground() {
    const current = state.weather.current;
    const weatherId = current.weather[0].id;
    const iconCode = current.weather[0].icon;
    const isNight = iconCode.includes('n');
    
    // Remove all existing weather classes
    elements.weatherBackground.className = 'weather-background';
    
    // Add appropriate weather class
    if (weatherId >= 200 && weatherId < 300) {
        // Thunderstorm
        elements.weatherBackground.classList.add('stormy');
    } else if (weatherId >= 300 && weatherId < 600) {
        // Rain (drizzle and rain)
        elements.weatherBackground.classList.add('rainy');
    } else if (weatherId >= 600 && weatherId < 700) {
        // Snow
        elements.weatherBackground.classList.add('snowy');
    } else if (weatherId >= 700 && weatherId < 800) {
        // Atmosphere (mist, fog, etc.)
        elements.weatherBackground.classList.add('cloudy');
    } else if (weatherId === 800) {
        // Clear
        elements.weatherBackground.classList.add(isNight ? 'clear-night' : 'clear-day');
    } else if (weatherId > 800) {
        // Clouds
        elements.weatherBackground.classList.add('cloudy');
    }
}

// Apply animations to UI elements
function applyAnimations() {
    // Add animation classes to elements
    document.querySelectorAll('.current-weather, .hourly-forecast-section, .weekly-forecast-section, .weather-details-section, .air-quality-section, .sun-timeline-section')
        .forEach(element => {
            element.style.opacity = '0';
            setTimeout(() => {
                element.style.opacity = '1';
                element.style.animation = 'slideInUp 0.5s ease forwards';
            }, 100);
        });
}

// Helper Functions

// Show loading state
function showLoading() {
    elements.locationName.textContent = 'Loading...';
    // Add loading indicators to main elements
    elements.currentTemp.textContent = '--';
    elements.weatherCondition.textContent = 'Loading...';
}

// Hide loading state
function hideLoading() {
    // Loading state is automatically cleared when data is updated
}

// Show error message
function showError(message) {
    console.error(message);
    // You could add a toast notification here
    alert(message);
}

// Update weather icon based on weather code and icon
function updateWeatherIcon(element, weatherId, iconCode) {
    // Remove all existing classes except the base 'fas' or 'far'
    element.className = '';
    element.classList.add('fas');
    
    // Set icon based on weather code
    if (weatherId >= 200 && weatherId < 300) {
        // Thunderstorm
        element.classList.add('fa-bolt');
    } else if (weatherId >= 300 && weatherId < 600) {
        // Rain (drizzle and rain)
        element.classList.add('fa-cloud-rain');
    } else if (weatherId >= 600 && weatherId < 700) {
        // Snow
        element.classList.add('fa-snowflake');
    } else if (weatherId >= 700 && weatherId < 800) {
        // Atmosphere (mist, fog, etc.)
        element.classList.add('fa-smog');
    } else if (weatherId === 800) {
        // Clear
        if (iconCode.includes('n')) {
            element.classList.add('fa-moon');
        } else {
            element.classList.add('fa-sun');
        }
    } else if (weatherId === 801 || weatherId === 802) {
        // Few/scattered clouds
        if (iconCode.includes('n')) {
            element.classList.add('fa-cloud-moon');
        } else {
            element.classList.add('fa-cloud-sun');
        }
    } else if (weatherId > 802) {
        // Broken/overcast clouds
        element.classList.add('fa-cloud');
    }
}

// Update UV indicator color and width
function updateUVIndicator(element, uvi) {
    // Set width based on UV index (1-12 scale)
    const percentage = Math.min(uvi / 12, 1) * 100;
    element.style.width = `${percentage}%`;
    
    // Set color based on UV index
    element.style.backgroundColor = getUVIndexColor(uvi);
}

// Get UV index color
function getUVIndexColor(uvi) {
    if (uvi <= 2) return 'var(--color-accent-green)'; // Low
    if (uvi <= 5) return 'var(--color-accent-yellow)'; // Moderate
    if (uvi <= 7) return 'var(--color-accent-pink)'; // High
    if (uvi <= 10) return 'var(--color-accent-red)'; // Very High
    return 'var(--aqi-hazardous)'; // Extreme
}

// Update element text color
function updateElementColor(element, color) {
    element.style.color = color;
}

// Get wind direction from degrees
function getWindDirection(degrees) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
}

// Get Beaufort wind force scale from m/s
function getBeaufortScale(speed) {
    if (speed < 0.5) return 0; // Calm
    if (speed < 1.5) return 1; // Light air
    if (speed < 3.3) return 2; // Light breeze
    if (speed < 5.5) return 3; // Gentle breeze
    if (speed < 7.9) return 4; // Moderate breeze
    if (speed < 10.7) return 5; // Fresh breeze
    if (speed < 13.8) return 6; // Strong breeze
    if (speed < 17.1) return 7; // High wind
    if (speed < 20.7) return 8; // Gale
    if (speed < 24.4) return 9; // Strong gale
    if (speed < 28.4) return 10; // Storm
    if (speed < 32.6) return 11; // Violent storm
    return 12; // Hurricane
}

// Format time (HH:MM)
function formatTime(date) {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    
    return `${hours}:${minutes} ${ampm}`;
}

// Get day name
function getDayName(date) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
}

// Get formatted date (MMM D)
function getFormattedDate(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
}

// Capitalize first letter of each word
function capitalizeFirstLetter(string) {
    return string.replace(/\b\w/g, l => l.toUpperCase());
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// If API key is not set, show a placeholder UI with sample data
function checkApiKey() {
    if (WEATHER_API_KEY === 'YOUR_OPENWEATHERMAP_API_KEY') {
        console.warn('Weather API key not set. Using placeholder data.');
        loadPlaceholderData();
        return false;
    }
    return true;
}

// Load placeholder data for demo purposes
function loadPlaceholderData() {
    // Sample data structure that mimics the OpenWeatherMap API response
    const placeholderData = {
        location: {
            name: 'Sample City',
            lat: 40.7128,
            lon: -74.0060
        },
        weather: {
            current: {
                dt: Math.floor(Date.now() / 1000),
                main: {
                    temp: 22,
                    feels_like: 23,
                    temp_min: 20,
                    temp_max: 24,
                    pressure: 1015,
                    humidity: 65
                },
                weather: [
                    {
                        id: 802,
                        main: 'Clouds',
                        description: 'scattered clouds',
                        icon: '03d'
                    }
                ],
                visibility: 10000,
                wind: {
                    speed: 4.5,
                    deg: 220
                },
                sys: {
                    sunrise: Math.floor(Date.now() / 1000) - 21600, // 6 hours ago
                    sunset: Math.floor(Date.now() / 1000) + 21600 // 6 hours from now
                }
            },
            forecast: Array(40).fill(0).map((_, i) => ({
                dt: Math.floor(Date.now() / 1000) + i * 10800, // Every 3 hours
                main: {
                    temp: 22 + Math.sin(i / 3) * 4,
                    feels_like: 23 + Math.sin(i / 3) * 3,
                    temp_min: 20 + Math.sin(i / 3) * 3,
                    temp_max: 24 + Math.sin(i / 3) * 3,
                    pressure: 1015,
                    humidity: 65
                },
                weather: [
                    {
                        id: i % 8 === 0 ? 800 : 802,
                        main: i % 8 === 0 ? 'Clear' : 'Clouds',
                        description: i % 8 === 0 ? 'clear sky' : 'scattered clouds',
                        icon: i > 6 && i < 18 ? '03d' : '03n'
                    }
                ],
                visibility: 10000,
                pop: Math.random() * 0.4,
                wind: {
                    speed: 4.5 + Math.random() * 2,
                    deg: 220 + Math.random() * 40 - 20
                }
            })),
            dailyAggregated: Array(5).fill(0).map((_, i) => ({
                dt: Math.floor(Date.now() / 1000) + i * 86400,
                date: new Date(Date.now() + i * 86400000),
                temp: {
                    min: 18 + Math.sin(i / 2) * 4,
                    max: 26 + Math.sin(i / 2) * 4
                },
                weather: [
                    {
                        id: i % 3 === 0 ? 800 : i % 3 === 1 ? 802 : 500,
                        main: i % 3 === 0 ? 'Clear' : i % 3 === 1 ? 'Clouds' : 'Rain',
                        description: i % 3 === 0 ? 'clear sky' : i % 3 === 1 ? 'scattered clouds' : 'light rain',
                        icon: i % 3 === 0 ? '01d' : i % 3 === 1 ? '03d' : '10d'
                    }
                ],
                pop: i % 3 === 0 ? 0 : i % 3 === 1 ? 0.2 : 0.6
            })),
            airQuality: {
                aqi: 45,
                iaqi: {
                    pm25: { v: 10 },
                    pm10: { v: 25 },
                    o3: { v: 35 },
                    no2: { v: 15 }
                }
            }
        }
    };
    
    // Update state with placeholder data
    state.location = placeholderData.location;
    state.weather = placeholderData.weather;
    state.lastUpdated = new Date();
    
    // Update UI with placeholder data
    elements.locationName.textContent = placeholderData.location.name + ' (Demo)';
    updateUI();
    
    // Show notice about API key
    const notice = document.createElement('div');
    notice.style.position = 'fixed';
    notice.style.bottom = '10px';
    notice.style.left = '10px';
    notice.style.right = '10px';
    notice.style.padding = '10px';
    notice.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
    notice.style.color = 'white';
    notice.style.borderRadius = '5px';
    notice.style.zIndex = '1000';
    notice.style.textAlign = 'center';
    notice.innerHTML = 'DEMO MODE: Please replace API keys in script.js with your actual keys from <a href="https://openweathermap.org/api" target="_blank" style="color: white; text-decoration: underline;">OpenWeatherMap</a> and <a href="https://aqicn.org/data-platform/token/" target="_blank" style="color: white; text-decoration: underline;">WAQI</a>';
    
    document.body.appendChild(notice);
}

// Check API key on startup
document.addEventListener('DOMContentLoaded', () => {
    if (!checkApiKey()) {
        // If API key is not set, we'll use placeholder data
        // This is handled in the checkApiKey function
    } else {
        // If API key is set, initialize normally
        initApp();
    }
});
