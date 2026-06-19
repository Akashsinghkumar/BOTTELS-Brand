import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LocationProvider, useLocation } from './components/LocationContext';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pre-seeded Addresses for testing
const PRESEEDED_ADDRESSES = [
    { name: 'Connaught Place HQ', mobile: '+919773933985', address: 'Block A, Inner Circle', landmark: 'Near Rajiv Chowk Metro', city: 'Delhi', state: 'Delhi', pincode: '110001', lat: 28.6304, lng: 77.2177 },
    { name: 'Patliputra Office', mobile: '+919773933986', address: 'Road No. 4, Patliputra Colony', landmark: 'Near Post Office', city: 'Patna', state: 'Bihar', pincode: '800013', lat: 25.6210, lng: 85.1130 },
    { name: 'Andheri Commercial Hub', mobile: '+919773933987', address: 'Veera Desai Road', landmark: 'Opposite Courtyard', city: 'Mumbai', state: 'Maharashtra', pincode: '400053', lat: 19.1350, lng: 72.8420 }
];

const PRODUCTS = [
    { id: '250ml', title: '250ml Mini Pack', price: 10, originalPrice: 15, rating: '4.4', desc: 'Perfect for Events & Conferences. 40 bottles per case.', size: '250ml', image: '/images/250ml.svg' },
    { id: '500ml', title: '500ml Standard Premium', price: 20, originalPrice: 30, rating: '4.6', desc: 'Ideal for Restaurants & Cafes. 25 bottles per case.', size: '500ml', image: '/images/500ml.svg' },
    { id: '600ml', title: '600ml Corporate Premium', price: 22, originalPrice: 35, rating: '4.2', desc: 'For Events & Executive Meetings. 20 bottles per case.', size: '600ml', image: '/images/600ml.svg' },
    { id: '1L', title: '1 Litre Fine Dining Pack', price: 25, originalPrice: 40, rating: '4.7', desc: 'For Fine Dining & Hotels. 12 bottles per case.', size: '1L', image: '/images/1L.svg' },
    { id: '20L', title: '20 Litre Corporate Jar', price: 30, originalPrice: 50, rating: '4.5', desc: 'Corporate Offices & Daily Bulk Jars.', size: '20L', image: '/images/20L.svg' }
];

