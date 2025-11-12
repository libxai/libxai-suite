# LibXAI Board - Integration Guide

## 🔐 CASL Authorization Integration

LibXAI Board v0.8.2+ includes built-in support for permissions systems like CASL.

### Quick Example

```typescript
import { GanttBoard } from '@libxai/board'
import { useAbility } from '@/hooks/useAbility' // Your CASL hook

function ProjectGantt() {
  const ability = useAbility()
  const [tasks, setTasks] = useState<GanttTask[]>([])

  return (
    <GanttBoard
      tasks={tasks}
      config={{
        permissions: {
          canCreateTask: ability.can('create', 'Task'),
          canUpdateTask: ability.can('update', 'Task'),
          canDeleteTask: ability.can('delete', 'Task'),
          canCreateDependency: ability.can('create', 'Dependency'),
          canDeleteDependency: ability.can('delete', 'Dependency'),
          canUpdateProgress: ability.can('update', 'TaskProgress'),
          canAssignUsers: ability.can('assign', 'Task'),
          canModifyHierarchy: ability.can('update', 'TaskHierarchy'),
          canDuplicateTask: ability.can('create', 'Task'),
          canReorderTasks: ability.can('update', 'Task'),
          canExport: ability.can('export', 'Project'),
        },

        // Lifecycle events still work for cancelation
        onBeforeTaskUpdate: (taskId, newData) => {
          return ability.can('update', 'Task')
        },

        onBeforeTaskDelete: (taskId) => {
          return ability.can('delete', 'Task')
        },
      }}
      onTasksChange={setTasks}
    />
  )
}
```

### Task-Level Permissions

For more granular control (e.g., "users can only edit tasks assigned to them"):

```typescript
<GanttBoard
  tasks={tasks}
  config={{
    permissions: {
      // Global permissions
      canCreateTask: ability.can('create', 'Task'),

      // Task-level permission checker
      canPerformAction: (task, action) => {
        if (action === 'update') {
          // Only allow editing tasks assigned to current user
          return task.assignees?.some(a => a.id === currentUser.id) ?? false
        }

        if (action === 'delete') {
          // Only allow deleting own tasks
          return task.createdBy === currentUser.id
        }

        if (action === 'assign') {
          // Managers can assign, members cannot
          return currentUser.role === 'manager' || currentUser.role === 'admin'
        }

        return true
      }
    }
  }}
/>
```

### Role-Based Permissions Example

```typescript
const getPermissionsForRole = (role: UserRole) => {
  switch (role) {
    case 'admin':
      return {
        canCreateTask: true,
        canUpdateTask: true,
        canDeleteTask: true,
        canCreateDependency: true,
        canDeleteDependency: true,
        canUpdateProgress: true,
        canAssignUsers: true,
        canModifyHierarchy: true,
        canDuplicateTask: true,
        canReorderTasks: true,
        canExport: true,
      }

    case 'manager':
      return {
        canCreateTask: true,
        canUpdateTask: true,
        canDeleteTask: false, // Cannot delete tasks
        canCreateDependency: true,
        canDeleteDependency: true,
        canUpdateProgress: true,
        canAssignUsers: true,
        canModifyHierarchy: true,
        canDuplicateTask: true,
        canReorderTasks: true,
        canExport: true,
      }

    case 'member':
      return {
        canCreateTask: true,
        canUpdateTask: true, // But see canPerformAction below
        canDeleteTask: false,
        canCreateDependency: false,
        canDeleteDependency: false,
        canUpdateProgress: true,
        canAssignUsers: false,
        canModifyHierarchy: false,
        canDuplicateTask: false,
        canReorderTasks: false,
        canExport: false,
      }

    case 'viewer':
      return {
        canCreateTask: false,
        canUpdateTask: false,
        canDeleteTask: false,
        canCreateDependency: false,
        canDeleteDependency: false,
        canUpdateProgress: false,
        canAssignUsers: false,
        canModifyHierarchy: false,
        canDuplicateTask: false,
        canReorderTasks: false,
        canExport: true, // Viewers can export
      }
  }
}

// Usage
<GanttBoard
  tasks={tasks}
  config={{
    permissions: {
      ...getPermissionsForRole(user.role),

      // Members can only edit their own tasks
      canPerformAction: (task, action) => {
        if (user.role === 'member' && action === 'update') {
          return task.assignees?.some(a => a.id === user.id) ?? false
        }
        return true
      }
    }
  }}
/>
```

