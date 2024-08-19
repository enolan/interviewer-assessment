// WebSocket server for Retell callback

const fs = require('fs').promises;

import Anthropic from '@anthropic-ai/sdk';
import WebSocket from 'ws';

const TRANSCRIPT_STABILIZATION_MS = 500;

// Types for Retell WebSocket API...
interface Utterance {
    role: "agent" | "user";
    content: string;
  }

interface RetellRequest {
    response_id?: number;
    transcript: Utterance[];
    interaction_type: "update_only" | "response_required" | "reminder_required";
}

interface RetellResponse {
    response_id?: number;
    content: string;
    content_complete: boolean;
    end_call: boolean;
}

const anthropic = new Anthropic();

export default async function handleIncoming(ws: WebSocket, call_id: string) {
    console.log("New connection from Retell, loading file");
    const callResponse = await fs.readFile('call.json');
    const call = JSON.parse(callResponse.toString());
    if (call.call_id !== call_id) {
        console.error(`Call ID mismatch: ${call.call_id} != ${call_id}`);
        return;
    }
    console.log(`Prompt is: ${call.prompt}`);

    let responseIdCtr = 0;

    const startMessage: RetellResponse = {
        response_id: 0,
        content: "Hello world!",
        content_complete: true,
        end_call: false
    };

    console.log("Sending initial message");
    ws.send(JSON.stringify(startMessage));
    console.log("Initial message sent");

    const sendToLlm = async (transcript: Utterance[], response_id: number) => {
        console.log(`Sending conversation transcript to LLM: ${JSON.stringify(transcript)}`);

        const msg = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20240620",
            max_tokens: 200,
            temperature: 0.8,
            system: call.prompt,
            messages: [
                {
                "role": "user",
                "content": [
                    {
                    "type": "text",
                    "text": "How should I get started?"
                    }
                ]
                }
            ]
        });
        console.log(`Claude response: ${JSON.stringify(msg)}`);

        const response: RetellResponse = {
            content: (msg.content[0] as Anthropic.TextBlock).text,
            content_complete: true,
            end_call: false,
            response_id: response_id
        }

        ws.send(JSON.stringify(response));
    };
    let lastTranscript: Utterance[] = [];
    let lastTranscriptUpdated: number = Date.now();

    const waitSendToLlm = async (response_id: number) => {
        const timeSinceLastUpdate = Date.now() - lastTranscriptUpdated;
        if (timeSinceLastUpdate < TRANSCRIPT_STABILIZATION_MS) {
            console.log("Transcript not stabilized, waiting longer");
            setTimeout(() => waitSendToLlm(response_id), TRANSCRIPT_STABILIZATION_MS - timeSinceLastUpdate);
        } else {
            sendToLlm(lastTranscript, response_id);
        }
    };

    ws.on('message', async (message: string) => {
        const request: RetellRequest = JSON.parse(message);
        console.log(`Received message (JSON parsed): ${JSON.stringify(request)}`);
        lastTranscript = request.transcript;
        lastTranscriptUpdated = Date.now();

        if (request.interaction_type === "response_required") {
            console.log("Should answer, waiting for transcript to stabilize");
            waitSendToLlm(request.response_id!);
        }
    });

    ws.on('close', () => {
        console.log('Connection closed');
    });
}