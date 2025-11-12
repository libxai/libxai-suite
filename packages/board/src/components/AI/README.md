# AI Components

This folder contains AI-powered components for the LibXAI Board library.

## Components

### GeneratePlanModal
Generate Kanban board plans (columns + cards) using AI.

### AIUsageDashboard
Track and visualize AI usage statistics.

### GenerateGanttTasksDialog ✨ NEW
Generate Gantt chart tasks using AI with semantic caching and cost control.

## Usage Example: GenerateGanttTasksDialog

```tsx
import { GenerateGanttTasksDialog } from '@libxai/board'
import { supabase } from './supabase'

function MyGanttView() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { workspace } = useWorkspace()

  const handleGenerateTasks = async ({ prompt, projectName, startDate, endDate }) => {
    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('generate-gantt-tasks', {
      body: {
        workspace_id: workspace.id,
        project_id: 'my-project-id',
        prompt,
        project_name: projectName,
        start_date: startDate,
        end_date: endDate,
      },
    })

    if (error) throw error
    return data
  }

  const handleTasksGenerated = (tasks) => {
    console.log('Generated tasks:', tasks)
    // Add tasks to your Gantt chart
  }

  return (
    <>
      <button onClick={() => setDialogOpen(true)}>
        Generate Tasks with AI
      </button>

      <GenerateGanttTasksDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onTasksGenerated={handleTasksGenerated}
        onGenerateTasks={handleGenerateTasks}
        projectId="my-project-id"
        projectName="My Project"
      />
    </>
  )
}
```

## Features

### Semantic Caching
- Automatically caches AI responses with semantic similarity search
- 85% similarity threshold for cache hits
- Saves 60-80% on API costs for similar prompts

### Cost Control
- Token tracking per workspace
- Monthly limits based on plan (free: 10K, pro: 50K, enterprise: unlimited)
- Real-time usage display in UI

### Mock Mode
- Works without OpenAI API key for development
- Generates realistic fake data
- Zero cost for testing

## Backend Requirements

This component requires:
1. Supabase Edge Function: `generate-gantt-tasks`
2. PostgreSQL tables: `ai_cache`, `ai_usage_logs`
3. pgvector extension for semantic search
4. OpenAI API key (optional, falls back to mock mode)

See `sql/03_ai_cost_control.sql` for database setup.
