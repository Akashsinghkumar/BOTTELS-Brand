const db = require('../database/db_client');

// Distance helper
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// AI ETA Prediction API
const predictETA = async (req, res) => {
    try {
        const { startLat, startLng, endLat, endLng, trafficLevel, weatherCondition } = req.body;
        
        if (!startLat || !startLng || !endLat || !endLng) {
            return res.status(400).json({ error: 'Start and end coordinates are required.' });
        }

        const distance = getDistance(startLat, startLng, endLat, endLng);

        // Adjusting multipliers based on inputs
        const trafficMultipliers = { 'Low': 0.8, 'Normal': 1.0, 'High': 1.6, 'Severe Jam': 2.5 };
        const weatherMultipliers = { 'Clear': 1.0, 'Rainy': 1.4, 'Stormy': 2.0, 'Heavy Fog': 1.8 };

        const tMult = trafficMultipliers[trafficLevel] || 1.0;
        const wMult = weatherMultipliers[weatherCondition] || 1.0;
        const basePrepTime = 12; // 12 minutes base prep and packaging

        // ETA regression simulation formula
        const travelSpeedMinutesPerKm = 2.2; // roughly 27km/h average city speed
        const travelTime = distance * travelSpeedMinutesPerKm * tMult * wMult;
        const etaMinutes = Math.round(basePrepTime + travelTime);

        res.json({
            success: true,
            distanceKm: parseFloat(distance.toFixed(2)),
            basePrepTime,
            travelTimeMinutes: parseFloat(travelTime.toFixed(1)),
            trafficMultiplier: tMult,
            weatherMultiplier: wMult,
            predictedETAMinutes: etaMinutes
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// Route Optimization - Waypoints Generator
const getOptimizedRoute = async (req, res) => {
    try {
        const { startLat, startLng, endLat, endLng } = req.body;

        if (!startLat || !startLng || !endLat || !endLng) {
            return res.status(400).json({ error: 'Start and end coordinates are required.' });
        }

        // Generate 8 waypoints to simulate road routes instead of a straight line
        const waypoints = [];
        const steps = 8;
        
        for (let i = 0; i <= steps; i++) {
            const ratio = i / steps;
            // Linear interpolation
            let lat = startLat + (endLat - startLat) * ratio;
            let lng = startLng + (endLng - startLng) * ratio;

            // Add slight random deviations at intermediate steps to resemble street grids
            if (i > 0 && i < steps) {
                const devLat = (Math.random() - 0.5) * 0.003;
                const devLng = (Math.random() - 0.5) * 0.003;
                lat += devLat;
                lng += devLng;
            }

            waypoints.push({ lat, lng });
        }

        res.json({
            success: true,
            waypoints,
            message: 'Optimized route coordinates generated.'
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// Demand Forecasting API
const getDemandForecast = async (req, res) => {
    try {
        const { warehouseId } = req.query;
        const warehouse = await db.warehouses.findById(warehouseId || 'w1');
        if (!warehouse) {
            return res.status(404).json({ error: 'Warehouse not found' });
        }

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayIndex = new Date().getDay();

        // 7-day forecast dataset
        const forecast = [];
        const productIds = ['250ml', '500ml', '600ml', '1L', '20L'];

        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dayName = days[date.getDay()];

            const itemsForecast = {};
            productIds.forEach(pId => {
                const baseDemand = warehouse.inventory[pId] ? Math.round(warehouse.inventory[pId] * 0.15) : 30;
                // Add weekend multiplier for smaller bottles, weekday multiplier for jars
                let dayMultiplier = 1.0;
                if (pId === '20L') { // corporate offices order jars on weekdays
                    dayMultiplier = (dayName === 'Saturday' || dayName === 'Sunday') ? 0.3 : 1.2;
                } else { // event bottles ordered more on weekends
                    dayMultiplier = (dayName === 'Friday' || dayName === 'Saturday') ? 1.4 : 0.9;
                }

                // Trend factor (gradually increasing sales)
                const trend = 1 + (i * 0.02);

                // Add random variance (+/- 10%)
                const variance = 0.9 + Math.random() * 0.2;

                itemsForecast[pId] = Math.round(baseDemand * dayMultiplier * trend * variance);
            });

            forecast.push({
                day: dayName,
                date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                forecastedSales: itemsForecast
            });
        }

        res.json({
            success: true,
            warehouseName: warehouse.name,
            forecast
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

module.exports = {
    predictETA,
    getOptimizedRoute,
    getDemandForecast
};
