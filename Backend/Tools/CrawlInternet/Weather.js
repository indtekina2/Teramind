// getting api key from .env file
const path = require("path");

require("dotenv").config({
    path: path.resolve("C:/Aniket Important/Projects/Teramind/Backend/.env"),
});
const API_KEY = process.env.OPEN_WEATHER_MAP_API_KEY;

async function getWeather(city) {
    try {
        // Getting coordinates
        let cordResponse = await fetch(
            `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`,
        );
        let cordData = await cordResponse.json();
        // console.log(cordData)

        if (!cordData.length) {
            return {
                error: true,
                msg: "City not found",
            };
        }

        // Getting weather data
        const { lat, lon } = cordData[0];
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}`,
        );
        const data = await response.json();

        return {
            name: data.name,
            description: data.weather?.[0]?.description ?? "unknown",
            temp: data.main.temp,
            feels_like: data.main.feels_like,
            humidity: data.main.humidity,
        };;
    } catch (error) {
        console.error("Error fetching weather:", error);
        return {
            error: true,
            msg: "Failed to fetch weather data",
        };
    }
}

const weatherToolDescription = {
    name: "getWeather",
    description: "Get weather data for a city",
    parameters: {
        type: "object",
        properties: {
            city: {
                type: "string",
                description: "City name",
            },
        },
        required: ["city"],
    }
}

module.exports = {
    getWeather,
    weatherToolDescription
}