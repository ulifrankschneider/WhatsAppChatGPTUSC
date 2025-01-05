const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// Meta's WhatsApp API Credentials
//const WHATSAPP_TOKEN = 'your_meta_whatsapp_api_token'; // Replace with your actual token
const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0/536627592863176/messages'; // Replace with your phone number ID

// OpenAI API Credentials
//const OPENAI_API_KEY = 'your_openai_api_key'; // Replace with your actual key
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';


const openaiApiKey = process.env.OPENAI_API_KEY;
const whatsAppApiKey = process.env.WHATSAPP_TOKEN;
const whatsAppToken = process.env.VERIFY_TOKEN;


// Webhook endpoint for WhatsApp
app.post('/webhook', async (req, res) => {
    try {
        const message = req.body.entry[0].changes[0].value.messages[0];
        const senderId = message.from;
        const text = message.text.body;

        console.log(`Received message: ${text} from ${senderId}`);

        // Call OpenAI API
        const response = await axios.post(
            OPENAI_API_URL,
            {
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: text }]
            },
            {
                headers: { Authorization: `Bearer ${openaiApiKey}` }
            }
        );

        const chatGptReply = response.data.choices[0].message.content;

        // Send reply to WhatsApp
        await axios.post(
            WHATSAPP_API_URL,
            {
                messaging_product: 'whatsapp',
                to: senderId,
                text: { body: chatGptReply }
            },
            {
                headers: { Authorization: `Bearer ${whatsAppApiKey}` }
            }
        );

        res.sendStatus(200); // Acknowledge receipt
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.sendStatus(500);
    }
});

// Verification endpoint for WhatsApp
app.get('/webhook', (req, res) => {
    const whatsAppToken = process.env.VERIFY_TOKEN; // Replace with your chosen verification token

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token === whatsAppToken) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