---

## 🤖 AI Backend Integration

LibXAI Board provides UI components for AI features, but delegates the actual AI processing to your backend.

### Architecture

```
User Input → LibXAI UI Component → Your Backend API → OpenAI/Anthropic → Your Backend → LibXAI UI
```

### Step 1: Create Backend Endpoint

```typescript
// pages/api/ai/generate-gantt.ts (Next.js example)
import { OpenAI } from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { description } = req.body

  if (!description) {
    return res.status(400).json({ error: 'Description is required' })
  }

  try {
    const prompt = `
You are a project planning assistant. Based on the following project description, generate a structured project plan in JSON format.

Project Description:
${description}

Return a JSON object with this structure:
{
  "columns": [
    { "title": "To Do", "position": 1000, "cardIds": [] },
    { "title": "In Progress", "position": 2000, "cardIds": [] },
    { "title": "Done", "position": 3000, "cardIds": [] }
  ],
  "cards": [
    {
      "id": "unique-id",
      "title": "Task name",
      "description": "Task description",
      "columnId": "To Do",
      "position": 1000,
      "priority": "high|medium|low",
      "labels": ["label1", "label2"],
      "dueDate": "2025-12-31"
    }
  ]
}

Generate 5-15 tasks organized into appropriate columns.
`

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(response.choices[0].message.content)

    return res.status(200).json(result)
  } catch (error) {
    console.error('AI generation error:', error)
    return res.status(500).json({ error: 'Failed to generate plan' })
  }
}
```

### Step 2: Connect to LibXAI Component

```typescript
import { GeneratePlanModal } from '@libxai/board'

function MyApp() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tasks, setTasks] = useState<GanttTask[]>([])

  const handleGeneratePlan = async (description: string) => {
    const response = await fetch('/api/ai/generate-gantt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}` // If auth required
      },
      body: JSON.stringify({ description })
    })

    if (!response.ok) {
      throw new Error('Failed to generate plan')
    }

    return await response.json()
  }

  const handlePlanGenerated = (plan: GeneratedPlan) => {
    console.log('Generated plan:', plan)

    // Convert plan.cards to GanttTasks
    const newTasks = plan.cards.map(card => ({
      id: card.id,
      name: card.title,
      startDate: new Date(card.dueDate),
      endDate: new Date(card.dueDate),
      progress: 0,
      status: 'todo' as const
    }))

    setTasks(newTasks)
    setIsModalOpen(false)
  }

  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>
        Generate Project with AI
      </button>

      <GeneratePlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGeneratePlan={handleGeneratePlan}
        onPlanGenerated={handlePlanGenerated}
      />

      <GanttBoard tasks={tasks} onTasksChange={setTasks} />
    </>
  )
}
```

### Step 3: Using AI SDK from Vercel (Optional)

If you want to use the `useAI` hook from LibXAI:

```typescript
import { useAI } from '@libxai/board'

function MyApp() {
  const ai = useAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    model: 'gpt-4-turbo',
    endpoint: '/api/ai' // Your custom endpoint
  })

  if (ai.isAvailable) {
    const plan = await ai.onGeneratePlan('Build a mobile app...')
  }
}
```

---

## 🗄️ Supabase Integration

### Database Schema

```sql
-- Projects table
create table projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamp with time zone default now(),
  created_by uuid references auth.users(id)
);

