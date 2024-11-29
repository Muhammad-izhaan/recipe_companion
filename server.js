const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const Groq = require('groq-sdk');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static('public'));

// Add a route handler for the root path
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Add error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Groq AI setup
const groq = new Groq({ 
    apiKey: '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', 
    dangerouslyAllowBrowser: true 
});

// Expanded Hinglish translation dictionary
const hinglishTranslations = {
    'masala': 'spice mix',
    'chai': 'tea',
    'daal': 'lentils',
    'aloo': 'potato',
    'sabzi': 'vegetable dish',
    'roti': 'bread',
    'paneer': 'cottage cheese',
    'mirchi': 'chili',
    'namak': 'salt',
    'mirch': 'chili',
    'pyaaz': 'onion',
    'tadka': 'tempering',
    'ghee': 'clarified butter',
    'kadai': 'cooking pot',
    'chutney': 'sauce',
    'jeera': 'cumin',
    'haldi': 'turmeric'
};

function translateHinglish(text) {
    let translatedText = text.toLowerCase();
    Object.entries(hinglishTranslations).forEach(([hinglish, english]) => {
        const regex = new RegExp(`\\b${hinglish}\\b`, 'gi');
        translatedText = translatedText.replace(regex, english);
    });
    return translatedText;
}

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('recipe_request', async (data) => {
        try {
            const systemPrompt = `You are an expert chef and recipe guide. Format your response like this:

Description
[Write a brief intro about the dish]

Ingredients
- List each item on new line with dash
- No asterisks or special formatting

Instructions
1. Number each step
2. Keep it simple and clear
3. No special characters

Tips
- Use dashes for tips
- Keep it simple

Important: Never use asterisks (*) or any special formatting. Use plain text only.`;

            const userPrompt = `Create a recipe for ${data.recipe} following these rules:
1. Use simple Hinglish language
2. No asterisks or special characters
3. Use numbers for steps and dashes for lists
4. Keep formatting minimal
5. Include traditional tips if relevant`;

            const completion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                model: "llama3-8b-8192",
                temperature: 0.7,
                max_tokens: 1500,
                top_p: 1,
                stream: false,
            });

            const cleanedMessage = completion.choices[0]?.message?.content
                .replace(/\*/g, '')  // Remove any asterisks
                .replace(/\*\*/g, '') // Remove double asterisks
                .replace(/\s*\n\s*\n\s*\n/g, '\n\n')  // Replace triple line breaks with double
                .replace(/^\s+|\s+$/g, '') // Trim extra spaces
                .replace(/\[|\]/g, ''); // Remove any square brackets

            const translatedMessage = translateHinglish(cleanedMessage);
            
            socket.emit('recipe_response', {
                recipe: translatedMessage
            });
        } catch (error) {
            console.error("API Error:", error);
            socket.emit('recipe_error', { 
                message: "Recipe generate karne mein error. (Error generating recipe)" 
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
