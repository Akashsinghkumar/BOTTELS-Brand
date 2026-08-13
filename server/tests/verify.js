import assert from 'assert';
import orderController from '../controllers/order.controller.js';
import aiController from '../controllers/ai.controller.js';
import db from '../database/db_client.js';

const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.body = data;
        return res;
    };
    res.send = (data) => {
        res.body = data;
        return res;
    };
    return res;
};

async function runTests() {
    console.log('--- STARTING PLATFORM TESTS ---');

    console.log('\nRunning Test 1: Bounding-box Warehouse Assignment...');
    const cpCoords = { lat: 28.6304, lng: 77.2177 };
    
    const warehouses = await db.warehouses.find();
    let closestWh = null;
    let minDistance = Infinity;

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

    for (const wh of warehouses) {
        const dist = getDistance(cpCoords.lat, cpCoords.lng, wh.lat, wh.lng);
        if (dist < minDistance) {
            minDistance = dist;
            closestWh = wh;
        }
    }
    
    console.log(`Delhi Coordinates nearest warehouse resolved to: ${closestWh.name} (Distance: ${minDistance.toFixed(2)} km)`);
    assert.strictEqual(closestWh.city, 'Delhi', 'Delhi customer should be routed to Delhi warehouse');
    console.log('✅ Test 1 Passed!');

    console.log('\nRunning Test 2: AI-Powered ETA Multipliers...');
    const reqETA = {
        body: {
            startLat: 28.6210, startLng: 77.2090,
            endLat: 28.6304, endLng: 77.2177,
            trafficLevel: 'High',
            weatherCondition: 'Rainy'
        }
    };
    const resETA = mockRes();
    await aiController.predictETA(reqETA, resETA);
    
    console.log('AI ETA response:', resETA.body);
    assert.strictEqual(resETA.body.success, true);
    assert.ok(resETA.body.predictedETAMinutes > 12, 'ETA should be greater than base prep time');
    console.log('✅ Test 2 Passed!');

    console.log('\nRunning Test 3: Optimized Route Waypoints Generator...');
    const reqRoute = {
        body: {
            startLat: 28.6210, startLng: 77.2090,
            endLat: 28.6304, endLng: 77.2177
        }
    };
    const resRoute = mockRes();
    await aiController.getOptimizedRoute(reqRoute, resRoute);

    console.log(`Generated ${resRoute.body.waypoints.length} route path waypoints.`);
    assert.strictEqual(resRoute.body.success, true);
    assert.strictEqual(resRoute.body.waypoints.length, 9, 'Should return exactly interpolation steps + 1');
    console.log('✅ Test 3 Passed!');

    console.log('\nRunning Test 4: Checkout Stock Checks...');
    const reqOrder = {
        body: {
            name: 'Akash Test',
            phone: '9988776655',
            items: [{ productId: '250ml', title: '250ml Mini', quantity: 99999, price: 10 }],
            shippingAddressDetails: { lat: 28.6304, lng: 77.2177, city: 'Delhi', address: 'CP' },
            paymentMethod: 'COD'
        },
        ip: '127.0.0.1'
    };
    const resOrder = mockRes();
    await orderController.createOrder(reqOrder, resOrder);

    console.log('Order Placement response message:', resOrder.body.error);
    assert.ok(resOrder.body.error.includes('Insufficient stock'), 'Order should be blocked by stock check');
    console.log('✅ Test 4 Passed!');

    console.log('\n--- ALL programmatic verification tests passed successfully! ---');
}

runTests().catch(e => {
    console.error('❌ Test failed with error:', e);
    process.exit(1);
});
