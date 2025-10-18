import { getParam } from './utils.mjs';

const category = getParam('category');
fetchTicketmasterEvents(category);

async function fetchTicketmasterEvents(category) {
    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY;
    const baseUrl = 'https://app.ticketmaster.com/discovery/v2/events.json';

    // Map your categories to segment IDs or keywords
    const categoryMap = {
        music: 'KZFzniwnSyZfZ7v7nJ',
        theatre: 'KZFzniwnSyZfZ7v7na',
        sports: 'KZFzniwnSyZfZ7v7nE',
        cinema: '' // Cinema may need to use keyword or genre filter
    };

    let url = `${baseUrl}?apikey=${apiKey}&city=Edinburgh&size=50`; // e.g. size=50 results

    if (category === 'cinema') {
        // Cinema fallback: use keyword search for film or movie titles
        url += '&keyword=film';
    } else if (categoryMap[category]) {
        url += `&segmentId=${categoryMap[category]}`;
    }

    // Optional: add city, locale filters if needed
    // url += '&city=YourCity&locale=en-us'

    const response = await fetch(url);
    const data = await response.json();
    if (data._embedded && data._embedded.events) {
        return data._embedded.events;
    } else {
        return [];
    }
}