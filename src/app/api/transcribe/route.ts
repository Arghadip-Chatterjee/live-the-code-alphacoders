import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

// Define the directory where speech files will be stored
const speechDir = path.resolve('./public');

// Function to get the next available file number
const getNextFileNumber = () => {
    const files = fs.readdirSync(speechDir);
    const speechFiles = files.filter(file => file.startsWith('speech') && file.endsWith('.mp3'));
    const numbers = speechFiles.map(file => parseInt(file.replace('speech', '').replace('.mp3', '')));
    const maxNumber = Math.max(...numbers, 0);
    return maxNumber + 1;
};

// Handler for POST requests
export async function POST(req: Request) {
    try {
        const { text } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        // Determine the next available file number
        const fileNumber = getNextFileNumber();
        const speechFilePath = path.join(speechDir, `speech${fileNumber}.mp3`);

        // Delete the previous speech file if it exists
        const previousFileNumber = fileNumber - 1;
        if (previousFileNumber >= 0) {
            const previousFilePath = path.join(speechDir, `speech${previousFileNumber}.mp3`);
            if (fs.existsSync(previousFilePath)) {
                await fs.promises.unlink(previousFilePath);
            }
        }

        // Generate TTS from OpenAI API
        const mp3 = await openai.audio.speech.create({
            model: 'tts-1',
            voice: 'alloy',
            input: text,
        });

        // Write audio to file
        const buffer = Buffer.from(await mp3.arrayBuffer());
        await fs.promises.writeFile(speechFilePath, buffer);

        // Return the file path for the audio
        return NextResponse.json({ filePath: `/speech${fileNumber}.mp3` }, { status: 200 });
    } catch (error) {
        console.error('Error generating speech:', error);
        return NextResponse.json({ error: 'Failed to generate speech' }, { status: 500 });
    }
}
