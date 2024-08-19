// LLM call component
"use client";

import React from 'react';  
import { RetellWebClient } from 'retell-client-js-sdk';

const retellWebClient = new RetellWebClient();

const CallComponent: React.FC = () => {
    const [prompt, setPrompt] = React.useState<string>("You are an expert juggler, here to tutor a beginner in the sport. Speak casually, and keep your responses relatively short - this is a conversation, not a lecture.");
    return (
        <div>
            <h1>call</h1>
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                style={{width: "100%"}}
            />
            <button onClick={async () => {
                retellWebClient.stopCall();
                const startResponse = await fetch('/api/startcall', {
                    method: 'POST',
                    body: JSON.stringify({ prompt }),
                });
                const body = await startResponse.json();
                console.log(body);
                console.log("Starting call");
                await retellWebClient.startCall({
                    accessToken: body.access_token,
                });
                console.log("Call started");
            }}>Start call</button>
            <button onClick={() => {
                retellWebClient.stopCall();
            }}>Stop call</button>
        </div>
    );
    }

export default CallComponent;