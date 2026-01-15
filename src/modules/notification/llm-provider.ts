// src/modules/notification/llm-provider.ts
import { groq, GROQ_MODEL } from '../../config/ai';
import { logger } from '../../utils/logger';
import { NotificationType, MotivationTone } from '@prisma/client';

export interface MessageGenerationInput {
  notificationType: NotificationType;
  userTone: MotivationTone;
  task?: any;
  dream?: any;
}

/**
 * Generate personalized notification messages using Groq LLM
 * Based on notification type and user preferences
 */
export async function generateNotificationMessageWithLLM(
  input: MessageGenerationInput
): Promise<string> {
  try {
    const { notificationType, userTone, task, dream } = input;

    // Build context for LLM
    const context = buildContext(notificationType, task, dream);
    const toneInstruction = getToneInstruction(userTone);

    const prompt = `
You are a motivational assistant for DreamPlanner, a productivity and goal tracking app.

${toneInstruction}

${context}

Generate a SHORT, SINGLE-LINE notification message (max 100 characters) for the user.
The message should be encouraging, specific to their task/dream, and match their preferred motivation style.

IMPORTANT: Return ONLY the message text, nothing else. No quotes, no explanation.
`;

    const message = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 50,
    });

    const generatedMessage = message.choices[0]?.message?.content?.trim() || '';

    if (!generatedMessage) {
      return getDefaultMessage(notificationType);
    }

    await logger.info('llm', 'Message generated', {
      notificationType,
      userTone,
      messageLength: generatedMessage.length,
    });

    return generatedMessage;
  } catch (error: any) {
    await logger.error('llm', 'Failed to generate message', {
      error: error.message,
      notificationType: input.notificationType,
    });
    return getDefaultMessage(input.notificationType);
  }
}

/**
 * Build context for LLM based on task/dream
 */
function buildContext(
  notificationType: NotificationType,
  task?: any,
  dream?: any
): string {
  if (notificationType === 'REMINDER') {
    let context = 'The user has a task reminder.\n';
    if (task) {
      context += `Task: "${task.title}"\n`;
      if (task.description) {
        context += `Description: ${task.description}\n`;
      }
    }
    if (dream) {
      context += `Part of dream: "${dream.title}"\n`;
    }
    return context;
  }

  if (notificationType === 'MOTIVATIONAL') {
    let context = 'Generate an encouraging motivational message.\n';
    if (task) {
      context += `They are working on: "${task.title}"\n`;
    }
    if (dream) {
      context += `Towards dream: "${dream.title}"\n`;
    }
    return context;
  }

  return 'Generate a helpful system notification message.\n';
}

/**
 * Get tone instruction for LLM
 */
function getToneInstruction(tone: MotivationTone): string {
  const instructions: Record<MotivationTone, string> = {
    HARSH:
      'Use a direct, no-nonsense tone. Be blunt and challenge them. Make them accountable.',
    POSITIVE:
      'Use an uplifting, supportive tone. Acknowledge their effort and celebrate small wins.',
    OPTIMISTIC:
      'Use an enthusiastic, can-do tone. Focus on possibilities and potential. Be inspiring.',
    FEAR:
      'Use an urgency-driven tone. Remind them what could be lost if they don\'t act. Create a sense of urgency.',
    LOGICAL:
      'Use a facts-based, analytical tone. Appeal to reason and efficiency. Focus on progress metrics.',
    NEUTRAL:
      'Use a balanced, factual tone. Be informative without emotional overtones. Keep it professional.',
  };

  return `Tone: ${instructions[tone] || instructions.NEUTRAL}`;
}

/**
 * Default messages (fallback)
 */
function getDefaultMessage(notificationType: NotificationType): string {
  const defaults: Record<NotificationType, string> = {
    REMINDER: 'Time to focus on your task!',
    MOTIVATIONAL: 'Keep pushing towards your dreams! 💪',
    SYSTEM: 'You have a notification from DreamPlanner',
  };

  return defaults[notificationType] || 'Check your DreamPlanner';
}