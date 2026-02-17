import React from 'react';
import { Task, TaskStatus } from '../types';
import TaskCard from './TaskCard';
import styles from './Board.module.css';

interface BoardProps {
  tasks: Task[];
}

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'PendingProductDirector', label: 'Pending Product' },
  { status: 'PendingArchitect', label: 'Pending Arch' },
  { status: 'PendingUiUxExpert', label: 'Pending UX' },
  { status: 'PendingSecurityOfficer', label: 'Pending Security' },
  { status: 'NeedsRefinement', label: 'Needs Refinement' },
  { status: 'ReadyForDevelopment', label: 'Ready' },
  { status: 'InProgress', label: 'In Progress' },
  { status: 'InReview', label: 'In Review' },
  { status: 'InQA', label: 'In QA' },
  { status: 'NeedsChanges', label: 'Needs Changes' },
  { status: 'Done', label: 'Done' },
];

const Board: React.FC<BoardProps> = ({ tasks }) => {
  const tasksByStatus = React.useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {} as any;
    COLUMNS.forEach(col => {
      grouped[col.status] = [];
    });
    
    tasks.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });
    
    return grouped;
  }, [tasks]);

  return (
    <div className={styles.boardContainer} role="region" aria-label="Task board">
      <div className={styles.board}>
        {COLUMNS.map(column => {
          const columnTasks = tasksByStatus[column.status] || [];
          return (
            <div key={column.status} className={styles.column} role="list" aria-label={column.label}>
              <div className={styles.columnHeader}>
                <span className={styles.columnTitle}>{column.label}</span>
                <span className={styles.columnCount}>{columnTasks.length}</span>
              </div>
              <div className={styles.columnBody}>
                {columnTasks.map(task => (
                  <TaskCard key={task.taskId} task={task} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Board;
