import React, { createContext, useContext, useState, useEffect } from 'react';

const WEATHER_URL =
    'https://api.open-meteo.com/v1/forecast?latitude=64.1466&longitude=-21.9426&current=temperature_2m,weather_code,wind_speed_10m';

const POLL_INTERVAL_MS = 600_000; // 10 minutes

const WeatherContext = createContext({ temp: 6, desc: 'weather_rain', wind: 6 });

/**
 * WeatherProvider — fetches Reykjavík weather once every 10 minutes and
 * shares the result via context. This prevents Sidebar and HomePage from
 * each making independent duplicate API calls (M10 fix).
 */
export function WeatherProvider({ children }) {
    const [weather, setWeather] = useState({ temp: 6, desc: 'weather_rain', wind: 6 });

    useEffect(() => {
        const fetchWeather = async () => {
            try {
                const res = await fetch(WEATHER_URL);
                if (!res.ok) return;
                const data = await res.json();
                if (!data?.current) return;

                const temp = Math.round(data.current.temperature_2m);
                const code = data.current.weather_code;
                const wind = Math.round(data.current.wind_speed_10m);

                let desc = 'weather_clear';
                if ([1, 2, 3].includes(code)) desc = 'weather_cloudy';
                else if ([45, 48].includes(code)) desc = 'weather_fog';
                else if ([51, 53, 55].includes(code)) desc = 'weather_drizzle';
                else if ([61, 63, 65, 80, 81, 82].includes(code)) desc = 'weather_rain';
                else if ([71, 73, 75, 85, 86].includes(code)) desc = 'weather_snow';
                else if ([95, 96, 99].includes(code)) desc = 'weather_thunderstorm';

                setWeather({ temp, desc, wind });
            } catch (e) {
                console.error('Weather load error', e);
            }
        };

        fetchWeather();
        const id = setInterval(fetchWeather, POLL_INTERVAL_MS);
        return () => clearInterval(id);
    }, []);

    return (
        <WeatherContext.Provider value={weather}>
            {children}
        </WeatherContext.Provider>
    );
}

/** Hook: consume weather data from the nearest WeatherProvider. */
export function useWeather() {
    return useContext(WeatherContext);
}
