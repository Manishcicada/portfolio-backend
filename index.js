import express from 'express';
import * as dotenv from 'dotenv';
import cors from "cors";
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import {AI_CONTEXT} from './context.js';

dotenv.config();

const app = express();

app.use(cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
}));

app.options('/api/v1/ask', cors());

app.use(express.json());


const token = process.env.TOKEN;
const endpoint = "https://models.github.ai/inference";
const model = "openai/gpt-4.1";

const client = ModelClient(endpoint, new AzureKeyCredential(token));

async function getAIResponse(userMessage, systemPrompt) {
    try {
        const response = await client.path("/chat/completions").post({
            body: {
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage }
                ],
                temperature: 0.7,
                top_p: 0.9,
                max_tokens: 1000,
                model: model
            }
        });

        if (isUnexpected(response)) {
            throw new Error(`AI API Error: ${response.body.error?.message || 'Unknown error'}`);
        }

        return response.body.choices[0].message.content;
    } catch (error) {
        console.error('AI API Error:', error);
        throw error;
    }
}

app.post('/api/v1/ask', async (req, res) => {
    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }
    if (!token) {
        return res.status(500).json({ error: 'GITHUB_TOKEN is not configured' });
    }

    try {
        const systemPrompt = AI_CONTEXT;
        const aiResponse = await getAIResponse(message, systemPrompt);

        res.json({ reply: aiResponse });

    } catch (err) {
        console.error('Detailed error:', err);

        res.status(500).json({
            error: 'Failed to get AI response',
            details: err.message
        });
    }
});

app.listen(3001, () => { console.log("Running on port http://localhost:3001") })