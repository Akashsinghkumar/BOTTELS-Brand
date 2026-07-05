// Main JS for AQUAVIORA landing page

// Function to handle adding a product to cart and redirecting to the React dashboard
function addToCart(productId) {
    window.location.href = `/dashboard?add_to_cart=${productId}`;
}

document.addEventListener('DOMContentLoaded', () => {
    // Redirect navigation links and buttons to the appropriate dashboard pages
    
    // "Shop Now" button in Hero
    const shopNowBtn = document.querySelector('.btn-hero');
    if (shopNowBtn) {
        shopNowBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/dashboard';
        });
    }

    // Nav Shop Products link
    const shopLink = document.querySelector('a[href="#products"]');
    if (shopLink) {
        shopLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/dashboard';
        });
    }

    // User icon in navbar
    const userIcon = document.querySelector('.nav-icons a:nth-child(2)');
    if (userIcon) {
        userIcon.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/dashboard';
        });
    }

    // Cart icon in navbar
    const cartIcon = document.querySelector('.nav-icons a:nth-child(3)');
    if (cartIcon) {
        cartIcon.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/dashboard';
        });
    }

    // Intercept the Order Form to redirect to dashboard with selected bottle size preloaded
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        orderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const size = document.getElementById('orderSize').value;
            window.location.href = `/dashboard?add_to_cart=${size}`;
        });
    }

    // Handle Quick Enquiry Form Submission (Sends AJAX request to backend)
    const enquiryForm = document.getElementById('enquiryForm');
    if (enquiryForm) {
        enquiryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const payload = {
                name: document.getElementById('enqName').value,
                phone: document.getElementById('enqPhone').value,
                type: document.getElementById('enqType').value,
                message: document.getElementById('enqMsg').value
            };

            try {
                // Post to Express backend API
                const res = await fetch('/api/enquiry', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                
                if (data.success) {
                    alert('Thank you! Your enquiry has been received. Our team will contact you shortly.');
                    enquiryForm.reset();
                } else {
                    alert('Error: ' + (data.message || 'Failed to submit enquiry.'));
                }
            } catch (err) {
                console.error('Enquiry Submission Error:', err);
                alert('Connection error. Please try again later.');
            }
        });
    }
});
