import { Task, TaskSegment } from './types';

/**
 * Public utility functions for Gantt operations
 * Similar to DHTMLX gantt.* utility methods
 */
export const ganttUtils = {
  /**
   * Calculate end date based on start date and duration in days
   * @param start - Start date
   * @param durationDays - Duration in days
   * @returns End date
   */
  calculateEndDate: (start: Date, durationDays: number): Date => {
    const end = new Date(start);
    end.setDate(end.getDate() + durationDays);
    return end;
  },

  /**
   * Calculate duration in days between two dates
   * @param start - Start date
   * @param end - End date
   * @returns Duration in days (rounded up)
   */
  calculateDuration: (start: Date, end: Date): number => {
    const diffMs = end.getTime() - start.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  },

  /**
   * Calculate working days between two dates (excluding weekends)
   * @param start - Start date
   * @param end - End date
   * @returns Number of working days
   */
  calculateWorkingDays: (start: Date, end: Date): number => {
    let count = 0;
    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  },

  /**
   * Add working days to a date (excluding weekends)
   * @param start - Start date
   * @param workingDays - Number of working days to add
   * @returns End date
   */
  addWorkingDays: (start: Date, workingDays: number): Date => {
    const result = new Date(start);
    let daysAdded = 0;

    while (daysAdded < workingDays) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        daysAdded++;
      }
    }

    return result;
  },

  /**
   * Check if a date is a weekend
   * @param date - Date to check
   * @returns True if weekend
   */
  isWeekend: (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  },

  /**
   * Validate if creating a dependency would create a circular reference
   * Uses Depth-First Search (DFS) algorithm
   * @param tasks - All tasks
   * @param fromTaskId - Source task ID
   * @param toTaskId - Target task ID
   * @returns True if would create circular dependency
   */
  validateDependencies: (tasks: Task[], fromTaskId: string, toTaskId: string): boolean => {
    // Build dependency map
    const dependencyMap = new Map<string, string[]>();

    const buildMap = (taskList: Task[]) => {
      taskList.forEach(task => {
        if (task.dependencies) {
          dependencyMap.set(task.id, task.dependencies);
        }
        if (task.subtasks) {
          buildMap(task.subtasks);
        }
      });
    };

    buildMap(tasks);

    // Simulate adding the new dependency
    const existingDeps = dependencyMap.get(toTaskId) || [];
    dependencyMap.set(toTaskId, [...existingDeps, fromTaskId]);

    // DFS to detect cycle
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycle = (taskId: string): boolean => {
      if (!visited.has(taskId)) {
        visited.add(taskId);
        recStack.add(taskId);

        const deps = dependencyMap.get(taskId) || [];
        for (const depId of deps) {
          if (!visited.has(depId) && hasCycle(depId)) {
            return true;
          } else if (recStack.has(depId)) {
            return true;
          }
        }
      }
      recStack.delete(taskId);
      return false;
    };

    return hasCycle(toTaskId);
  },

  /**
   * Flatten nested tasks into a single array
   * @param tasks - Tasks with potential subtasks
   * @returns Flat array of all tasks
   */
  flattenTasks: (tasks: Task[]): Task[] => {
    const result: Task[] = [];

    const flatten = (taskList: Task[]) => {
      taskList.forEach(task => {
        result.push(task);
        if (task.subtasks && task.subtasks.length > 0) {
          flatten(task.subtasks);
        }
      });
    };

    flatten(tasks);
    return result;
  },

  /**
   * Find a task by ID in nested structure
   * @param tasks - Tasks to search
   * @param taskId - ID to find
   * @returns Task if found, undefined otherwise
   */
  findTaskById: (tasks: Task[], taskId: string): Task | undefined => {
    for (const task of tasks) {
      if (task.id === taskId) {
        return task;
      }
      if (task.subtasks) {
        const found = ganttUtils.findTaskById(task.subtasks, taskId);
        if (found) return found;
      }
    }
    return undefined;
  },

  /**
   * Get all parent tasks recursively
   * @param tasks - All tasks
   * @param taskId - Child task ID
   * @returns Array of parent tasks
   */
  getParentTasks: (tasks: Task[], taskId: string): Task[] => {
    const parents: Task[] = [];
    const task = ganttUtils.findTaskById(tasks, taskId);

    if (!task || !task.parentId) return parents;

    let currentId: string | undefined = task.parentId;
    while (currentId) {
      const parent = ganttUtils.findTaskById(tasks, currentId);
      if (parent) {
        parents.unshift(parent);
        currentId = parent.parentId;
      } else {
        break;
      }
    }

    return parents;
  },

  /**
   * Export tasks to JSON string
   * @param tasks - Tasks to export
   * @returns JSON string
   */
  exportToJSON: (tasks: Task[]): string => {
    return JSON.stringify(tasks, null, 2);
  },

  /**
   * Import tasks from JSON string
   * @param json - JSON string
   * @returns Parsed tasks
   */
  importFromJSON: (json: string): Task[] => {
    try {
      const parsed = JSON.parse(json);

      // Validate it's an array
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid JSON: expected an array of tasks');
      }

      // Basic validation of task structure
      parsed.forEach((task, index) => {
        if (!task.id || !task.name) {
          throw new Error(`Invalid task at index ${index}: missing required fields (id, name)`);
        }
      });

      return parsed;
    } catch (error) {
      throw new Error(`Failed to import tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Export tasks to CSV format
   * @param tasks - Tasks to export
   * @returns CSV string
   */
  exportToCSV: (tasks: Task[]): string => {
    const flat = ganttUtils.flattenTasks(tasks);

    // CSV Headers
    const headers = ['ID', 'Name', 'Start Date', 'End Date', 'Progress', 'Status', 'Dependencies'];
    const rows: string[] = [headers.join(',')];

    // CSV Data
    flat.forEach(task => {
      const row = [
        task.id,
        `"${task.name.replace(/"/g, '""')}"`, // Escape quotes in name
        task.startDate ? task.startDate.toISOString().split('T')[0] : '',
        task.endDate ? task.endDate.toISOString().split('T')[0] : '',
        task.progress.toString(),
        task.status || '',
        task.dependencies?.join(';') || '',
      ];
      rows.push(row.join(','));
    });

    return rows.join('\n');
  },

  /**
   * Format date to string (YYYY-MM-DD)
   * @param date - Date to format
   * @returns Formatted string
   */
  formatDate: (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Parse date from string (YYYY-MM-DD)
   * @param dateString - Date string
   * @returns Parsed Date
   */
  parseDate: (dateString: string): Date => {
    return new Date(dateString);
  },

  /**
   * Get date range for a task
   * @param task - Task to get range for
   * @returns Object with start and end dates, or null if no dates
   */
  getTaskDateRange: (task: Task): { start: Date; end: Date } | null => {
    if (!task.startDate || !task.endDate) return null;
    return {
      start: task.startDate,
      end: task.endDate,
    };
  },

  /**
   * Get the earliest start date from tasks
   * @param tasks - Tasks to search
   * @returns Earliest date or null
   */
  getEarliestStartDate: (tasks: Task[]): Date | null => {
    const flat = ganttUtils.flattenTasks(tasks);
    const tasksWithDates = flat.filter(t => t.startDate);

    if (tasksWithDates.length === 0) return null;

    return new Date(Math.min(...tasksWithDates.map(t => t.startDate!.getTime())));
  },

  /**
   * Get the latest end date from tasks
   * @param tasks - Tasks to search
   * @returns Latest date or null
   */
  getLatestEndDate: (tasks: Task[]): Date | null => {
    const flat = ganttUtils.flattenTasks(tasks);
    const tasksWithDates = flat.filter(t => t.endDate);

    if (tasksWithDates.length === 0) return null;

    return new Date(Math.max(...tasksWithDates.map(t => t.endDate!.getTime())));
  },

  /**
   * Check if two tasks overlap in time
   * @param task1 - First task
   * @param task2 - Second task
   * @returns True if tasks overlap
   */
  tasksOverlap: (task1: Task, task2: Task): boolean => {
    if (!task1.startDate || !task1.endDate || !task2.startDate || !task2.endDate) {
      return false;
    }

    return task1.startDate <= task2.endDate && task2.startDate <= task1.endDate;
  },

  /**
   * Get all tasks that depend on a given task (children in dependency tree)
   * @param tasks - All tasks
   * @param taskId - Task ID to find dependents for
   * @returns Array of tasks that depend on this task
   */
  getDependentTasks: (tasks: Task[], taskId: string): Task[] => {
    const flat = ganttUtils.flattenTasks(tasks);
    return flat.filter(task =>
      task.dependencies && task.dependencies.includes(taskId)
    );
  },

  /**
   * Get all tasks that a given task depends on (parents in dependency tree)
   * @param tasks - All tasks
   * @param taskId - Task ID to find dependencies for
   * @returns Array of tasks this task depends on
   */
  getDependencyTasks: (tasks: Task[], taskId: string): Task[] => {
    const task = ganttUtils.findTaskById(tasks, taskId);
    if (!task || !task.dependencies) return [];

    const flat = ganttUtils.flattenTasks(tasks);
    return flat.filter(t => task.dependencies!.includes(t.id));
  },

  /**
   * Filter tasks by status
   * @param tasks - Tasks to filter
   * @param status - Status to filter by
   * @returns Filtered tasks
   */
  filterByStatus: (tasks: Task[], status: 'todo' | 'in-progress' | 'completed'): Task[] => {
    return ganttUtils.flattenTasks(tasks).filter(t => t.status === status);
  },

  /**
   * Filter tasks by date range
   * @param tasks - Tasks to filter
   * @param startDate - Range start
   * @param endDate - Range end
   * @returns Tasks that fall within the date range
   */
  filterByDateRange: (tasks: Task[], startDate: Date, endDate: Date): Task[] => {
    return ganttUtils.flattenTasks(tasks).filter(task => {
      if (!task.startDate || !task.endDate) return false;
      return task.startDate <= endDate && task.endDate >= startDate;
    });
  },

  /**
   * Sort tasks by start date
   * @param tasks - Tasks to sort
   * @param ascending - Sort ascending (default) or descending
   * @returns Sorted tasks
   */
  sortByStartDate: (tasks: Task[], ascending = true): Task[] => {
    return [...tasks].sort((a, b) => {
      if (!a.startDate || !b.startDate) return 0;
      const diff = a.startDate.getTime() - b.startDate.getTime();
      return ascending ? diff : -diff;
    });
  },

  /**
   * Sort tasks by end date
   * @param tasks - Tasks to sort
   * @param ascending - Sort ascending (default) or descending
   * @returns Sorted tasks
   */
  sortByEndDate: (tasks: Task[], ascending = true): Task[] => {
    return [...tasks].sort((a, b) => {
      if (!a.endDate || !b.endDate) return 0;
      const diff = a.endDate.getTime() - b.endDate.getTime();
      return ascending ? diff : -diff;
    });
  },

  /**
   * Sort tasks by progress
   * @param tasks - Tasks to sort
   * @param ascending - Sort ascending (default) or descending
   * @returns Sorted tasks
   */
  sortByProgress: (tasks: Task[], ascending = true): Task[] => {
    return [...tasks].sort((a, b) => {
      const diff = a.progress - b.progress;
      return ascending ? diff : -diff;
    });
  },

  /**
   * Calculate total progress across all tasks
   * @param tasks - Tasks to calculate
   * @returns Average progress percentage
   */
  calculateTotalProgress: (tasks: Task[]): number => {
    const flat = ganttUtils.flattenTasks(tasks);
    if (flat.length === 0) return 0;

    const total = flat.reduce((sum, task) => sum + task.progress, 0);
    return Math.round(total / flat.length);
  },

  /**
   * Get task by path (array of indices in nested structure)
   * @param tasks - Root tasks
   * @param path - Array of indices [0, 2, 1] means tasks[0].subtasks[2].subtasks[1]
   * @returns Task at path or undefined
   */
  getTaskByPath: (tasks: Task[], path: number[]): Task | undefined => {
    let current: Task[] = tasks;
    let task: Task | undefined;

    for (let i = 0; i < path.length; i++) {
      const index = path[i];
      if (!current || index === undefined || index >= current.length) return undefined;

      task = current[index];
      if (!task) return undefined;

      if (i < path.length - 1) {
        current = task.subtasks || [];
      }
    }

    return task;
  },

  /**
   * Clone a task deeply (including subtasks)
   * @param task - Task to clone
   * @param newId - Optional new ID for the clone
   * @returns Cloned task
   */
  cloneTask: (task: Task, newId?: string): Task => {
    return {
      ...task,
      id: newId || `${task.id}-copy`,
      subtasks: task.subtasks?.map(st => ganttUtils.cloneTask(st)),
    };
  },

  /**
   * Export tasks to PDF format
   * @param tasks - Tasks to export
   * @param filename - Optional filename (default: 'gantt-chart.pdf')
   * @returns Promise<void>
   */
  exportToPDF: async (tasks: Task[], filename = 'gantt-chart.pdf'): Promise<void> => {
    try {
      if (!tasks || tasks.length === 0) {
        alert('No tasks available to export to PDF');
        return;
      }

      // v0.8.1: FIXED - Use correct jspdf-autotable v5.0 API
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();
      const flat = ganttUtils.flattenTasks(tasks);

      if (flat.length === 0) {
        alert('No tasks found to export');
        return;
      }

      // Title
      doc.setFontSize(16);
      doc.text('Gantt Chart - Task List', 14, 20);

      // Table data
      const headers = [['Task Name', 'Start Date', 'End Date', 'Duration', 'Progress', 'Status']];
      const data = flat.map(task => {
        const duration = task.startDate && task.endDate
          ? ganttUtils.calculateDuration(task.startDate, task.endDate)
          : 0;

        return [
          task.name,
          task.startDate ? ganttUtils.formatDate(task.startDate) : 'N/A',
          task.endDate ? ganttUtils.formatDate(task.endDate) : 'N/A',
          duration > 0 ? `${duration} days` : 'N/A',
          `${task.progress}%`,
          task.status || 'N/A',
        ];
      });

      // v0.8.1: Use autoTable function (v5.0 API) instead of doc.autoTable() (old API)
      autoTable(doc, {
        head: headers,
        body: data,
        startY: 30,
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        columnStyles: {
          0: { cellWidth: 60 }, // Task Name
          1: { cellWidth: 30 }, // Start Date
          2: { cellWidth: 30 }, // End Date
          3: { cellWidth: 25 }, // Duration
          4: { cellWidth: 20 }, // Progress
          5: { cellWidth: 25 }, // Status
        },
      });

      // Save the PDF
      doc.save(filename);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Export tasks to Excel format
   * @param tasks - Tasks to export
   * @param filename - Optional filename (default: 'gantt-chart.xlsx')
   * @returns Promise<void>
   */
  exportToExcel: async (tasks: Task[], filename = 'gantt-chart.xlsx'): Promise<void> => {
    const XLSX = await import('xlsx');
    const flat = ganttUtils.flattenTasks(tasks);

    // Prepare data
    const data = flat.map(task => {
      const duration = task.startDate && task.endDate
        ? ganttUtils.calculateDuration(task.startDate, task.endDate)
        : 0;

      return {
        'Task ID': task.id,
        'Task Name': task.name,
        'Start Date': task.startDate ? ganttUtils.formatDate(task.startDate) : '',
        'End Date': task.endDate ? ganttUtils.formatDate(task.endDate) : '',
        'Duration (days)': duration > 0 ? duration : '',
        'Progress (%)': task.progress,
        'Status': task.status || '',
        'Assignees': task.assignees?.map(a => a.name).join(', ') || '',
        'Dependencies': task.dependencies?.join(', ') || '',
        'Is Milestone': task.isMilestone ? 'Yes' : 'No',
        'Parent ID': task.parentId || '',
        'Level': task.level || 0,
      };
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set column widths
    const columnWidths = [
      { wch: 15 }, // Task ID
      { wch: 40 }, // Task Name
      { wch: 12 }, // Start Date
      { wch: 12 }, // End Date
      { wch: 15 }, // Duration
      { wch: 12 }, // Progress
      { wch: 15 }, // Status
      { wch: 30 }, // Assignees
      { wch: 20 }, // Dependencies
      { wch: 12 }, // Is Milestone
      { wch: 15 }, // Parent ID
      { wch: 8 },  // Level
    ];
    worksheet['!cols'] = columnWidths;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Gantt Tasks');

    // Save the file
    XLSX.writeFile(workbook, filename);
  },

  /**
   * Export tasks to Microsoft Project XML format
   * Compatible with MS Project 2010+ and other project management tools
   * @param tasks - Tasks to export
   * @param projectName - Project name (default: 'Gantt Project')
   * @param filename - Optional filename (default: 'project.xml')
   * @returns void - Downloads the XML file
   */
  exportToMSProject: (tasks: Task[], projectName = 'Gantt Project', filename = 'project.xml'): void => {
    const flat = ganttUtils.flattenTasks(tasks);

    // Generate unique UIDs for tasks (MS Project requires numeric UIDs)
    const taskUIDMap = new Map<string, number>();
    flat.forEach((task, index) => {
      taskUIDMap.set(task.id, index + 1); // UID starts at 1
    });

    // Format date for MS Project XML (ISO 8601)
    const formatMSDate = (date: Date): string => {
      return date.toISOString().replace('Z', '');
    };

    // Calculate project start and end dates
    const projectStart = ganttUtils.getEarliestStartDate(tasks) || new Date();
    const projectEnd = ganttUtils.getLatestEndDate(tasks) || new Date();

    // Build XML structure
    const xmlTasks = flat.map((task, index) => {
      const uid = taskUIDMap.get(task.id)!;
      const duration = task.startDate && task.endDate
        ? ganttUtils.calculateDuration(task.startDate, task.endDate)
        : 0;

      // Build predecessor links (dependencies)
      const predecessorLinks = (task.dependencies || [])
        .filter(depId => taskUIDMap.has(depId))
        .map(depId => `
        <PredecessorLink>
          <PredecessorUID>${taskUIDMap.get(depId)}</PredecessorUID>
          <Type>1</Type>
          <CrossProject>0</CrossProject>
          <LinkLag>0</LinkLag>
          <LagFormat>7</LagFormat>
        </PredecessorLink>`).join('');

      return `
    <Task>
      <UID>${uid}</UID>
      <ID>${index + 1}</ID>
      <Name>${task.name.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] || c)}</Name>
      <Type>0</Type>
      <IsNull>0</IsNull>
      <CreateDate>${formatMSDate(new Date())}</CreateDate>
      <WBS>${index + 1}</WBS>
      <OutlineNumber>${index + 1}</OutlineNumber>
      <OutlineLevel>${task.level || 0}</OutlineLevel>
      <Priority>500</Priority>
      <Start>${task.startDate ? formatMSDate(task.startDate) : ''}</Start>
      <Finish>${task.endDate ? formatMSDate(task.endDate) : ''}</Finish>
      <Duration>PT${duration * 8}H0M0S</Duration>
      <DurationFormat>7</DurationFormat>
      <Work>PT${duration * 8}H0M0S</Work>
      <Stop>${task.endDate ? formatMSDate(task.endDate) : ''}</Stop>
      <Resume>${task.startDate ? formatMSDate(task.startDate) : ''}</Resume>
      <ResumeValid>0</ResumeValid>
      <EffortDriven>1</EffortDriven>
      <Recurring>0</Recurring>
      <OverAllocated>0</OverAllocated>
      <Estimated>0</Estimated>
      <Milestone>${task.isMilestone ? '1' : '0'}</Milestone>
      <Summary>${(task.subtasks && task.subtasks.length > 0) ? '1' : '0'}</Summary>
      <Critical>${task.isCriticalPath ? '1' : '0'}</Critical>
      <IsSubproject>0</IsSubproject>
      <IsSubprojectReadOnly>0</IsSubprojectReadOnly>
      <ExternalTask>0</ExternalTask>
      <EarlyStart>${task.startDate ? formatMSDate(task.startDate) : ''}</EarlyStart>
      <EarlyFinish>${task.endDate ? formatMSDate(task.endDate) : ''}</EarlyFinish>
      <LateStart>${task.startDate ? formatMSDate(task.startDate) : ''}</LateStart>
      <LateFinish>${task.endDate ? formatMSDate(task.endDate) : ''}</LateFinish>
      <StartVariance>0</StartVariance>
      <FinishVariance>0</FinishVariance>
      <WorkVariance>0</WorkVariance>
      <FreeSlack>0</FreeSlack>
      <TotalSlack>0</TotalSlack>
      <FixedCost>0</FixedCost>
      <FixedCostAccrual>3</FixedCostAccrual>
      <PercentComplete>${task.progress}</PercentComplete>
      <PercentWorkComplete>${task.progress}</PercentWorkComplete>
      <Cost>0</Cost>
      <OvertimeCost>0</OvertimeCost>
      <OvertimeWork>PT0H0M0S</OvertimeWork>
      <ActualStart>${task.progress > 0 && task.startDate ? formatMSDate(task.startDate) : ''}</ActualStart>
      <ActualFinish>${task.progress === 100 && task.endDate ? formatMSDate(task.endDate) : ''}</ActualFinish>
      <ActualDuration>PT${Math.round(duration * task.progress / 100) * 8}H0M0S</ActualDuration>
      <ActualCost>0</ActualCost>
      <ActualOvertimeCost>0</ActualOvertimeCost>
      <ActualWork>PT${Math.round(duration * task.progress / 100) * 8}H0M0S</ActualWork>
      <ActualOvertimeWork>PT0H0M0S</ActualOvertimeWork>
      <RegularWork>PT${duration * 8}H0M0S</RegularWork>
      <RemainingDuration>PT${Math.round(duration * (100 - task.progress) / 100) * 8}H0M0S</RemainingDuration>
      <RemainingCost>0</RemainingCost>
      <RemainingWork>PT${Math.round(duration * (100 - task.progress) / 100) * 8}H0M0S</RemainingWork>
      <RemainingOvertimeCost>0</RemainingOvertimeCost>
      <RemainingOvertimeWork>PT0H0M0S</RemainingOvertimeWork>
      <ACWP>0</ACWP>
      <CV>0</CV>
      <ConstraintType>0</ConstraintType>
      <CalendarUID>-1</CalendarUID>
      <LevelAssignments>1</LevelAssignments>
      <LevelingCanSplit>1</LevelingCanSplit>
      <LevelingDelay>0</LevelingDelay>
      <LevelingDelayFormat>8</LevelingDelayFormat>
      <IgnoreResourceCalendar>0</IgnoreResourceCalendar>
      <HideBar>0</HideBar>
      <Rollup>0</Rollup>
      <BCWS>0</BCWS>
      <BCWP>0</BCWP>
      <PhysicalPercentComplete>0</PhysicalPercentComplete>
      <EarnedValueMethod>0</EarnedValueMethod>
      <IsPublished>1</IsPublished>
      <CommitmentType>0</CommitmentType>${predecessorLinks}
    </Task>`;
    }).join('');

    // Complete MS Project XML structure
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <SaveVersion>14</SaveVersion>
  <Name>${projectName.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] || c)}</Name>
  <Title>${projectName.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] || c)}</Title>
  <CreationDate>${formatMSDate(new Date())}</CreationDate>
  <LastSaved>${formatMSDate(new Date())}</LastSaved>
  <ScheduleFromStart>1</ScheduleFromStart>
  <StartDate>${formatMSDate(projectStart)}</StartDate>
  <FinishDate>${formatMSDate(projectEnd)}</FinishDate>
  <FYStartDate>1</FYStartDate>
  <CriticalSlackLimit>0</CriticalSlackLimit>
  <CurrencyDigits>2</CurrencyDigits>
  <CurrencySymbol>$</CurrencySymbol>
  <CurrencyCode>USD</CurrencyCode>
  <CurrencySymbolPosition>0</CurrencySymbolPosition>
  <CalendarUID>1</CalendarUID>
  <DefaultStartTime>08:00:00</DefaultStartTime>
  <DefaultFinishTime>17:00:00</DefaultFinishTime>
  <MinutesPerDay>480</MinutesPerDay>
  <MinutesPerWeek>2400</MinutesPerWeek>
  <DaysPerMonth>20</DaysPerMonth>
  <DefaultTaskType>1</DefaultTaskType>
  <DefaultFixedCostAccrual>3</DefaultFixedCostAccrual>
  <DefaultStandardRate>0</DefaultStandardRate>
  <DefaultOvertimeRate>0</DefaultOvertimeRate>
  <DurationFormat>7</DurationFormat>
  <WorkFormat>2</WorkFormat>
  <EditableActualCosts>0</EditableActualCosts>
  <HonorConstraints>1</HonorConstraints>
  <InsertedProjectsLikeSummary>1</InsertedProjectsLikeSummary>
  <MultipleCriticalPaths>0</MultipleCriticalPaths>
  <NewTasksEffortDriven>1</NewTasksEffortDriven>
  <NewTasksEstimated>1</NewTasksEstimated>
  <SplitsInProgressTasks>1</SplitsInProgressTasks>
  <SpreadActualCost>0</SpreadActualCost>
  <SpreadPercentComplete>0</SpreadPercentComplete>
  <TaskUpdatesResource>1</TaskUpdatesResource>
  <FiscalYearStart>0</FiscalYearStart>
  <WeekStartDay>1</WeekStartDay>
  <MoveCompletedEndsBack>0</MoveCompletedEndsBack>
  <MoveRemainingStartsBack>0</MoveRemainingStartsBack>
  <MoveRemainingStartsForward>0</MoveRemainingStartsForward>
  <MoveCompletedEndsForward>0</MoveCompletedEndsForward>
  <BaselineForEarnedValue>0</BaselineForEarnedValue>
  <AutoAddNewResourcesAndTasks>1</AutoAddNewResourcesAndTasks>
  <CurrentDate>${formatMSDate(new Date())}</CurrentDate>
  <MicrosoftProjectServerURL>1</MicrosoftProjectServerURL>
  <Autolink>1</Autolink>
  <NewTaskStartDate>0</NewTaskStartDate>
  <DefaultTaskEVMethod>0</DefaultTaskEVMethod>
  <ProjectExternallyEdited>0</ProjectExternallyEdited>
  <ExtendedCreationDate>${formatMSDate(new Date())}</ExtendedCreationDate>
  <ActualsInSync>0</ActualsInSync>
  <RemoveFileProperties>0</RemoveFileProperties>
  <AdminProject>0</AdminProject>
  <Calendars>
    <Calendar>
      <UID>1</UID>
      <Name>Standard</Name>
      <IsBaseCalendar>1</IsBaseCalendar>
      <IsBaselineCalendar>0</IsBaselineCalendar>
      <BaseCalendarUID>-1</BaseCalendarUID>
      <WeekDays>
        <WeekDay>
          <DayType>1</DayType>
          <DayWorking>0</DayWorking>
        </WeekDay>
        <WeekDay>
          <DayType>2</DayType>
          <DayWorking>1</DayWorking>
          <WorkingTimes>
            <WorkingTime>
              <FromTime>08:00:00</FromTime>
              <ToTime>12:00:00</ToTime>
            </WorkingTime>
            <WorkingTime>
              <FromTime>13:00:00</FromTime>
              <ToTime>17:00:00</ToTime>
            </WorkingTime>
          </WorkingTimes>
        </WeekDay>
        <WeekDay>
          <DayType>3</DayType>
          <DayWorking>1</DayWorking>
          <WorkingTimes>
            <WorkingTime>
              <FromTime>08:00:00</FromTime>
              <ToTime>12:00:00</ToTime>
            </WorkingTime>
            <WorkingTime>
              <FromTime>13:00:00</FromTime>
              <ToTime>17:00:00</ToTime>
            </WorkingTime>
          </WorkingTimes>
        </WeekDay>
        <WeekDay>
          <DayType>4</DayType>
          <DayWorking>1</DayWorking>
          <WorkingTimes>
            <WorkingTime>
              <FromTime>08:00:00</FromTime>
              <ToTime>12:00:00</ToTime>
            </WorkingTime>
            <WorkingTime>
              <FromTime>13:00:00</FromTime>
              <ToTime>17:00:00</ToTime>
            </WorkingTime>
          </WorkingTimes>
        </WeekDay>
        <WeekDay>
          <DayType>5</DayType>
          <DayWorking>1</DayWorking>
          <WorkingTimes>
            <WorkingTime>
              <FromTime>08:00:00</FromTime>
              <ToTime>12:00:00</ToTime>
            </WorkingTime>
            <WorkingTime>
              <FromTime>13:00:00</FromTime>
              <ToTime>17:00:00</ToTime>
            </WorkingTime>
          </WorkingTimes>
        </WeekDay>
        <WeekDay>
          <DayType>6</DayType>
          <DayWorking>1</DayWorking>
          <WorkingTimes>
            <WorkingTime>
              <FromTime>08:00:00</FromTime>
              <ToTime>12:00:00</ToTime>
            </WorkingTime>
            <WorkingTime>
              <FromTime>13:00:00</FromTime>
              <ToTime>17:00:00</ToTime>
            </WorkingTime>
          </WorkingTimes>
        </WeekDay>
        <WeekDay>
          <DayType>7</DayType>
          <DayWorking>0</DayWorking>
        </WeekDay>
      </WeekDays>
    </Calendar>
  </Calendars>
  <Tasks>${xmlTasks}
  </Tasks>
</Project>`;

    // Download the file
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  },

  /**
   * Calculate Critical Path Method (CPM) - identifies tasks with zero slack
   * @param tasks - All tasks
   * @returns Array of task IDs on the critical path
   */
  calculateCriticalPath: (tasks: Task[]): string[] => {
    const flat = ganttUtils.flattenTasks(tasks);
    const tasksWithDates = flat.filter(t => t.startDate && t.endDate);

    if (tasksWithDates.length === 0) return [];

    // Step 1: Calculate Early Start (ES) and Early Finish (EF) - Forward Pass
    const earlyDates = new Map<string, { es: number; ef: number }>();

    const calculateEarlyDates = (task: Task): void => {
      if (earlyDates.has(task.id)) return;

      const duration = task.startDate && task.endDate
        ? ganttUtils.calculateDuration(task.startDate, task.endDate)
        : 0;

      let es = 0;

      // If task has dependencies, ES = max(EF of all predecessors)
      if (task.dependencies && task.dependencies.length > 0) {
        for (const depId of task.dependencies) {
          const depTask = flat.find(t => t.id === depId);
          if (depTask) {
            calculateEarlyDates(depTask);
            const depEF = earlyDates.get(depId)?.ef || 0;
            es = Math.max(es, depEF);
          }
        }
      }

      const ef = es + duration;
      earlyDates.set(task.id, { es, ef });
    };

    tasksWithDates.forEach(calculateEarlyDates);

    // Step 2: Find project end date (max EF)
    const projectEnd = Math.max(...Array.from(earlyDates.values()).map(d => d.ef));

    // Step 3: Calculate Late Start (LS) and Late Finish (LF) - Backward Pass
    const lateDates = new Map<string, { ls: number; lf: number }>();

    const calculateLateDates = (task: Task): void => {
      if (lateDates.has(task.id)) return;

      const duration = task.startDate && task.endDate
        ? ganttUtils.calculateDuration(task.startDate, task.endDate)
        : 0;

      // Find all tasks that depend on this task
      const successors = flat.filter(t =>
        t.dependencies && t.dependencies.includes(task.id)
      );

      let lf = projectEnd;

      // If task has successors, LF = min(LS of all successors)
      if (successors.length > 0) {
        for (const successor of successors) {
          calculateLateDates(successor);
          const succLS = lateDates.get(successor.id)?.ls || 0;
          lf = Math.min(lf, succLS);
        }
      }

      const ls = lf - duration;
      lateDates.set(task.id, { ls, lf });
    };

    tasksWithDates.forEach(calculateLateDates);

    // Step 4: Calculate Slack (Float) = LS - ES = LF - EF
    // Tasks with slack = 0 are on the critical path
    const criticalPath: string[] = [];

    for (const task of tasksWithDates) {
      const early = earlyDates.get(task.id);
      const late = lateDates.get(task.id);

      if (early && late) {
        const slack = late.ls - early.es;
        if (Math.abs(slack) < 0.01) { // Float point comparison
          criticalPath.push(task.id);
        }
      }
    }

    return criticalPath;
  },

  /**
   * Calculate slack (float) time for a task
   * @param tasks - All tasks
   * @param taskId - Task ID to calculate slack for
   * @returns Slack in days, or null if cannot be calculated
   */
  calculateSlack: (tasks: Task[], taskId: string): number | null => {
    const task = ganttUtils.findTaskById(tasks, taskId);
    if (!task || !task.startDate || !task.endDate) return null;

    const criticalPath = ganttUtils.calculateCriticalPath(tasks);

    // If on critical path, slack is 0
    if (criticalPath.includes(taskId)) return 0;

    // Otherwise calculate slack using CPM algorithm
    // This is simplified - in production would use full CPM
    // For now, we approximate: slack = time until next dependent task
    const dependents = ganttUtils.getDependentTasks(tasks, taskId);

    if (dependents.length === 0) {
      // No dependents = float until project end
      const projectEnd = ganttUtils.getLatestEndDate(tasks);
      if (!projectEnd) return null;

      const daysToEnd = ganttUtils.calculateDuration(task.endDate, projectEnd);
      return Math.max(0, daysToEnd);
    }

    // Find earliest dependent
    const earliestDepStart = dependents
      .filter(d => d.startDate)
      .map(d => d.startDate!.getTime())
      .sort((a, b) => a - b)[0];

    if (!earliestDepStart) return null;

    const slack = ganttUtils.calculateDuration(
      task.endDate,
      new Date(earliestDepStart)
    );

    return Math.max(0, slack);
  },

  /**
   * Check if a task is on the critical path
   * @param tasks - All tasks
   * @param taskId - Task ID to check
   * @returns True if task is on critical path
   */
  isOnCriticalPath: (tasks: Task[], taskId: string): boolean => {
    const criticalPath = ganttUtils.calculateCriticalPath(tasks);
    return criticalPath.includes(taskId);
  },

  /**
   * Auto-schedule dependent tasks when a task changes
   * v0.13.3: Now takes optional daysDelta to shift dependents by same amount (preserves gap)
   * @param tasks - All tasks
   * @param changedTaskId - Task that was changed
   * @param daysDelta - Optional: days the parent moved (for preserving relative gaps)
   * @returns Updated tasks with rescheduled dependencies
   */
  autoScheduleDependents: (tasks: Task[], changedTaskId: string, daysDelta?: number): Task[] => {
    const changedTask = ganttUtils.findTaskById(tasks, changedTaskId);
    if (!changedTask || !changedTask.endDate) return tasks;

    const dependents = ganttUtils.getDependentTasks(tasks, changedTaskId);
    if (dependents.length === 0) return tasks;

    let updatedTasks = [...tasks];

    // For each dependent, shift by the same daysDelta (preserves relative gap)
    for (const dependent of dependents) {
      if (!dependent.startDate || !dependent.endDate) continue;

      // Calculate duration of dependent task
      const duration = ganttUtils.calculateDuration(dependent.startDate, dependent.endDate);

      let newStartDate: Date;

      if (daysDelta !== undefined) {
        // v0.13.3: Shift by same delta as parent (preserves relative gap)
        newStartDate = new Date(dependent.startDate);
        newStartDate.setDate(newStartDate.getDate() + daysDelta);
      } else {
        // Legacy behavior: New start date = changed task end date + 1 day
        newStartDate = new Date(changedTask.endDate);
        newStartDate.setDate(newStartDate.getDate() + 1);
      }

      // Calculate new end date based on duration
      const newEndDate = ganttUtils.calculateEndDate(newStartDate, duration);

      // Update the task recursively in nested structure
      const updateTaskRec = (tasks: Task[]): Task[] => {
        return tasks.map(t => {
          if (t.id === dependent.id) {
            return { ...t, startDate: newStartDate, endDate: newEndDate };
          }
          if (t.subtasks) {
            return { ...t, subtasks: updateTaskRec(t.subtasks) };
          }
          return t;
        });
      };

      updatedTasks = updateTaskRec(updatedTasks);

      // Recursively update dependents of this task (pass same delta)
      updatedTasks = ganttUtils.autoScheduleDependents(updatedTasks, dependent.id, daysDelta);
    }

    return updatedTasks;
  },

  /**
   * v0.13.0: Calculate cascade preview positions for dependent tasks during drag
   * v0.13.3: FIXED - Preview shows ONLY actual movement needed (keeps same relative gap)
   * Dependents shift by the same daysDelta as their parent, preserving the original gap
   * @param tasks - All tasks (nested structure)
   * @param draggedTaskId - Task being dragged
   * @param daysDelta - How many days the dragged task is being moved
   * @param flatTasks - Flattened task list with row indices
   * @param timelineStartDate - Start date of the timeline
   * @param scaledDayWidth - Width of one day in pixels (already includes zoom: dayWidth * zoom)
   * @param rowHeight - Height of each row
   * @param headerHeight - Height of the header
   * @returns Array of DependentTaskPreview objects
   */
  calculateCascadePreview: (
    tasks: Task[],
    draggedTaskId: string,
    daysDelta: number,
    flatTasks: Task[],
    timelineStartDate: Date,
    scaledDayWidth: number, // Note: This already includes zoom (dayWidth * zoom)
    rowHeight: number,
    headerHeight: number
  ): Array<{
    taskId: string;
    taskName: string;
    originalX: number;
    previewX: number;
    width: number;
    y: number;
    rowIndex: number;
    daysDelta: number;
    color?: string;
  }> => {
    if (daysDelta === 0) return [];

    const previews: Array<{
      taskId: string;
      taskName: string;
      originalX: number;
      previewX: number;
      width: number;
      y: number;
      rowIndex: number;
      daysDelta: number;
      color?: string;
    }> = [];

    const rangeStart = timelineStartDate.getTime();
    const msPerDay = 1000 * 60 * 60 * 24;

    // Get dragged task info
    const draggedTask = ganttUtils.findTaskById(tasks, draggedTaskId);
    if (!draggedTask || !draggedTask.endDate) return [];

    // v0.13.3: Dependents move by the SAME daysDelta as their parent
    // This preserves the relative gap between tasks, making preview accurate
    const getAffectedTasks = (parentTaskId: string, parentDelta: number, visited = new Set<string>()): void => {
      if (visited.has(parentTaskId)) return; // Prevent infinite loops
      visited.add(parentTaskId);

      const dependents = ganttUtils.getDependentTasks(tasks, parentTaskId);

      for (const dependent of dependents) {
        if (!dependent.startDate || !dependent.endDate) continue;

        // Find row index in flattened list
        const rowIndex = flatTasks.findIndex(t => t.id === dependent.id);
        if (rowIndex === -1) continue;

        // Calculate task duration and current position
        const taskStart = dependent.startDate.getTime();
        const taskEnd = dependent.endDate.getTime();
        const durationDays = (taskEnd - taskStart) / msPerDay;

        // Original X position
        const daysFromStart = (taskStart - rangeStart) / msPerDay;
        const originalX = daysFromStart * scaledDayWidth;

        // v0.13.3: Preview X = Original X + daysDelta (same shift as parent)
        // This shows the task moving exactly with its parent, preserving the gap
        const previewX = originalX + (parentDelta * scaledDayWidth);

        // Width calculation - minimum 1 day width for visibility
        const width = Math.max(durationDays * scaledDayWidth, scaledDayWidth);

        // Y position - same formula as Timeline.tsx: HEADER_HEIGHT + index * ROW_HEIGHT + 12
        const y = headerHeight + rowIndex * rowHeight + 12;

        previews.push({
          taskId: dependent.id,
          taskName: dependent.name,
          originalX,
          previewX,
          width,
          y,
          rowIndex,
          daysDelta: parentDelta,
          color: dependent.color,
        });

        // Recursively get dependents of this task (same delta propagates)
        getAffectedTasks(dependent.id, parentDelta, visited);
      }
    };

    getAffectedTasks(draggedTaskId, daysDelta);

    return previews;
  },

  /**
   * 🚀 KILLER FEATURE #3: Split a task (create GAP in the middle, like Bryntum/DHTMLX)
   * Same task, but work is paused for some days then continues
   * Example: Jan 1-10 → Split at Jan 5 with 3 day gap → Jan 1-4 [GAP] Jan 8-13
   * @param tasks - All tasks
   * @param taskId - Task to split
   * @param splitDate - Date where gap starts
   * @param gapDays - Number of days to pause (default: 3)
   * @returns Updated tasks with split segments
   */
  splitTask: (tasks: Task[], taskId: string, splitDate: Date, gapDays = 3): Task[] => {
    const task = ganttUtils.findTaskById(tasks, taskId);
    if (!task || !task.startDate || !task.endDate) return tasks;

    // Validate split date is within task range
    if (splitDate <= task.startDate || splitDate >= task.endDate) {
      console.warn('Split date must be between task start and end dates');
      return tasks;
    }

    // Calculate the split point (end of first segment)
    const firstSegmentEnd = new Date(splitDate);
    firstSegmentEnd.setDate(firstSegmentEnd.getDate() - 1); // Day before split

    // Calculate second segment start (after gap)
    const secondSegmentStart = new Date(splitDate);
    secondSegmentStart.setDate(secondSegmentStart.getDate() + gapDays);

    // Calculate new end date (original end + gap days to preserve work duration)
    const newEndDate = new Date(task.endDate);
    newEndDate.setDate(newEndDate.getDate() + gapDays);

    // Create segments array
    const segments: TaskSegment[] = [
      {
        startDate: new Date(task.startDate),
        endDate: firstSegmentEnd,
      },
      {
        startDate: secondSegmentStart,
        endDate: newEndDate,
      },
    ];

    // Update task with segments
    const updateTaskRec = (tasksList: Task[]): Task[] => {
      return tasksList.map(t => {
        if (t.id === task.id) {
          return {
            ...t,
            endDate: newEndDate, // Overall end date extends
            segments, // Add segments to show gaps
          };
        }
        if (t.subtasks) {
          return { ...t, subtasks: updateTaskRec(t.subtasks) };
        }
        return t;
      });
    };

    return updateTaskRec(tasks);
  },
};
