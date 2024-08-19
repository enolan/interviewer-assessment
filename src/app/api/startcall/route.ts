// API for starting calls with Retell

const fs = require('fs').promises;

import { NextRequest, NextResponse } from "next/server";
import Retell from 'retell-sdk';

const retellClient = new Retell({
    apiKey: process.env.RETELL_API_KEY as string,
});

export async function POST(request: NextRequest) {
    const body = await request.json();
    console.log(`Starting call, prompt is: ${body.prompt}`);
    const callResponse = await retellClient.call.createWebCall({
        agent_id: process.env.RETELL_AGENT_ID as string,
    });
    console.log("Create web call returned");
    // const agentResponse = await retellClient.web.create({
    //     llm_websocket_url: process.env.LLM_WEBSOCKET_URL as string,
    //     voice_id: "openai-Alloy"
    // });
    try {
        await fs.writeFile('call.json', JSON.stringify({call_id: callResponse.call_id, prompt: body.prompt}));
    } catch (e) {
        console.error(`Error writing call response: ${e}`);
        return NextResponse.error();
    }
    console.log(`Set up call: ${JSON.stringify(callResponse)}`);
    return NextResponse.json({ access_token: callResponse.access_token });
}