import db from '../database/db_client.js';

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export const predictETA = async (req, res) => {
    try {
        const body = req.body || (req.json ? await req.json() : {});
        const { startLat, startLng, endLat, endLng, trafficLevel, weatherCondition } = body;
        
        if (!startLat || !startLng || !endLat || !endLng) {
            const errObj = { error: 'Start and end coordinates are required.' };
            return res.status ? res.status(400).json(errObj) : Response.json(errObj, { status: 400 });
        }

        const distance = getDistance(startLat, startLng, endLat, endLng);
        const trafficMultipliers = { 'Low': 0.8, 'Normal': 1.0, 'High': 1.6, 'Severe Jam': 2.5 };
        const weatherMultipliers = { 'Clear': 1.0, 'Rainy': 1.4, 'Stormy': 2.0, 'Heavy Fog': 1.8 };

        const tMult = trafficMultipliers[trafficLevel] || 1.0;
        const wMult = weatherMultipliers[weatherCondition] || 1.0;
        const basePrepTime = 12;

        const travelSpeedMinutesPerKm = 2.2;
        const travelTime = distance * travelSpeedMinutesPerKm * tMult * wMult;
        const etaMinutes = Math.round(basePrepTime + travelTime);

        const data = {
            success: true,
            distanceKm: parseFloat(distance.toFixed(2)),
            basePrepTime,
            travelTimeMinutes: parseFloat(travelTime.toFixed(1)),
            trafficMultiplier: tMult,
            weatherMultiplier: wMult,
            predictedETAMinutes: etaMinutes
        };
        return res.json ? res.json(data) : Response.json(data);
    } catch (e) {
        const errObj = { error: e.message };
        return res.status ? res.status(500).json(errObj) : Response.json(errObj, { status: 500 });
    }
};

export const getOptimizedRoute = async (req, res) => {
    try {
        const body = req.body || (req.json ? await req.json() : {});
        const { startLat, startLng, endLat, endLng, steps = 8 } = body;

        if (!startLat || !startLng || !endLat || !endLng) {
            const errObj = { error: 'Coordinates required' };
            return res.status ? res.status(400).json(errObj) : Response.json(errObj, { status: 400 });
        }

        const waypoints = [];
        for (let i = 0; i <= steps; i++) {
            const factor = i / steps;
            let lat = startLat + (endLat - startLat) * factor;
            let lng = startLng + (endLng - startLng) * factor;

            if (i > 0 && i < steps) {
                lat += (Math.random() - 0.5) * 0.003;
                lng += (Math.random() - 0.5) * 0.003;
            }
            waypoints.push({ lat: parseFloat(lat.toFixed(5)), lng: parseFloat(lng.toFixed(5)) });
        }

        const data = {
            success: true,
            start: { lat: startLat, lng: startLng },
            destination: { lat: endLat, lng: endLng },
            waypointsCount: waypoints.length,
            waypoints
        };
        return res.json ? res.json(data) : Response.json(data);
    } catch (e) {
        const errObj = { error: e.message };
        return res.status ? res.status(500).json(errObj) : Response.json(errObj, { status: 500 });
    }
};

export const getDemandForecast = async (req, res) => {
    try {
        const warehouseId = req.params?.warehouseId || req.query?.warehouseId || 'w1';
        const warehouse = await db.warehouses.findById(warehouseId);

        if (!warehouse) {
            const errObj = { error: 'Warehouse not found' };
            return res.status ? res.status(404).json(errObj) : Response.json(errObj, { status: 404 });
        }

        const bottleSizes = ['250ml', '500ml', '600ml', '1L', '20L'];
        const forecast = {};

        bottleSizes.forEach(size => {
            const currentStock = (warehouse.inventory && warehouse.inventory[size]) || 200;
            const dailyBurnRate = Math.round(currentStock * 0.12 + Math.random() * 20);
            const predicted7DayDemand = dailyBurnRate * 7;
            const isReorderNeeded = currentStock < predicted7DayDemand;

            forecast[size] = {
                currentStock,
                estimatedDailyUsage: dailyBurnRate,
                predicted7DayDemand,
                reorderRecommended: isReorderNeeded,
                suggestedReorderQuantity: isReorderNeeded ? Math.max(500, predicted7DayDemand * 2 - currentStock) : 0
            };
        });

        const data = {
            success: true,
            warehouseName: warehouse.name,
            forecast
        };
        return res.json ? res.json(data) : Response.json(data);
    } catch (e) {
        const errObj = { error: e.message };
        return res.status ? res.status(500).json(errObj) : Response.json(errObj, { status: 500 });
    }
};

export default {
    predictETA,
    getOptimizedRoute,
    getDemandForecast
};
