import { getLocalStorage, setLocalStorage, getParam } from './utils.mjs';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registration-form');
  const successMessage = document.getElementById('success-message');

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    // Get form data
    const formData = new FormData(form);

    // Create registration object
    const registration = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      timestamp: new Date().toISOString(),
      eventId: getParam('event') || null // Optional: event ID from URL if linked from banner
    };

    // Get existing registrations or initialize empty array
    const registrations = getLocalStorage('ee-registrations') || [];

    // Add new registration
    registrations.push(registration);

    // Save to localStorage
    setLocalStorage('ee-registrations', registrations);

    // Hide form
    form.classList.add('hidden');

    // Show success message with enhanced content
    successMessage.innerHTML = `
      <h2>✅ Registered successfully!</h2>
      <p>Thank you for signing up, ${registration.name}! Good luck in the draw!</p>
      <p>We've saved your details. Check your email for confirmation.</p>
      <div class="success-actions" style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem;">
        <a href="../index.html" class="cta-button" style="text-align: center;">Browse Events</a>
        <a href="../cart/index.html" class="cta-button" style="text-align: center;">View My Cart</a>
        <a href="../my_events/index.html" class="cta-button" style="text-align: center;">My Saved Events</a>
      </div>
    `;

    successMessage.classList.remove('hidden');
  });
});
