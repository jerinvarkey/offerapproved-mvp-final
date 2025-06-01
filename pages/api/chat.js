import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const userMessage = req.body.message;

  try {
    // Step 1: Call OpenAI to parse the message
    const gptResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are FlightBot, an AI travel concierge for Offer Approved.

When a user enters a request, extract:

- origin_city
- destination_city
- departureDate (YYYY-MM-DD)
- adults (default 1)
- max_budget (optional, number only)

Examples of user messages:

“Find me flights from Houston to Chicago on June 25 under $150”
“Flights from NYC to LA on July 4”
“I need 2 tickets from Dallas to Miami next week”
“Show me flights from Boston to London under $500”

Respond ONLY with valid JSON in this format:

{
  "origin_city": "",
  "destination_city": "",
  "departureDate": "",
  "adults": 1,
  "max_budget": null
}

If any value is missing, set it to null.

Do not include any extra text. Do not include explanations. Respond with JSON ONLY.`
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      temperature: 0
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const parsed = JSON.parse(gptResponse.data.choices[0].message.content);

    // Step 2: Call Amadeus for flight offers
    const authResponse = await axios.post('https://test.api.amadeus.com/v1/security/oauth2/token', new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.AMADEUS_API_KEY,
      client_secret: process.env.AMADEUS_API_SECRET
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const accessToken = authResponse.data.access_token;

    const flightsResponse = await axios.get('https://test.api.amadeus.com/v2/shopping/flight-offers', {
      params: {
        originLocationCode: parsed.origin_city.slice(0, 3).toUpperCase(), // crude, but MVP!
        destinationLocationCode: parsed.destination_city.slice(0, 3).toUpperCase(),
        departureDate: parsed.departureDate,
        adults: parsed.adults,
        maxPrice: parsed.max_budget || undefined
      },
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const firstFlight = flightsResponse.data.data[0];

    const reply = firstFlight
      ? `Here is the first flight I found:\n\n✈️ Airline: ${firstFlight.validatingAirlineCodes[0]}\n🛫 From: ${parsed.origin_city} → To: ${parsed.destination_city}\n📅 Depart: ${parsed.departureDate}\n💵 Price: ${firstFlight.price.total} ${firstFlight.price.currency}`
      : 'No flights found.';

    res.status(200).json({ reply });

  } catch (error) {
    console.error('ERROR:', error.response?.data || error.message);
    res.status(500).json({ reply: 'Sorry, there was an error processing your request.' });
  }
}
