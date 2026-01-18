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
                // Power off attempt on lock screen is separate critical trigger, 
                // but if part of scoring, we can add high value or handle distinctly.
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
    try {
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

        if (state === 'THEFT_MODE') {
            taskPrompt += `CRITICAL: THEFT DETECTED. ACT IMMEDIATELY.\n`
            taskPrompt += `- Send SMS to Gautam Govind with Location: ${context.lastKnownLocation || 'Unknown'}\n`
            taskPrompt += `- Initiate Gautam Govind call.\n`
            taskPrompt += `- Lock device screen.\n`
            taskPrompt += `Context: Owner ${context.ownerName}, Battery ${context.batteryLevel}%.\n`
        } else if (state === 'SUSPICIOUS') {
            taskPrompt += `WARNING: Suspicious activity detected.\n`
            taskPrompt += `- Prepare SMS text but do not send yet.\n`
            // taskPrompt += `- Increase sampling rate of location and camera.\n`
        } else {
            taskPrompt += `Status Normal. Log events and continue monitoring.\n`
        }

        // Check for "Power Off" specific override
        const powerOffSignal = signals.find(s => s.type === 'power_off_attempt')
        if (powerOffSignal) {
            taskPrompt += `\nEMERGENCY: POWER OFF ATTEMPT DETECTED! EXECUTE EMERGENCY PACKET NOW.\n`
        }

        // 4. Initialize MobileRun Client
        if (!req.user || !req.user.userId) {
            res.status(401).json({ error: 'Unauthorized' })
            return
        }

        const user = await User.findById(req.user.userId).select('+mobileRunApiKey')

        if (!user) {
            res.status(404).json({ error: 'User not found' })
            return
        }

        const apiKey = user.mobileRunApiKey

        if (!apiKey) {
            throw new Error('MobileRun API Key is missing for this user. Updated your profile.')
        }

        const client = new Mobilerun({
            apiKey,
        })

        // 5. Execute Task via MobileRun Node
        const response = await client.tasks.run({
            llmModel: 'google/gemini-2.5-flash',
            task: taskPrompt,
            deviceId: user.deviceId || 'unknown_device',
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

            res.status(500).json({ error: error.message })
            return
        }

        res.status(500).json({ error: 'Internal server error' })
    }
}