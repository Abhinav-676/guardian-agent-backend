import type { Request, Response } from 'express'
import { z } from 'zod'
import Mobilerun from '@mobilerun/sdk'
import { validateData } from '../utils/validation'
import { User } from '../schemas/userSchema'

// --- Schemas & Types ---

const TheftSignalType = z.enum([
    'face_lock_fail',
    'wrong_pin',
    'sudden_jerk',
    'screen_on_off_quick',
    'location_jump',
    'sim_change',
    'power_off_attempt',
])

const TheftSignalSchema = z.object({
    type: TheftSignalType,
    timestamp: z.number(),
    metadata: z.record(z.string(), z.any()).optional(),
})

const AgentRequestSchema = z.object({
    signals: z.array(TheftSignalSchema),
    context: z.object({
        ownerName: z.string(),
        lastKnownLocation: z.string(),
        batteryLevel: z.number(),
    }),
})

type TheftSignal = z.infer<typeof TheftSignalSchema>

// --- Configuration ---

const SCORE_THRESHOLDS = {
    SUSPICIOUS: 40,
    THEFT_MODE: 70,
}

// --- Logic ---

function calculateConfidenceScore(signals: TheftSignal[]): number {
    let score = 0

    for (const signal of signals) {
        switch (signal.type) {
            case 'face_lock_fail':
                // +20 for 1st attempt, +40 implicitly if multiple present or handled by client logic sending separate events
                // Logic: specific rule "1 attempt +20, 2nd attempt +40".
                // If the client sends "attempt: 2" in metadata, we can use that.
                // Assuming metadata.attemptCount exists for this signal
                const attempt = Number(signal.metadata?.attemptCount ?? 1)
                score += attempt >= 2 ? 40 : 20
                break
            case 'wrong_pin':
                score += 15
                break
            case 'sudden_jerk':
                score += 25
                break
            case 'screen_on_off_quick':
                score += 20
                break
            case 'location_jump':
                score += 30
                break
            case 'sim_change':
                score += 50
                break
            case 'power_off_attempt':
                score += 50
                break
        }
    }

    return score
}

function determineAgentState(score: number): 'NORMAL' | 'SUSPICIOUS' | 'THEFT_MODE' {
    if (score >= SCORE_THRESHOLDS.THEFT_MODE) return 'THEFT_MODE'
    if (score >= SCORE_THRESHOLDS.SUSPICIOUS) return 'SUSPICIOUS'
    return 'NORMAL'
}

// --- Controller ---

export async function execute(req: Request, res: Response): Promise<void> {
    console.log("Executing agent controller")

    try {
        console.log(req.body)
        // 1. Validate Input
        const { signals, context } = validateData<z.infer<typeof AgentRequestSchema>>(
            AgentRequestSchema,
            req.body
        )

        // 2. Calculate Confidence Score
        const score = calculateConfidenceScore(signals)
        const state = determineAgentState(score)

        // 3. Construct Agent Prompt based on State
        let taskPrompt = `Current State: ${state}. Confidence Score: ${score}.\n`
        taskPrompt += `Signals: ${signals.map(s => s.type).join(', ')}.\n`
        
        if (state === 'NORMAL') {
            res.status(200).json({
                message: "Situation normal, continuing monitoring"
            })

            return
        }

        if (state === 'THEFT_MODE') {
            taskPrompt += `CRITICAL: THEFT DETECTED. ACT IMMEDIATELY.\n`
            taskPrompt += `Perform the following steps.\n`
            taskPrompt += `- Send "Emergency Contact" SMS with a message saying that the device has been stolen, location is Latitude 	23.3426 Longitude 	85.3099 and battery percentage is 40%\n`
        } else if (state === 'SUSPICIOUS') {
            taskPrompt += `WARNING: Suspicious activity detected.\n`
            taskPrompt += `- Send SMS to "Emergency Contact" with message, "Suspicious acitvity detected, please check your device"\n`
        }


        // 4. Initialize MobileRun Client
        if (!req.user || !req.user.userId) {
            res.status(401).json({ error: 'Unauthorized' })
            return
        }

        const user = await User.findById(req.user.userId)

        if (!user) {
            res.status(404).json({ error: 'User not found' })
            return
        }


        const apiKey = process.env.MOBILE_RUN_API
        const deviceId = process.env.DEVICE_ID
        if (!apiKey) {
            throw new Error('MOBILE_RUN_API is missing in environment variables.')
        }
        if (!deviceId) {
            console.log(deviceId, "Device ID")
            throw new Error('DEVICE_ID is missing in environment variables.')
        }

        const client = new Mobilerun({
            apiKey,
        })

        // 5. Execute Task via MobileRun Node
        const response = await client.tasks.run({
            llmModel: 'google/gemini-2.5-flash',
            task: taskPrompt,
            deviceId: deviceId,
            vision: true,
            executionTimeout: 10000
        })

        res.status(200).json({
            success: true,
            state,
            score,
            agentResponse: {
                id: response.id,
                streamUrl: response.streamUrl,
                token: response.token,
            },
        })
    } catch (error) {
        if (error instanceof Error) {
            if (error.constructor.name === 'ValidationError') {
                res.status(400).json({
                    error: 'Validation failed',
                    details: (error as any).errors
                })
                return
            }

            console.log(error)
            res.status(500).json({ error: error.message })
            return
        }
        
        res.status(500).json({ error: 'Internal server error' })
    }
}