-- Tasks table
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  progress integer default 0,
  status text check (status in ('todo', 'in-progress', 'completed')),
  is_milestone boolean default false,
  is_critical_path boolean default false,
  parent_id uuid references tasks(id) on delete cascade,
  level integer default 0,
  position integer default 0,
  dependencies uuid[],
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Assignees table
create table task_assignees (
  task_id uuid references tasks(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  primary key (task_id, user_id)
);
```

### Service Layer

```typescript
// services/ganttService.ts
import { supabase } from '@/lib/supabase'
import type { GanttTask } from '@libxai/board'

export async function loadTasks(projectId: string): Promise<GanttTask[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      task_assignees (
        user_id,
        users (name, avatar_url)
      )
    `)
    .eq('project_id', projectId)
    .order('position')

  if (error) throw error

  return data.map(dbTask => ({
    id: dbTask.id,
    name: dbTask.name,
    startDate: dbTask.start_date ? new Date(dbTask.start_date) : undefined,
    endDate: dbTask.end_date ? new Date(dbTask.end_date) : undefined,
    progress: dbTask.progress,
    status: dbTask.status,
    isMilestone: dbTask.is_milestone,
    isCriticalPath: dbTask.is_critical_path,
    parentId: dbTask.parent_id,
    level: dbTask.level,
    position: dbTask.position,
    dependencies: dbTask.dependencies || [],
    assignees: dbTask.task_assignees?.map(a => ({
      name: a.users.name,
      initials: getInitials(a.users.name),
      color: '#3B82F6'
    }))
  }))
}

export async function saveTasks(projectId: string, tasks: GanttTask[]) {
  // Delete all tasks for project
  await supabase
    .from('tasks')
    .delete()
    .eq('project_id', projectId)

  // Insert updated tasks
  const { error } = await supabase
    .from('tasks')
    .insert(
      tasks.map(task => ({
        id: task.id,
        project_id: projectId,
        name: task.name,
        start_date: task.startDate?.toISOString(),
        end_date: task.endDate?.toISOString(),
        progress: task.progress,
        status: task.status,
        is_milestone: task.isMilestone,
        is_critical_path: task.isCriticalPath,
        parent_id: task.parentId,
        level: task.level,
        position: task.position,
        dependencies: task.dependencies
      }))
    )

  if (error) throw error
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
```

### Complete Integration

```typescript
import { GanttBoard } from '@libxai/board'
import { useEffect, useState } from 'react'
import { loadTasks, saveTasks } from '@/services/ganttService'
import { useAbility } from '@/hooks/useAbility'

export function ProjectGantt({ projectId }: { projectId: string }) {
  const ability = useAbility()
  const [tasks, setTasks] = useState<GanttTask[]>([])
  const [loading, setLoading] = useState(true)

  // Load tasks from Supabase
  useEffect(() => {
    loadTasks(projectId)
      .then(setTasks)
      .finally(() => setLoading(false))
  }, [projectId])

  // Save changes to Supabase
  const handleTasksChange = async (updatedTasks: GanttTask[]) => {
    setTasks(updatedTasks)

    try {
      await saveTasks(projectId, updatedTasks)
    } catch (error) {
      console.error('Failed to save tasks:', error)
      // Optionally: revert changes or show error toast
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <GanttBoard
      tasks={tasks}
      config={{
        theme: 'dark',
        timeScale: 'week',
        permissions: {
          canCreateTask: ability.can('create', 'Task'),
          canUpdateTask: ability.can('update', 'Task'),
          canDeleteTask: ability.can('delete', 'Task'),
          canCreateDependency: ability.can('create', 'Dependency'),
        }
      }}
      onTasksChange={handleTasksChange}
    />
  )
}
```

---

## 📝 Complete Example

See `examples/saas-integration/` for a complete working example with:
- CASL authorization
- Supabase backend
- AI generation
- Role-based permissions (admin, manager, member, viewer)
- Real-time updates
