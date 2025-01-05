const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// Meta's WhatsApp API Credentials
const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0/536627592863176/messages'; // Replace with your Phone Number ID
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN; // WhatsApp API access token
const VERIFY_TOKEN = process.env.VERIFY_TOKEN; // Token for webhook verification

// OpenAI API Credentials
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // OpenAI API key

// Webhook endpoint for WhatsApp
app.post('/webhook', async (req, res) => {
    try {
        const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

        if (!message) {
            console.log('No message found in the webhook payload.');
            return res.sendStatus(200); // Acknowledge to WhatsApp even if no message
        }

        const senderId = message.from;
        const text = message.text?.body;

        console.log(`Received message: "${text}" from sender ID: ${senderId}`);

        if (!text) {
            console.log('Message does not contain text.');
            return res.sendStatus(200); // Acknowledge the message without further processing
        }

        // Call OpenAI API
        const openaiResponse = await axios.post(
            OPENAI_API_URL,
            {
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: text }]
            },
            {
                headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }
            }
        );

        const chatGptReply = openaiResponse.data.choices?.[0]?.message?.content || 'Sorry, I could not process your request.';

        console.log(`ChatGPT reply: "${chatGptReply}"`);

        // Send reply to WhatsApp
        await axios.post(
            WHATSAPP_API_URL,
            {
                messaging_product: 'whatsapp',
                to: senderId,
                text: { body: chatGptReply }
            },
            {
                headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
            }
        );

        console.log('Reply sent successfully to WhatsApp.');
        res.sendStatus(200); // Acknowledge receipt
    } catch (error) {
        console.error('Error processing webhook:', error.response?.data || error.message);
        res.sendStatus(500); // Internal Server Error
    }
});

// Verification endpoint for WhatsApp
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verified successfully.');
        res.status(200).send(challenge);
    } else {
        console.warn('Webhook verification failed.');
        res.sendStatus(403); // Forbidden
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
