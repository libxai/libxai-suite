/**
 * AI Prompts
 * Centralized prompts for all AI features
 */

/**
 * System prompt for plan generation
 */
export const GENERATE_PLAN_SYSTEM_PROMPT = `You are an expert project manager and task breakdown specialist.
Your role is to analyze project descriptions and create detailed, actionable Kanban board plans.

Guidelines:
- Create 3-5 columns representing workflow stages (e.g., Backlog, To Do, In Progress, Review, Done)
- Generate 5-15 cards with clear, actionable titles
- Each card should have a detailed description
- Assign realistic priorities (LOW, MEDIUM, HIGH, URGENT)
- Estimate effort in hours
- Add relevant labels/tags
- Consider dependencies between tasks
- Ensure tasks are properly ordered by priority and dependencies

Output Format:
- Return a valid JSON object matching the schema
- Column positions should increment by 1000 (1000, 2000, 3000...)
- Card positions should increment by 100 within columns
- Be specific and actionable in descriptions
- Use professional language`

/**
 * Prompt for plan generation
 */
export function generatePlanPrompt(userInput: string): string {
  return `Create a complete Kanban board plan for the following project:

"${userInput}"

Generate a comprehensive project plan with columns and cards. Consider:
1. Break down the project into logical workflow stages
2. Identify all major tasks and subtasks
3. Prioritize tasks appropriately
4. Estimate effort realistically
5. Set up dependencies where tasks depend on others
6. Add relevant labels to categorize work

Provide a detailed, ready-to-use Kanban board structure.`
}

/**
 * System prompt for assignee suggestion
 */
export const SUGGEST_ASSIGNEE_SYSTEM_PROMPT = `You are an AI assistant specialized in team management and task assignment.
Analyze the task details, team member skills, workload, and historical performance to suggest the best assignee.

Consider:
- Task complexity and required skills
- Team member expertise and experience
- Current workload and capacity
- Past performance on similar tasks
- Task dependencies and collaboration needs

Provide a recommendation with confidence score and clear reasoning.`

/**
 * Prompt for assignee suggestion
 */
export function suggestAssigneePrompt(
  cardTitle: string,
  cardDescription: string | undefined,
  priority: string | undefined,
  availableUsers: Array<{ id: string; name: string; skills?: string[] }>,
  workloadData?: Record<string, number>
): string {
  const usersInfo = availableUsers.map((user) => {
    const workload = workloadData?.[user.id] || 0
    const skills = user.skills?.join(', ') || 'Not specified'
    return `- ${user.name} (ID: ${user.id})\n  Skills: ${skills}\n  Current workload: ${workload} tasks`
  }).join('\n\n')

  return `Suggest the best team member to assign to this task:

Task: ${cardTitle}
Description: ${cardDescription || 'No description provided'}
Priority: ${priority || 'Not specified'}

Available team members:
${usersInfo}

Analyze the task requirements and team capabilities to recommend the most suitable assignee.
Provide your confidence level (0-1) and explain your reasoning.`
}

/**
 * System prompt for risk prediction
 */
export const PREDICT_RISKS_SYSTEM_PROMPT = `You are an AI-powered project risk analyst.
Analyze the current state of a Kanban board to identify risks, bottlenecks, and opportunities.

Types of insights to detect:
- RISK_DELAY: Tasks at risk of missing deadlines
- RISK_OVERLOAD: Columns or team members with too much work
- RISK_BLOCKER: Tasks blocking other work
- OPPORTUNITY_OPTIMIZATION: Chances to improve workflow
- PATTERN_ANOMALY: Unusual patterns that need attention

For each insight:
- Assess severity (LOW, MEDIUM, HIGH, CRITICAL)
- Provide confidence score (0-1)
- Give actionable recommendations
- Identify affected cards/columns`

/**
 * Prompt for risk prediction
 */
export function predictRisksPrompt(
  columns: Array<{ id: string; title: string; cardIds: string[]; wipLimit?: number }>,
  cards: Array<{
    id: string
    title: string
    columnId: string
    priority?: string
    dueDate?: string
    dependencies?: string[]
    assignedUserIds?: string[]
  }>
): string {
  const columnsSummary = columns.map((col) => {
    const cardCount = col.cardIds.length
    const wipStatus = col.wipLimit
      ? cardCount > col.wipLimit
        ? ' (WIP EXCEEDED!)'
        : ` (WIP: ${cardCount}/${col.wipLimit})`
      : ''
    return `- ${col.title}: ${cardCount} cards${wipStatus}`
  }).join('\n')

  const highPriorityCards = cards.filter(
    (c) => c.priority === 'HIGH' || c.priority === 'URGENT'
  ).length

  const blockedCards = cards.filter(
    (c) => c.dependencies && c.dependencies.length > 0
  ).length

  const overdueCards = cards.filter((c) => {
    if (!c.dueDate) return false
    return new Date(c.dueDate) < new Date()
  }).length

  return `Analyze this Kanban board for risks and opportunities:

Board Summary:
${columnsSummary}

Key Metrics:
- Total cards: ${cards.length}
- High/Urgent priority: ${highPriorityCards}
- Cards with dependencies: ${blockedCards}
- Overdue cards: ${overdueCards}

Identify:
1. Workflow bottlenecks or overload
2. Tasks at risk of delays
3. Blocking issues
4. Optimization opportunities
5. Unusual patterns

Provide specific, actionable insights with confidence scores.`
}

/**
 * System prompt for subtask generation
 */
export const GENERATE_SUBTASKS_SYSTEM_PROMPT = `You are a task breakdown expert.
Analyze a task and break it down into logical, actionable subtasks.

Guidelines:
- Generate 3-8 subtasks depending on complexity
- Each subtask should be specific and actionable
- Subtasks should follow logical order
- Consider technical and non-technical steps
- Include testing and documentation where appropriate`

/**
 * Prompt for subtask generation
 */
export function generateSubtasksPrompt(
  cardTitle: string,
  cardDescription: string | undefined,
  estimatedHours?: number
): string {
  return `Break down this task into subtasks:

Task: ${cardTitle}
Description: ${cardDescription || 'No description provided'}
Estimated effort: ${estimatedHours ? `${estimatedHours} hours` : 'Not specified'}

Create a list of specific, actionable subtasks that:
1. Cover all aspects of completing this task
2. Are ordered logically
3. Are independently completable
4. Include any necessary testing or review steps

Each subtask should have a clear title and brief description.`
}

/**
 * System prompt for effort estimation
 */
export const ESTIMATE_EFFORT_SYSTEM_PROMPT = `You are an experienced software project estimator.
Analyze task descriptions and provide realistic effort estimates in hours.

Consider:
- Task complexity and scope
- Technical challenges
- Testing requirements
- Documentation needs
- Review and iteration time
- Typical team velocity

Provide estimates with confidence levels.`

/**
 * Prompt for effort estimation
 */
export function estimateEffortPrompt(
  cardTitle: string,
  cardDescription: string | undefined,
  priority?: string,
  dependencies?: string[]
): string {
  return `Estimate the effort required for this task:

Task: ${cardTitle}
Description: ${cardDescription || 'No description provided'}
Priority: ${priority || 'Not specified'}
Dependencies: ${dependencies?.length ? `${dependencies.length} tasks` : 'None'}

Provide a realistic estimate in hours, considering:
- Implementation time
- Testing and QA
- Code review
- Documentation
- Buffer for unknowns

Return your estimate and confidence level (0-1).`
}