// Canvas GPS Map Component
function GPSMap({ startCoords, endCoords, liveCoords, waypoints, status }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, W, H);

        const points = [startCoords, endCoords, ...(waypoints || [])].filter(Boolean);
        if (points.length < 2) return;

        const lats = points.map(p => p.lat);
        const lngs = points.map(p => p.lng);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        const latSpan = maxLat - minLat || 0.01;
        const lngSpan = maxLng - minLng || 0.01;

        const pad = 35;
        const getX = (lng) => pad + ((lng - minLng) / lngSpan) * (W - 2 * pad);
        const getY = (lat) => H - (pad + ((lat - minLat) / latSpan) * (H - 2 * pad));

        // Grid lines
        ctx.strokeStyle = '#eef2f6';
        ctx.lineWidth = 1;
        for (let i = 50; i < W; i += 50) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
        }
        for (let j = 50; j < H; j += 50) {
            ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(W, j); ctx.stroke();
        }

        // Draw Waypoints Route
        if (waypoints && waypoints.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = '#008ba3';
            ctx.lineWidth = 3;
            ctx.setLineDash([6, 4]);
            ctx.moveTo(getX(waypoints[0].lng), getY(waypoints[0].lat));
            for (let i = 1; i < waypoints.length; i++) {
                ctx.lineTo(getX(waypoints[i].lng), getY(waypoints[i].lat));
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw Warehouse
        const wX = getX(startCoords.lng);
        const wY = getY(startCoords.lat);
        ctx.fillStyle = '#006064';
        ctx.beginPath(); ctx.arc(wX, wY, 8, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(wX, wY, 3, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = '#006064';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('Warehouse', wX - 22, wY - 12);

        // Draw Destination
        const cX = getX(endCoords.lng);
        const cY = getY(endCoords.lat);
        ctx.fillStyle = '#388e3c';
        ctx.beginPath(); ctx.arc(cX, cY, 8, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(cX, cY, 3, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = '#388e3c';
        ctx.fillText('Home Address', cX - 25, cY - 12);

        // Agent Coordinates
        if (liveCoords) {
            const aX = getX(liveCoords.lng);
            const aY = getY(liveCoords.lat);
            ctx.fillStyle = '#fb641b';
            ctx.beginPath(); ctx.arc(aX, aY, 8, 0, 2 * Math.PI); ctx.fill();
            ctx.strokeStyle = 'rgba(251, 100, 27, 0.3)';
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(aX, aY, 13, 0, 2 * Math.PI); ctx.stroke();
            ctx.fillStyle = '#fb641b';
            ctx.fillText('🏍️ Driver', aX - 18, aY - 11);
        }

    }, [startCoords, endCoords, liveCoords, waypoints]);

    return (
        <div style={{ position: 'relative', border: '1px solid #e0e0e0', borderRadius: 4, overflow: 'hidden' }}>
            <canvas ref={canvasRef} width={500} height={240} style={{ width: '100%', display: 'block' }} />
            <div style={{ position: 'absolute', bottom: 8, right: 8, background: '#212121', color: 'white', padding: '3px 6px', borderRadius: 2, fontSize: '0.7rem', fontWeight: 'bold' }}>
                Status: {status}
            </div>
        </div>
    );
}

export default function App() {
    // App Panels: 'user' | 'admin_dashboard'
    const [panelMode, setPanelMode] = useState('user'); 

    // Auth & Users
    const [user, setUser] = useState(null);
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [authForm, setAuthForm] = useState({ username: '', email: '', password: '', phone: '' });
    const [authStep, setAuthStep] = useState('channel'); // channel | otp | complete
    const [authChannel, setAuthChannel] = useState(''); // email or phone
    const [enteredOtp, setEnteredOtp] = useState('');
    const [usePasswordLogin, setUsePasswordLogin] = useState(false);

    // Customer Panels: 'home' | 'cart' | 'checkout' | 'orders' | 'support' | 'track'
    const [custView, setCustView] = useState('home');
    const [cart, setCart] = useState([]);
    const [selectedAddress, setSelectedAddress] = useState(PRESEEDED_ADDRESSES[0]);
    const [useCustomAddr, setUseCustomAddr] = useState(false);
    const [customAddress, setCustomAddress] = useState({ address: '', city: 'Delhi', pincode: '', lat: 28.6304, lng: 77.2177 });
    const [paymentMethod, setPaymentMethod] = useState('UPI');
    const [paymentSuccess, setPaymentSuccess] = useState(true);

    // Active Checkout step
    const [checkoutStep, setCheckoutStep] = useState(1); // 1: Login, 2: Address, 3: Order Summary, 4: Payment

    // Sync database lists
    const [orders, setOrders] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [notificationLogs, setNotificationLogs] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [activeTicket, setActiveTicket] = useState(null);
    const [chatInput, setChatInput] = useState('');
    const [trackingOrder, setTrackingOrder] = useState(null);
    const [activeRouteWaypoints, setActiveRouteWaypoints] = useState([]);

    // Admin dashboard specific tabs: 'overview' | 'warehouses' | 'forecasting' | 'tickets' | 'audit'
    const [adminTab, setAdminTab] = useState('overview');

    // Simulator config
    const [simSpeed, setSimSpeed] = useState(1);
    const [trafficLevel, setTrafficLevel] = useState('Normal');
    const [weatherCondition, setWeatherCondition] = useState('Clear');

    // Check localStorage login session on mount
    useEffect(() => {
        const cached = localStorage.getItem('aquaviora_user');
        if (cached) {
            try {
                setUser(JSON.parse(cached));
            } catch (e) {}
        }
        fetchData();
        const poll = setInterval(fetchData, 4000);
        return () => clearInterval(poll);
    }, []);

    const fetchData = async () => {
        try {
            const resOrders = await fetch('/api/orders');
            const dataOrders = await resOrders.json();
            setOrders(dataOrders || []);

            const resWh = await fetch('/api/inventory/warehouses');
            const dataWh = await resWh.json();
            setWarehouses(dataWh || []);

            const resNotif = await fetch('/api/notifications');
            const dataNotif = await resNotif.json();
            setNotificationLogs(dataNotif || []);

            const resTk = await fetch('/api/support/tickets');
            const dataTk = await resTk.json();
            setTickets(dataTk || []);

            const resAud = await fetch('/api/audit-logs');
            const dataAud = await resAud.json();
            setAuditLogs(dataAud || []);
        } catch (e) {}
    };

    // Auto update accordion checkout step based on auth status
    useEffect(() => {
        if (custView === 'checkout') {
            if (!user) {
                setCheckoutStep(1);
            } else if (checkoutStep === 1) {
                setCheckoutStep(2);
            }
        }
    }, [user, custView]);

    // Handle OTP sending
    const handleSendOtp = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channel: authChannel })
            });
            const data = await res.json();
            if (data.error) {
                toast.error(data.error);
            } else {
                toast.success(data.message || 'OTP sent successfully!');
                setAuthStep('otp');
                setEnteredOtp('');
            }
        } catch (err) {
            toast.error('Error requesting OTP verification code.');
        }
    };

    // Handle OTP verification
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channel: authChannel, otp: enteredOtp })
            });
            const data = await res.json();
            if (data.error) {
                toast.error(data.error);
            } else {
                if (data.exists) {
                    setUser(data.user);
                    localStorage.setItem('aquaviora_user', JSON.stringify(data.user));
                    toast.success(`Welcome back, ${data.user.username}!`);
                    setAuthModalOpen(false);
                    resetAuthStates();
                } else {
                    toast.success('OTP verified. Please complete your registration details.');
                    setAuthStep('complete');
                    setAuthForm({ username: '', email: '', password: '', phone: '' });
                }
            }
        } catch (err) {
            toast.error('Verification failed. Please try again.');
        }
    };

    // Handle profile completion registration
    const handleCompleteRegistration = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/auth/complete-registration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channel: authChannel,
                    username: authForm.username,
                    password: authForm.password
                })
            });
            const data = await res.json();
            if (data.error) {
                toast.error(data.error);
            } else {
                setUser(data.user);
                localStorage.setItem('aquaviora_user', JSON.stringify(data.user));
                toast.success(`Welcome to AQUAVIORA, ${data.user.username}!`);
                setAuthModalOpen(false);
                resetAuthStates();
            }
        } catch (err) {
            toast.error('Registration failed.');
        }
    };

    // Legacy Password Login for seeded roles (admin, manager, agent)
    const handlePasswordLoginSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: authForm.username, password: authForm.password })
            });
            const data = await res.json();
            if (data.error) {
                toast.error(data.error);
            } else {
                setUser(data.user);
                localStorage.setItem('aquaviora_user', JSON.stringify(data.user));
                toast.success(`Welcome back, ${data.user.username}!`);
                setAuthModalOpen(false);
                resetAuthStates();
            }
        } catch (err) {
            toast.error('Server login error.');
        }
    };

    const resetAuthStates = () => {
        setAuthStep('channel');
        setAuthChannel('');
        setEnteredOtp('');
        setUsePasswordLogin(false);
        setAuthForm({ username: '', email: '', password: '', phone: '' });
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('aquaviora_user');
        setPanelMode('user');
        setCustView('home');
        toast.info('Logged out successfully.');
    };

    // Cart operations
    const addToCart = (p) => {
        const copy = [...cart];
        const existing = copy.find(item => item.id === p.id);
        if (existing) {
            existing.quantity += 1;
        } else {
            copy.push({ id: p.id, title: p.title, price: p.price, originalPrice: p.originalPrice, quantity: 1 });
        }
        setCart(copy);
        toast.success(`${p.title} added to cart!`);
    };

    const updateCartQty = (id, delta) => {
        const copy = [...cart];
        const item = copy.find(i => i.id === id);
        if (!item) return;
        item.quantity += delta;
        if (item.quantity <= 0) {
            setCart(copy.filter(i => i.id !== id));
        } else {
            setCart(copy);
        }
    };

    // Total calculations
    const cartTotals = useMemo(() => {
        const price = cart.reduce((sum, item) => sum + item.originalPrice * item.quantity, 0);
        const currentPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const discount = price - currentPrice;
        const delivery = currentPrice > 100 ? 0 : 40;
        const packaging = cart.length > 0 ? 15 : 0;
        const total = currentPrice + delivery + packaging;
        return { price, discount, delivery, packaging, total };
    }, [cart]);

    // Check for landing page redirect triggers (add to cart & go to cart checkout)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const addId = params.get('add_to_cart');
        if (addId) {
            const found = PRODUCTS.find(p => p.id === addId);
            if (found) {
                // Remove parameter to prevent duplicates on refresh
                window.history.replaceState({}, document.title, window.location.pathname);
                addToCart(found);
                setCustView('cart');
            }
        }
    }, []);

    // Checkout submit Order
    const submitOrderForm = async () => {
        if (!user) {
            setCheckoutStep(1);
            setAuthModalOpen(true);
            return;
        }
        const addr = useCustomAddr ? customAddress : selectedAddress;

        const payload = {
            name: user.username,
            phone: authForm.phone || user.phone || '9988776655',
            customerId: user.id,
            items: cart.map(i => ({ productId: i.id, title: i.title, quantity: i.quantity, price: i.price })),
            shippingAddressDetails: {
                address: addr.address,
                landmark: addr.landmark || '',
                city: addr.city,
                state: addr.state || '',
                pincode: addr.pincode,
                lat: addr.lat,
                lng: addr.lng
            },
            paymentMethod,
            paymentSuccess
        };

        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.error) {
                toast.error(data.error);
            } else {
                toast.success('Congratulations! Your order is placed successfully!');
                setCart([]);
                setCustView('orders');
                fetchData();
            }
        } catch (e) {
            toast.error('Failed to submit order request.');
        }
    };

    // Dispatch Warehouse order
    const handleDispatchOrder = async (orderId) => {
        try {
            await fetch(`/api/orders/status/${orderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Processing' })
            });
            toast.success('Order packaging accepted.');
            fetchData();
        } catch (e) {}
    };

    // Driver task allocations
    const handleAssignDriver = async (orderId, driverId) => {
        try {
            await fetch(`/api/delivery/assign/${orderId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentId: driverId })
            });
            toast.success('Delivery driver allocated successfully.');
            fetchData();
        } catch (e) {}
    };

    // Simulation agent movement path loader
    const loadDriverWaypoints = async (start, end) => {
        try {
            const res = await fetch('/api/ai/optimize-route', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startLat: start.lat, startLng: start.lng, endLat: end.lat, endLng: end.lng })
            });
            const data = await res.json();
            if (data.success) {
                setActiveRouteWaypoints(data.waypoints);
                return data.waypoints;
            }
        } catch (e) {}
        return [];
    };

    // Drive GPS coordinate tracker simulator
    const driveAgentGpsSim = async (order) => {
        const wh = warehouses.find(w => w._id === order.warehouseId);
        const start = wh ? { lat: wh.lat, lng: wh.lng } : { lat: 28.6139, lng: 77.2090 };
        const dest = order.shippingAddressDetails;

        const points = await loadDriverWaypoints(start, dest);

        // Mark out for delivery
        await fetch(`/api/orders/status/${order._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'OutForDelivery' })
        });
        fetchData();
        toast.info('Driver set off on delivery route!');

        let idx = 0;
        const timer = setInterval(async () => {
            if (idx >= points.length) {
                clearInterval(timer);
                toast.success('Driver arrived at destination coordinates!');
                fetchData();
                return;
            }
            const pos = points[idx];
            await fetch(`/api/delivery/location/${order._id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat: pos.lat, lng: pos.lng })
            });
            idx++;
        }, 1500 / simSpeed);
    };

    // OTP verification completion
    const handleVerifyOTP = async (orderId, otp) => {
        try {
            const res = await fetch(`/api/orders/verify-otp/${orderId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ otp })
            });
            const data = await res.json();
            if (data.error) {
                toast.error(data.error);
            } else {
                toast.success('OTP Verified. Order Marked Delivered!');
                fetchData();
            }
        } catch (e) {}
    };

    // Chat Tickets
    const loadSupportChat = async () => {
        if (!user) {
            setAuthModalOpen(true);
            return;
        }
        try {
            const res = await fetch('/api/support/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId: user.id, customerName: user.username })
            });
            const data = await res.json();
            if (data.success) {
                setActiveTicket(data.ticket);
                setCustView('support');
            }
        } catch (e) {}
    };

    const sendHelpMessage = async (sender) => {
        if (!chatInput.trim() || !activeTicket) return;
        try {
            const res = await fetch(`/api/support/tickets/${activeTicket._id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sender, text: chatInput })
            });
            const data = await res.json();
            if (data.success) {
                setActiveTicket({ ...activeTicket, messages: data.messages });
                setChatInput('');
                fetchData();
            }
        } catch (e) {}
    };

    // Return order
    const requestReturn = async (orderId) => {
        try {
            await fetch(`/api/orders/return/${orderId}`, { method: 'POST' });
            toast.info('Return requested.');
            fetchData();
        } catch (e) {}
    };

    // SVG Demand forecasting dataset
    const demandForecastData = useMemo(() => {
        return [
            { day: 'Wed', val: 340 },
            { day: 'Thu', val: 390 },
            { day: 'Fri', val: 510 },
            { day: 'Sat', val: 560 },
            { day: 'Sun', val: 490 },
            { day: 'Mon', val: 310 },
            { day: 'Tue', val: 330 }
        ];
    }, []);

    const getWhCoords = (whId) => {
        const wh = warehouses.find(w => w._id === whId);
        return wh ? { lat: wh.lat, lng: wh.lng } : null;
    };

    // If the app is opened at the /dashboard path, show a WhatsApp-only ordering page
    const isDashboardPath = typeof window !== 'undefined' && window.location && window.location.pathname.startsWith('/dashboard');

    const WhatsAppOnly = () => {
        const waNumber = '917739339852';
        const message = `Hello AQUAVIORA Team, I would like to place an order.`;
        const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6fbfc' }}>
                <div style={{ textAlign: 'center', padding: 32, borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.08)', background: 'white', maxWidth: 520 }}>
                    <h1 style={{ marginBottom: 8 }}>Order via WhatsApp</h1>
                    <p style={{ color: '#666', marginBottom: 18 }}>We have disabled the dashboard — please place orders only through WhatsApp.</p>
                    <a href={waUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: '#25D366', color: 'white', padding: '12px 20px', borderRadius: 999, fontWeight: 700, textDecoration: 'none' }}>
                        <i className="fab fa-whatsapp" style={{ marginRight: 10 }}></i> Message on WhatsApp
                    </a>
                    <div style={{ marginTop: 16, color: '#999', fontSize: '0.9rem' }}>Or contact: +91 77393 39852</div>
                </div>
            </div>
        );
    };

    if (isDashboardPath) return <WhatsAppOnly />;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--aq-bg)' }}>
            {/* Header Navbar (Premium AQUAVIORA Brand) */}
            <header className="aq-header">
                <div className="aq-header-container">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {/* Logo */}
                        <div className="aq-logo-box" onClick={() => { setPanelMode('user'); setCustView('home'); }} style={{ cursor: 'pointer' }}>
                            <span className="aq-logo-title">AQUAVIORA</span>
                            <span className="aq-logo-sub">Pure Water. Your Brand.</span>
                        </div>

                        {/* Search Input bar */}
                        <div className="aq-search-bar">
                            <i className="fas fa-search aq-search-icon"></i>
                            <input className="aq-search-input" placeholder="Search for premium water bottles, corporate jars, dispensers..." />
                        </div>
                    </div>

                    {/* Navbar Navs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                        {user ? (
                            <div className="aq-dropdown-wrap">
                                <button className="aq-nav-link" style={{ fontSize: '1rem' }}>
                                    <i className="fas fa-user-circle"></i> {user.username} <i className="fas fa-chevron-down" style={{ fontSize: '0.75rem' }}></i>
                                </button>
                                <div className="aq-dropdown-content">
                                    <button className="aq-dropdown-item" onClick={() => setCustView('orders')}><i className="fas fa-box"></i> My Orders</button>
                                    <button className="aq-dropdown-item" onClick={() => loadSupportChat()}><i className="fas fa-headset"></i> Help Centre</button>
                                    {user.role === 'admin' && (
                                        <button className="aq-dropdown-item" style={{ color: 'var(--aq-secondary)' }} onClick={() => setPanelMode('admin_dashboard')}><i className="fas fa-user-shield"></i> Admin Panel</button>
                                    )}
                                    <button className="aq-dropdown-item" onClick={handleLogout}><i className="fas fa-sign-out-alt"></i> Logout</button>
                                </div>
                            </div>
                        ) : (
                            <button className="aq-login-btn" onClick={() => { resetAuthStates(); setAuthModalOpen(true); }}>Login</button>
                        )}

                        <button className="aq-nav-link" onClick={() => setCustView('cart')}>
                            <i className="fas fa-shopping-cart"></i> Cart 
                            {cart.length > 0 && <span className="badge" style={{ marginLeft: 6, backgroundColor: 'var(--aq-secondary)' }}>{cart.reduce((sum,i)=>sum+i.quantity,0)}</span>}
                        </button>
                    </div>
                </div>
            </header>

            {/* Category bar */}
            {panelMode === 'user' && custView === 'home' && (
                <div className="aq-categories-bar">
                    <div className="aq-categories-container">
                        <div className="aq-cat-item" onClick={() => toast.info('Displaying Mini Bottle category')}><span className="aq-cat-icon">🍼</span><span>250ml Pack</span></div>
                        <div className="aq-cat-item" onClick={() => toast.info('Displaying Standard Bottle category')}><span className="aq-cat-icon">🥤</span><span>500ml Standard</span></div>
                        <div className="aq-cat-item" onClick={() => toast.info('Displaying Premium Bottle category')}><span className="aq-cat-icon">💎</span><span>600ml Executive</span></div>
                        <div className="aq-cat-item" onClick={() => toast.info('Displaying Litre Bottle category')}><span className="aq-cat-icon">🏺</span><span>1 Litre Pack</span></div>
                        <div className="aq-cat-item" onClick={() => toast.info('Displaying Corporate Jars category')}><span className="aq-cat-icon">🪘</span><span>20L Water Jars</span></div>
                    </div>
                </div>
            )}

            {/* USER VIEW PORTAL */}
            {panelMode === 'user' && (
                <div className="aq-container" style={{ marginTop: 16 }}>
                    {/* Home Store Grid */}
                    {custView === 'home' && (
                        <div>
                            {/* Promo Banner Slider */}
                            <div className="aq-banner">
                                <div>
                                    <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 8 }}>AQUAVIORA Express</h1>
                                    <p style={{ fontSize: '1rem', opacity: 0.9 }}>Purified RO+UV 7-stage water delivered in 10 minutes.</p>
                                </div>
                                <span style={{ fontSize: '5rem' }}>🫙</span>
                            </div>

                            {/* Catalog Grid */}
                            <div className="aq-grid-title">
                                <span>Featured Deals</span>
                                <span style={{ fontSize: '0.85rem', color: 'var(--aq-primary)', fontWeight: 700, cursor: 'pointer' }}>VIEW ALL</span>
                            </div>
                            <div className="aq-grid-box">
                                {PRODUCTS.map(p => (
                                    <div key={p.id} className="aq-product-card" onClick={() => addToCart(p)}>
                                        <div className="aq-img-wrap">
                                            {p.image ? <img src={p.image} alt={p.title} style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain' }} /> : '🫙'}
                                        </div>
                                        <div className="aq-prod-title">{p.title}</div>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <span className="aq-rating-badge">{p.rating} ★</span>
                                        </div>
                                        <div className="aq-price-row">
                                            <span className="aq-price-current">₹{p.price}</span>
                                            <span className="aq-price-original">₹{p.originalPrice}</span>
                                            <span className="aq-price-discount">
                                                {Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)}% off
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--aq-muted)', margin: '6px 0 12px' }}>{p.desc}</p>
                                        <button className="aq-btn-orange" style={{ padding: '8px 12px', fontSize: '0.85rem' }} onClick={(e) => { e.stopPropagation(); addToCart(p); }}>
                                            <i className="fas fa-shopping-cart"></i> Add to Cart
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Shopping Cart page */}
                    {custView === 'cart' && (
                        <div className="aq-split-checkout">
                            {/* Cart Items Panel */}
                            <div className="aq-price-details-card" style={{ padding: 0 }}>
                                <h3 style={{ padding: '16px 24px', borderBottom: '1px solid var(--aq-border)' }}>My Cart ({cart.length})</h3>
                                {cart.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '60px 0' }}>Your cart is empty. Add water packs from store.</div>
                                ) : (
                                    <div>
                                        <div style={{ padding: '16px 24px' }}>
                                            {cart.map(item => (
                                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #f1f3f6' }}>
                                                    <div>
                                                        <strong style={{ fontSize: '1.05rem' }}>{item.title}</strong>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0' }}>
                                                            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>₹{item.price}</span>
                                                            <span style={{ textDecoration: 'line-through', color: 'var(--aq-muted)', fontSize: '0.85rem' }}>₹{item.originalPrice}</span>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                        <button className="aq-btn-white" style={{ padding: '2px 8px', width: 'fit-content' }} onClick={() => updateCartQty(item.id, -1)}>-</button>
                                                        <strong>{item.quantity}</strong>
                                                        <button className="aq-btn-white" style={{ padding: '2px 8px', width: 'fit-content' }} onClick={() => updateCartQty(item.id, 1)}>+</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ padding: '16px 24px', background: '#fafafa', textAlign: 'right' }}>
                                            <button className="aq-btn-orange" style={{ width: 220, padding: 12 }} onClick={() => setCustView('checkout')}>PLACE ORDER</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Billing Details panel */}
                            <div className="aq-price-details-card">
                                <h4 className="aq-price-title">Price Details</h4>
                                <div className="aq-price-row">
                                    <span>Price ({cart.reduce((sum,i)=>sum+i.quantity,0)} items)</span>
                                    <span>₹{cartTotals.price}</span>
                                </div>
                                <div className="aq-price-row">
                                    <span>Discount</span>
                                    <span style={{ color: 'var(--aq-green)' }}>- ₹{cartTotals.discount}</span>
                                </div>
                                <div className="aq-price-row">
                                    <span>Secure Packaging Fee</span>
                                    <span>₹{cartTotals.packaging}</span>
                                </div>
                                <div className="aq-price-row">
                                    <span>Delivery Charges</span>
                                    <span style={{ color: 'var(--aq-green)' }}>{cartTotals.delivery === 0 ? 'FREE' : `₹${cartTotals.delivery}`}</span>
                                </div>
                                <div className="aq-price-total-row">
                                    <span>Total Amount</span>
                                    <span>₹{cartTotals.total}</span>
                                </div>
                                <div className="aq-price-savings">
                                    You will save ₹{cartTotals.discount} on this order
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 4-Step Accordion Checkout */}
                    {custView === 'checkout' && (
                        <div className="aq-split-checkout">
                            {/* Accordion List */}
                            <div>
                                {/* Step 1: Login */}
                                <div className="aq-accordion">
                                    <div className={`aq-accordion-header ${checkoutStep === 1 ? 'active' : ''}`}>
                                        <span className="aq-step-num">1</span>
                                        <span className="aq-step-title">Login or Signup</span>
                                    </div>
                                    {checkoutStep === 1 && (
                                        <div className="aq-accordion-body">
                                            {user ? (
                                                <div>
                                                    <p>Logged in as: <strong>{user.username}</strong> ({user.email})</p>
                                                    <button className="aq-btn-orange" style={{ width: 160, marginTop: 10 }} onClick={() => setCheckoutStep(2)}>CONTINUE</button>
                                                </div>
                                            ) : (
                                                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                                    <p style={{ marginBottom: 14 }}>Please sign in to proceed with your order checkouts.</p>
                                                    <button className="aq-btn-orange" style={{ width: 200 }} onClick={() => { resetAuthStates(); setAuthModalOpen(true); }}>Login / Sign Up</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Step 2: Delivery Address */}
                                <div className="aq-accordion">
                                    <div className={`aq-accordion-header ${checkoutStep === 2 ? 'active' : ''}`}>
                                        <span className="aq-step-num">2</span>
                                        <span className="aq-step-title">Delivery Address</span>
                                    </div>
                                    {checkoutStep === 2 && (
                                        <div className="aq-accordion-body">
                                            <div style={{ marginBottom: 14 }}>
                                                <select className="form-input" style={{ width: '100%' }} onChange={(e) => {
                                                    setSelectedAddress(PRESEEDED_ADDRESSES[e.target.value]);
                                                    setUseCustomAddr(false);
                                                }}>
                                                    {PRESEEDED_ADDRESSES.map((a, i) => (
                                                        <option key={i} value={i}>{a.name} - {a.address}, {a.city}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div style={{ marginBottom: 14 }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                                    <input type="checkbox" checked={useCustomAddr} onChange={(e) => setUseCustomAddr(e.target.checked)} />
                                                    Add custom dispatch coordinates (lat/lng)
                                                </label>
                                            </div>

                                            {useCustomAddr && (
                                                <div style={{ border: '1px solid var(--aq-border)', padding: 16, borderRadius: 4, marginBottom: 14 }}>
                                                    <input className="form-input" placeholder="Address Details" value={customAddress.address} onChange={(e) => setCustomAddress({...customAddress, address: e.target.value})} />
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                                        <input className="form-input" placeholder="Pincode" value={customAddress.pincode} onChange={(e) => setCustomAddress({...customAddress, pincode: e.target.value})} />
                                                        <select className="form-input" value={customAddress.city} onChange={(e) => setCustomAddress({...customAddress, city: e.target.value})}>
                                                            <option value="Delhi">Delhi</option>
                                                            <option value="Patna">Patna</option>
                                                            <option value="Mumbai">Mumbai</option>
                                                        </select>
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                                        <input className="form-input" type="number" step="any" placeholder="Latitude" value={customAddress.lat} onChange={(e) => setCustomAddress({...customAddress, lat: parseFloat(e.target.value)})} />
                                                        <input className="form-input" type="number" step="any" placeholder="Longitude" value={customAddress.lng} onChange={(e) => setCustomAddress({...customAddress, lng: parseFloat(e.target.value)})} />
                                                    </div>
                                                </div>
                                            )}

                                            <button className="aq-btn-orange" style={{ width: 160 }} onClick={() => setCheckoutStep(3)}>DELIVER HERE</button>
                                        </div>
                                    )}
                                </div>

                                {/* Step 3: Order Summary */}
                                <div className="aq-accordion">
                                    <div className={`aq-accordion-header ${checkoutStep === 3 ? 'active' : ''}`}>
                                        <span className="aq-step-num">3</span>
                                        <span className="aq-step-title">Order Summary</span>
                                    </div>
                                    {checkoutStep === 3 && (
                                        <div className="aq-accordion-body">
                                            {cart.map(item => (
                                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f3f6' }}>
                                                    <span>{item.title} (x{item.quantity})</span>
                                                    <strong>₹{item.price * item.quantity}</strong>
                                                </div>
                                            ))}
                                            <div style={{ marginTop: 14, textAlign: 'right' }}>
                                                <button className="aq-btn-orange" style={{ width: 160 }} onClick={() => setCheckoutStep(4)}>CONTINUE</button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Step 4: Payment Options */}
                                <div className="aq-accordion">
                                    <div className={`aq-accordion-header ${checkoutStep === 4 ? 'active' : ''}`}>
                                        <span className="aq-step-num">4</span>
                                        <span className="aq-step-title">Payment Options</span>
                                    </div>
                                    {checkoutStep === 4 && (
                                        <div className="aq-accordion-body">
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                                    <input type="radio" name="payOpt" checked={paymentMethod==='UPI'} onChange={()=>setPaymentMethod('UPI')} /> UPI Wallet
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                                    <input type="radio" name="payOpt" checked={paymentMethod==='Card'} onChange={()=>setPaymentMethod('Card')} /> Credit / Debit Card
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                                    <input type="radio" name="payOpt" checked={paymentMethod==='COD'} onChange={()=>setPaymentMethod('COD')} /> Cash on Delivery (COD)
                                                </label>
                                            </div>

                                            {paymentMethod !== 'COD' && (
                                                <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <input type="checkbox" checked={paymentSuccess} onChange={(e) => setPaymentSuccess(e.target.checked)} />
                                                    <span style={{ fontSize: '0.85rem' }}>Simulate payment success gateway</span>
                                                </div>
                                            )}

                                            <button className="aq-btn-orange" style={{ width: 220 }} onClick={submitOrderForm}>CONFIRM & PLACE ORDER</button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Billing Panel */}
                            <div className="aq-price-details-card">
                                <h4 className="aq-price-title">Price Details</h4>
                                <div className="aq-price-row">
                                    <span>Price ({cart.reduce((sum,i)=>sum+i.quantity,0)} items)</span>
                                    <span>₹{cartTotals.price}</span>
                                </div>
                                <div className="aq-price-row">
                                    <span>Discount</span>
                                    <span style={{ color: 'var(--aq-green)' }}>- ₹{cartTotals.discount}</span>
                                </div>
                                <div className="aq-price-row">
                                    <span>Secure Packaging Fee</span>
                                    <span>₹{cartTotals.packaging}</span>
                                </div>
                                <div className="aq-price-row">
                                    <span>Delivery Charges</span>
                                    <span style={{ color: 'var(--aq-green)' }}>{cartTotals.delivery === 0 ? 'FREE' : `₹${cartTotals.delivery}`}</span>
                                </div>
                                <div className="aq-price-total-row">
                                    <span>Total Payable</span>
                                    <span>₹{cartTotals.total}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Orders lists */}
                    {custView === 'orders' && (
                        <div className="aq-price-details-card" style={{ padding: 24 }}>
                            <h2>My Orders History</h2>
                            {orders.filter(o => o.customerId === user?.id).length === 0 ? (
                                <div style={{ padding: '20px 0', textAlign: 'center' }}>No orders placed yet.</div>
                            ) : (
                                <table className="premium-table">
                                    <thead>
                                        <tr>
                                            <th>Invoice</th>
                                            <th>Total</th>
                                            <th>Status</th>
                                            <th>ETA</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.filter(o => o.customerId === user?.id).map(order => (
                                            <tr key={order._id}>
                                                <td><strong>{order.invoiceNumber}</strong></td>
                                                <td>₹{order.total}</td>
                                                <td>
                                                    <span className="badge" style={{ backgroundColor: order.status === 'Delivered' ? 'var(--aq-green)' : 'var(--aq-primary)' }}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td>{order.status === 'Delivered' ? 'Delivered' : `${order.etaMinutes} mins`}</td>
                                                <td style={{ display: 'flex', gap: 8 }}>
                                                    <button className="aq-invoice-btn" onClick={() => { setTrackingOrder(order); setCustView('track'); }}>Track Order</button>
                                                    <a className="aq-invoice-btn" style={{ backgroundColor: '#f1f5f9', color: 'var(--aq-text)', border: '1px solid #ddd' }} href={`/api/orders/invoice/${order.invoiceNumber}`} target="_blank">Invoice</a>
                                                    {order.status === 'Delivered' && (
                                                        <button className="aq-invoice-btn" style={{ backgroundColor: 'var(--danger)' }} onClick={() => requestReturn(order._id)}>Return</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/* Active Order tracking details with GPS */}
                    {custView === 'track' && trackingOrder && (
                        <div className="aq-track-container">
                            <button className="btn btn-outline" style={{ marginBottom: 14 }} onClick={() => setCustView('orders')}>← Back to My Orders</button>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                                <div>
                                    <h3>Tracking Order: {trackingOrder.invoiceNumber}</h3>
                                    <div>Subtotal: ₹{trackingOrder.total}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span className="badge" style={{ fontSize: '1rem', backgroundColor: 'var(--aq-primary)' }}>Status: {trackingOrder.status}</span>
                                    <div style={{ fontWeight: 700, color: 'var(--aq-secondary)', marginTop: 4 }}>ETA: {trackingOrder.etaMinutes} mins</div>
                                </div>
                            </div>

                            {/* Stepper Status tracker */}
                            <div className="stepper" style={{ marginBottom: 24 }}>
                                <div className={`step-node ${['Confirmed', 'Assigned', 'Dispatched', 'OutForDelivery', 'Delivered'].includes(trackingOrder.status) ? 'completed' : ''} ${trackingOrder.status === 'Confirmed' ? 'active' : ''}`}>
                                    <div className="step-circle">1</div>
                                    <div className="step-label">Confirmed</div>
                                </div>
                                <div className={`step-node ${['Assigned', 'Dispatched', 'OutForDelivery', 'Delivered'].includes(trackingOrder.status) ? 'completed' : ''} ${trackingOrder.status === 'Assigned' ? 'active' : ''}`}>
                                    <div className="step-circle">2</div>
                                    <div className="step-label">Assigned</div>
                                </div>
                                <div className={`step-node ${['Dispatched', 'OutForDelivery', 'Delivered'].includes(trackingOrder.status) ? 'completed' : ''} ${trackingOrder.status === 'Dispatched' ? 'active' : ''}`}>
                                    <div className="step-circle">3</div>
                                    <div className="step-label">Dispatched</div>
                                </div>
                                <div className={`step-node ${['OutForDelivery', 'Delivered'].includes(trackingOrder.status) ? 'completed' : ''} ${trackingOrder.status === 'OutForDelivery' ? 'active' : ''}`}>
                                    <div className="step-circle">4</div>
                                    <div className="step-label">Out For Delivery</div>
                                </div>
                                <div className={`step-node ${trackingOrder.status === 'Delivered' ? 'completed active' : ''}`}>
                                    <div className="step-circle">5</div>
                                    <div className="step-label">Delivered</div>
                                </div>
                            </div>

                            {/* OTP Box */}
                            {trackingOrder.otpCode && trackingOrder.status === 'OutForDelivery' && (
                                <div style={{ background: '#ecfdf5', border: '1px solid #388e3c', padding: 12, borderRadius: 4, marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#2e7d32', fontWeight: 600 }}>🔑 Share secure delivery code with agent:</span>
                                    <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#2e7d32', letterSpacing: 2 }}>{trackingOrder.otpCode}</span>
                                </div>
                            )}

                            {/* GPS Canvas */}
                            <GPSMap
                                startCoords={getWhCoords(trackingOrder.warehouseId) || { lat: 28.6139, lng: 77.2090 }}
                                endCoords={trackingOrder.shippingAddressDetails}
                                liveCoords={trackingOrder.liveCoordinates}
                                waypoints={activeRouteWaypoints}
                                status={trackingOrder.status}
                            />
                        </div>
                    )}

                    {/* Support ticket chat */}
                    {custView === 'support' && activeTicket && (
                        <div className="aq-price-details-card">
                            <h3>Help Center Support Chat</h3>
                            <div className="chat-window" style={{ marginTop: 14 }}>
                                <div className="chat-messages">
                                    {activeTicket.messages.map((m, i) => (
                                        <div key={i} className={`chat-bubble ${m.sender}`}>
                                            <strong>{m.sender.toUpperCase()}:</strong>
                                            <div>{m.text}</div>
                                            <div className="chat-time">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="chat-input-bar">
                                    <input className="form-input" style={{ marginBottom: 0 }} placeholder="Ask AI bot or support agent..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key==='Enter' && sendHelpMessage('customer')} />
                                    <button className="btn btn-primary" onClick={() => sendHelpMessage('customer')}>Send</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ADMIN DASHBOARD PORTAL */}
            {panelMode === 'admin_dashboard' && user?.role === 'admin' && (
                <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
                    <div className="tab-nav">
                        <button className={`tab-link ${adminTab === 'overview' ? 'active' : ''}`} onClick={() => setAdminTab('overview')}><i className="fas fa-chart-line"></i> Analytics Overview</button>
                        <button className={`tab-link ${adminTab === 'warehouses' ? 'active' : ''}`} onClick={() => setAdminTab('warehouses')}><i className="fas fa-warehouse"></i> Warehouse & Drivers</button>
                        <button className={`tab-link ${adminTab === 'forecasting' ? 'active' : ''}`} onClick={() => setAdminTab('forecasting')}><i className="fas fa-brain"></i> Demand Forecasting</button>
                        <button className={`tab-link ${adminTab === 'tickets' ? 'active' : ''}`} onClick={() => setAdminTab('tickets')}><i className="fas fa-headset"></i> Customer Tickets</button>
                        <button className={`tab-link ${adminTab === 'audit' ? 'active' : ''}`} onClick={() => setAdminTab('audit')}><i className="fas fa-shield-alt"></i> Security Audit Logs</button>
                        <button className="tab-link" style={{ color: 'var(--aq-primary)', marginLeft: 'auto' }} onClick={() => setPanelMode('user')}><i className="fas fa-arrow-left"></i> Exit Admin Mode</button>
                    </div>

                    <div className="dash-grid">
                        {/* Left Tab Boards */}
                        <div>
                            {adminTab === 'overview' && (
                                <div>
                                    <div className="dash-grid-3" style={{ marginBottom: 16 }}>
                                        <div className="glass-panel" style={{ background: '#ecfdf5', color: '#065f46', margin: 0 }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>PAID SALES REVENUE</div>
                                            <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>₹{orders.filter(o=>o.paymentStatus==='Paid').reduce((sum,o)=>sum+o.total,0)}</div>
                                        </div>
                                        <div className="glass-panel" style={{ background: '#eff6ff', color: '#1e40af', margin: 0 }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>TOTAL SYSTEM ORDERS</div>
                                            <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{orders.length}</div>
                                        </div>
                                        <div className="glass-panel" style={{ background: '#fffbeb', color: '#854d0e', margin: 0 }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>ACTIVE DELIVERIES</div>
                                            <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{orders.filter(o=>['Assigned','OutForDelivery'].includes(o.status)).length}</div>
                                        </div>
                                    </div>

                                    <div className="glass-panel">
                                        <h3>Global Order Dispatch Console</h3>
                                        <table className="premium-table">
                                            <thead>
                                                <tr>
                                                    <th>Invoice</th>
                                                    <th>Buyer</th>
                                                    <th>Total</th>
                                                    <th>Status</th>
                                                    <th>Operations</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {orders.map(order => (
                                                    <tr key={order._id}>
                                                        <td>{order.invoiceNumber}</td>
                                                        <td>{order.name}</td>
                                                        <td>₹{order.total}</td>
                                                        <td><span className="badge" style={{ backgroundColor: 'var(--aq-primary)' }}>{order.status}</span></td>
                                                        <td style={{ display: 'flex', gap: 6 }}>
                                                            {order.status === 'Confirmed' && (
                                                                <button className="aq-invoice-btn" onClick={() => handleDispatchOrder(order._id)}>Dispatch</button>
                                                            )}
                                                            {order.status === 'Processing' && (
                                                                <div style={{ display: 'flex', gap: 6 }}>
                                                                    <button className="aq-invoice-btn" style={{ backgroundColor: 'var(--aq-green)' }} onClick={() => handleAssignDriver(order._id, 'da5')}>Assign Driver</button>
                                                                </div>
                                                            )}
                                                            {order.status === 'Assigned' && (
                                                                <button className="aq-invoice-btn" style={{ backgroundColor: 'var(--aq-secondary)' }} onClick={() => driveAgentGpsSim(order)}>Simulate GPS Drive</button>
                                                            )}
                                                            {order.status === 'OutForDelivery' && (
                                                                <div style={{ display: 'flex', gap: 4 }}>
                                                                    <input id={`otp-admin-${order._id}`} className="form-input" style={{ marginBottom: 0, padding: 6, width: 80 }} placeholder="OTP" />
                                                                    <button className="aq-invoice-btn" onClick={() => handleVerifyOTP(order._id, document.getElementById(`otp-admin-${order._id}`).value)}>Submit OTP</button>
                                                                </div>
                                                            )}
                                                            {order.status === 'ReturnRequested' && (
                                                                <div style={{ display: 'flex', gap: 4 }}>
                                                                    <button className="aq-invoice-btn" onClick={async () => { await fetch(`/api/orders/approve-return/${order._id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approve: true }) }); fetchData(); }}>Approve Return</button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {adminTab === 'warehouses' && (
                                <div className="glass-panel">
                                    <h3>Warehouse Stocks Level Control</h3>
                                    {warehouses.map(wh => (
                                        <div key={wh._id} style={{ borderBottom: '1px solid #eee', paddingBottom: 12, marginBottom: 12 }}>
                                            <strong>{wh.name} ({wh.city})</strong>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 8 }}>
                                                {Object.entries(wh.inventory).map(([pId, qty]) => (
                                                    <div key={pId} style={{ padding: 6, background: '#f8fafc', border: '1px solid #ddd', borderRadius: 4, textAlign: 'center' }}>
                                                        <div style={{ fontSize: '0.75rem' }}>{pId}</div>
                                                        <strong style={{ color: qty < 50 ? 'var(--danger)' : 'var(--aq-text)' }}>{qty}</strong>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {adminTab === 'forecasting' && (
                                <div className="glass-panel">
                                    <h3>AI demand volume forecasting (Next 7 Days)</h3>
                                    <div style={{ background: '#f8fafc', padding: 20, borderRadius: 4, border: '1px solid #e0e0e0', marginTop: 14 }}>
                                        <svg width="450" height="200" viewBox="0 0 450 200" style={{ width: '100%' }}>
                                            <line x1="40" y1="20" x2="420" y2="20" stroke="#cbd5e1" strokeDasharray="4,4" />
                                            <line x1="40" y1="80" x2="420" y2="80" stroke="#cbd5e1" strokeDasharray="4,4" />
                                            <line x1="40" y1="140" x2="420" y2="140" stroke="#cbd5e1" strokeDasharray="4,4" />
                                            <line x1="40" y1="170" x2="420" y2="170" stroke="#94a3b8" strokeWidth="2" />
                                            {demandForecastData.map((d, i) => {
                                                const x = 60 + i * 50;
                                                const h = (d.val / 600) * 150;
                                                const y = 170 - h;
                                                return (
                                                    <g key={i}>
                                                        <rect x={x} y={y} width="24" height={h} rx="2" fill="url(#gradAq)" />
                                                        <text x={x+12} y="185" textAnchor="middle" fill="#64748b" fontSize="9">{d.day}</text>
                                                        <text x={x+12} y={y-4} textAnchor="middle" fill="var(--aq-primary)" fontSize="8" fontWeight="700">{d.val}</text>
                                                    </g>
                                                );
                                            })}
                                            <defs>
                                                <linearGradient id="gradAq" x1="0%" y1="0%" x2="0%" y2="100%">
                                                    <stop offset="0%" stopColor="#00acc1" />
                                                    <stop offset="100%" stopColor="#006064" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                    </div>
                                </div>
                            )}

                            {adminTab === 'tickets' && (
                                <div className="glass-panel">
                                    <h3>Customer Support Ticket Deck</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginTop: 14 }}>
                                        <div>
                                            {tickets.map(t => (
                                                <div key={t._id} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 4, marginBottom: 6, cursor: 'pointer', background: activeTicket?._id === t._id ? '#e2f0fd' : 'white' }} onClick={() => setActiveTicket(t)}>
                                                    <strong>{t.customerName}</strong>
                                                    <div style={{ fontSize: '0.75rem' }}>Status: {t.status}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div>
                                            {activeTicket ? (
                                                <div>
                                                    <div className="chat-window">
                                                        <div className="chat-messages">
                                                            {activeTicket.messages.map((m, i) => (
                                                                <div key={i} className={`chat-bubble ${m.sender === 'customer' ? 'support' : 'customer'}`}>
                                                                    <strong>{m.sender.toUpperCase()}:</strong>
                                                                    <div>{m.text}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="chat-input-bar">
                                                            <input className="form-input" style={{ marginBottom: 0 }} placeholder="Reply customer..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendHelpMessage('support')} />
                                                            <button className="btn btn-primary" onClick={() => sendHelpMessage('support')}>Reply</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ padding: 30, textAlign: 'center', border: '1px dashed #ccc' }}>Select ticket session</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {adminTab === 'audit' && (
                                <div className="glass-panel">
                                    <h3>System Audit Trail Logger</h3>
                                    <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                                        <table className="premium-table" style={{ fontSize: '0.8rem' }}>
                                            <thead>
                                                <tr>
                                                    <th>User</th>
                                                    <th>Action</th>
                                                    <th>Details</th>
                                                    <th>IP</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {auditLogs.map(log => (
                                                    <tr key={log._id}>
                                                        <td>{log.username}</td>
                                                        <td><span style={{ color: 'var(--aq-primary)' }}>{log.action}</span></td>
                                                        <td>{log.details}</td>
                                                        <td>{log.ipAddress}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Simulator Console board */}
                        <div>
                            <div className="glass-panel">
                                <h3>Simulator Engine Deck</h3>
                                <div style={{ borderBottom: '1px solid #ddd', paddingBottom: 10, marginBottom: 10 }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Adjust Delivery Travel Speed</label>
                                    <select className="form-input" onChange={(e) => setSimSpeed(Number(e.target.value))}>
                                        <option value="1">1x (Normal speed)</option>
                                        <option value="3">3x (Testing speed)</option>
                                        <option value="6">6x (Fast simulation)</option>
                                    </select>
                                </div>

                                <h3 style={{ marginTop: 14 }}><i className="fab fa-whatsapp" style={{ color: '#25d366' }}></i> Message Logs Stream</h3>
                                <div className="logs-console" style={{ height: 320 }}>
                                    {notificationLogs.map(log => (
                                        <div key={log._id} className="log-entry">
                                            <span className={`log-tag ${log.type.toLowerCase()}`}>{log.type}</span>
                                            <span style={{ fontSize: '0.7rem' }}>[{new Date(log.timestamp).toLocaleTimeString()} to {log.recipient}]:</span>
                                            <p style={{ margin: '2px 0 0', color: 'white' }}>{log.message}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Split Panel Login/Signup Modal */}
            {authModalOpen && (
                <div className="aq-auth-backdrop">
                    <div className="aq-auth-modal">
                        {/* Close button */}
                        <button style={{ position: 'absolute', right: 14, top: 14, background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#666', zIndex: 10 }} onClick={() => { setAuthModalOpen(false); resetAuthStates(); }}>×</button>
                        
                        {/* Left split side */}
                        <div className="aq-auth-left">
                            <div>
                                <div className="aq-auth-left-title">
                                    {usePasswordLogin 
                                        ? 'Staff Login' 
                                        : authStep === 'channel' 
                                            ? 'Login / Signup' 
                                            : authStep === 'otp' 
                                                ? 'Verify OTP' 
                                                : 'Register'}
                                </div>
                                <div className="aq-auth-left-desc">
                                    {usePasswordLogin 
                                        ? 'Log in using your seeded Username and Password credentials.' 
                                        : authStep === 'channel' 
                                            ? 'Enter your Mobile Number or Gmail address to continue.' 
                                            : authStep === 'otp' 
                                                ? `We have sent a verification code to ${authChannel}.` 
                                                : 'Create a username and password to complete your profile.'}
                                </div>
                            </div>
                            <span style={{ fontSize: '5rem', opacity: 0.15, textAlign: 'center' }}>🫙</span>
                        </div>

                        {/* Right form side */}
                        {usePasswordLogin ? (
                            <form className="aq-auth-right" onSubmit={handlePasswordLoginSubmit}>
                                <div>
                                    <h3 style={{ marginBottom: 20, fontWeight: 700 }}>Legacy Password Login</h3>
                                    
                                    <div className="aq-form-group">
                                        <input className="aq-form-input" required placeholder="Enter Username (e.g. admin, manager, customer)" value={authForm.username} onChange={(e) => setAuthForm({...authForm, username: e.target.value})} />
                                    </div>

                                    <div className="aq-form-group">
                                        <input className="aq-form-input" type="password" required placeholder="Enter Password" value={authForm.password} onChange={(e) => setAuthForm({...authForm, password: e.target.value})} />
                                    </div>
                                </div>

                                <div>
                                    <button type="submit" className="aq-btn-orange" style={{ marginBottom: 12 }}>
                                        Login
                                    </button>
                                    
                                    <button type="button" className="aq-btn-white" onClick={() => setUsePasswordLogin(false)}>
                                        Login with OTP Verification
                                    </button>
                                </div>
                            </form>
                        ) : authStep === 'channel' ? (
                            <form className="aq-auth-right" onSubmit={handleSendOtp}>
                                <div>
                                    <h3 style={{ marginBottom: 20, fontWeight: 700 }}>Welcome to AQUAVIORA</h3>
                                    
                                    <div className="aq-form-group" style={{ marginBottom: 12 }}>
                                        <input className="aq-form-input" required placeholder="Enter Mobile Number or Gmail Address" value={authChannel} onChange={(e) => setAuthChannel(e.target.value)} />
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--aq-muted)', marginBottom: 20 }}>
                                        By continuing, you agree to AQUAVIORA's Terms of Use and Privacy Policy.
                                    </p>
                                </div>

                                <div>
                                    <button type="submit" className="aq-btn-orange" style={{ marginBottom: 12 }}>
                                        Request OTP
                                    </button>
                                    
                                    <button type="button" className="aq-btn-white" onClick={() => { setUsePasswordLogin(true); setAuthForm({ username: '', password: '' }); }}>
                                        Login with Username/Password
                                    </button>
                                </div>
                            </form>
                        ) : authStep === 'otp' ? (
                            <form className="aq-auth-right" onSubmit={handleVerifyOtp}>
                                <div>
                                    <h3 style={{ marginBottom: 20, fontWeight: 700 }}>Enter Verification Code</h3>
                                    
                                    <div className="aq-form-group">
                                        <input className="aq-form-input" required maxLength={6} placeholder="Enter 6-Digit OTP" value={enteredOtp} onChange={(e) => setEnteredOtp(e.target.value)} style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.25rem', fontWeight: 'bold' }} />
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--aq-muted)', marginBottom: 20 }}>
                                        Simulated OTP is printed in the **Message Logs Stream** on the dashboard console.
                                    </p>
                                </div>

                                <div>
                                    <button type="submit" className="aq-btn-orange" style={{ marginBottom: 12 }}>
                                        Verify OTP
                                    </button>
                                    
                                    <button type="button" className="aq-btn-white" onClick={() => setAuthStep('channel')}>
                                        Change Mobile / Email
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <form className="aq-auth-right" onSubmit={handleCompleteRegistration}>
                                <div>
                                    <h3 style={{ marginBottom: 20, fontWeight: 700 }}>Create Profile</h3>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--aq-muted)', marginBottom: 16 }}>
                                        Complete your registration details for **{authChannel}**.
                                    </p>
                                    
                                    <div className="aq-form-group">
                                        <input className="aq-form-input" required placeholder="Choose Username" value={authForm.username} onChange={(e) => setAuthForm({...authForm, username: e.target.value})} />
                                    </div>

                                    <div className="aq-form-group">
                                        <input className="aq-form-input" type="password" required placeholder="Choose Password" value={authForm.password} onChange={(e) => setAuthForm({...authForm, password: e.target.value})} />
                                    </div>
                                </div>

                                <div>
                                    <button type="submit" className="aq-btn-orange" style={{ marginBottom: 12 }}>
                                        Register & Login
                                    </button>
                                    
                                    <button type="button" className="aq-btn-white" onClick={() => { resetAuthStates(); setAuthModalOpen(false); }}>
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            <ToastContainer position="top-right" />
        </div>
    );
}
