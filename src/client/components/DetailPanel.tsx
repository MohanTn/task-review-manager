import React from 'react';
import { Task, Feature, AcceptanceCriterion, TestScenario } from '../types';
import styles from './DetailPanel.module.css';

interface DetailPanelProps {
  tasks: Task[];
  feature: Feature | null;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ tasks, feature }) => {
  // Feature-level acceptance criteria
  const featureAcceptanceCriteria: AcceptanceCriterion[] = feature?.acceptanceCriteria || [];

  // Aggregate all acceptance criteria from tasks
  const taskAcceptanceCriteria: AcceptanceCriterion[] = tasks.flatMap(
    task => task.acceptanceCriteria || []
  );

  // Feature-level test scenarios
  const featureTestScenarios: TestScenario[] = feature?.testScenarios || [];

  // Aggregate all test scenarios from tasks
  const taskTestScenarios: TestScenario[] = tasks.flatMap(
    task => task.testScenarios || []
  );

  // Combine and group AC by priority
  const allAcceptanceCriteria = [...featureAcceptanceCriteria, ...taskAcceptanceCriteria];
  const acByPriority = {
    'Must Have': allAcceptanceCriteria.filter(ac => ac.priority === 'Must Have'),
    'Should Have': allAcceptanceCriteria.filter(ac => ac.priority === 'Should Have'),
    'Could Have': allAcceptanceCriteria.filter(ac => ac.priority === 'Could Have'),
  };

  // Combine and group test scenarios by priority
  const allTestScenarios = [...featureTestScenarios, ...taskTestScenarios];
  const tsByPriority = {
    'P0': allTestScenarios.filter(ts => ts.priority === 'P0'),
    'P1': allTestScenarios.filter(ts => ts.priority === 'P1'),
    'P2': allTestScenarios.filter(ts => ts.priority === 'P2'),
    'P3': allTestScenarios.filter(ts => ts.priority === 'P3'),
  };

  return (
    <div className={styles.detailPanel} role="region" aria-label="Feature details">
      <div className={styles.detailContent}>
        <h2>Feature Details</h2>
        
        {/* Feature Description */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Description</h3>
          <div className={styles.description}>
            {feature?.description || 'No description provided'}
          </div>
        </section>

        {/* Acceptance Criteria */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            Acceptance Criteria
            <span className={styles.count}>({allAcceptanceCriteria.length})</span>
          </h3>
          
          {allAcceptanceCriteria.length === 0 ? (
            <p className={styles.emptyText}>No acceptance criteria defined</p>
          ) : (
            <div className={styles.acContainer}>
              {Object.entries(acByPriority).map(([priority, criteria]) => {
                if (criteria.length === 0) return null;
                return (
                  <div key={priority} className={styles.priorityGroup}>
                    <h4 className={styles.priorityTitle}>{priority}</h4>
                    <ul className={styles.criteriaList}>
                      {criteria.map((ac) => (
                        <li key={ac.id} className={styles.criteriaItem}>
                          <input
                            type="checkbox"
                            checked={ac.verified}
                            readOnly
                            className={styles.checkbox}
                          />
                          <span className={ac.verified ? styles.verified : ''}>
                            {ac.criterion}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Test Scenarios */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            Test Scenarios
            <span className={styles.count}>({allTestScenarios.length})</span>
          </h3>
          
          {allTestScenarios.length === 0 ? (
            <p className={styles.emptyText}>No test scenarios defined</p>
          ) : (
            <div className={styles.tsContainer}>
              {Object.entries(tsByPriority).map(([priority, scenarios]) => {
                if (scenarios.length === 0) return null;
                return (
                  <div key={priority} className={styles.priorityGroup}>
                    <h4 className={styles.priorityTitle}>Priority {priority}</h4>
                    <div className={styles.scenariosList}>
                      {scenarios.map((ts) => (
                        <div key={ts.id} className={styles.scenarioItem}>
                          <div className={styles.scenarioHeader}>
                            <span className={styles.scenarioTitle}>{ts.title}</span>
                            {ts.manualOnly && (
                              <span className={styles.badge}>Manual Only</span>
                            )}
                          </div>
                          <p className={styles.scenarioDescription}>
                            {ts.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Task Summary */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Task Summary</h3>
          <p>Total Tasks: {tasks.length}</p>
        </section>
      </div>
    </div>
  );
};

export default DetailPanel;
