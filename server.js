const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const Groq = require('groq-sdk');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static('public'));

// Groq AI setup with public API key
const groq = new Groq({ 
    apiKey: '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'
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
    'haldi': 'turmeric',
    'jeera': 'cumin',
    'pyaaz': 'onion',
    'adrak': 'ginger',
    'lahsun': 'garlic'
};

// Function to translate Hinglish words to English
function translateHinglish(text) {
    for (const [hinglish, english] of Object.entries(hinglishTranslations)) {
        const regex = new RegExp(`\\b${hinglish}\\b`, 'gi');
        text = text.replace(regex, english);
    }
    return text;
}

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('recipe_request', async (data) => {
        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful cooking assistant that provides recipes in Hinglish (Hindi + English). Keep recipes simple and easy to follow. Include ingredients list and step-by-step instructions. Focus on traditional cooking methods."
                    },
                    {
                        role: "user",
                        content: `Give me a recipe for ${data.recipe}`
                    }
                ],
                model: "llama3-8b-8192",
                temperature: 0.7,
                max_tokens: 1500,
                top_p: 1,
                stream: false,
                stop: null
            });

            let recipe = completion.choices[0]?.message?.content || "Sorry, I couldn't generate a recipe at this time.";
            
            // Clean up the recipe text
            recipe = recipe.replace(/\*/g, '');  // Remove asterisks
            recipe = translateHinglish(recipe);  // Translate Hinglish terms
            
            socket.emit('recipe_response', { recipe });
        } catch (error) {
            console.error('Error:', error);
            socket.emit('recipe_response', { 
                recipe: "Sorry, there was an error generating your recipe. Please try again."
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
