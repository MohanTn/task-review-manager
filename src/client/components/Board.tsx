import React, { useState, useCallback } from 'react';
import { Task, TaskStatus } from '../types';
import { useAppState } from '../state/AppState';
import { APIClient } from '../api/client';
import TaskCard from './TaskCard';
import TaskDetailModal from './TaskDetailModal';
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
  const { currentRepo, currentFeatureSlug } = useAppState();
  const [modalTask, setModalTask] = useState<Task | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleTaskClick = useCallback(async (taskId: string) => {
    setModalOpen(true);
    setModalLoading(true);
    setModalError(null);
    setModalTask(null);
    try {
      const fullTask = await APIClient.getFullTask(currentRepo, currentFeatureSlug, taskId);
      setModalTask(fullTask);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : String(err));
    } finally {
      setModalLoading(false);
    }
  }, [currentRepo, currentFeatureSlug]);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setModalTask(null);
    setModalError(null);
  }, []);

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
    <>
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
                    <TaskCard key={task.taskId} task={task} onTaskClick={handleTaskClick} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modalOpen && (
        <TaskDetailModal
          task={modalTask}
          loading={modalLoading}
          error={modalError}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};

export default Board;
