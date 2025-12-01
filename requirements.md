# Requirements Document

## Introduction

The Weekly Course Tracker is a system designed to help college students organize and track their weekly academic activities across multiple courses and departments. The system enables students to manage assignments, deadlines, class schedules, and course-related tasks in a centralized weekly view, helping them stay organized and on top of their academic responsibilities.

## Glossary

- **Student**: A college or university student who uses the system to track their academic activities
- **Course**: An academic class or subject that a student is enrolled in during a semester
- **Department**: An academic division or faculty unit that offers courses (e.g., Computer Science, Mathematics, Biology)
- **Weekly Tracker**: The main interface displaying all course activities organized by week
- **Task**: An academic activity such as an assignment, reading, project, or exam preparation
- **Deadline**: A specific date and time by which a task must be completed
- **System**: The Weekly Course Tracker application

## Requirements

### Requirement 1

**User Story:** As a student, I want to add courses to my tracker with department information, so that I can organize my academic workload by subject area.

#### Acceptance Criteria

1. WHEN a student provides a course name and department, THE System SHALL create a new course entry with the specified information
2. WHEN a student adds a course, THE System SHALL validate that the course name is not empty
3. WHEN a course is created, THE System SHALL assign a unique identifier to the course
4. WHEN a student views their courses, THE System SHALL display all courses grouped by department
5. WHEN a student attempts to add a duplicate course name within the same department, THE System SHALL prevent the addition and notify the student

### Requirement 2

**User Story:** As a student, I want to add weekly tasks for each course, so that I can track assignments, readings, and other course-related activities.

#### Acceptance Criteria

1. WHEN a student creates a task with a description, course, and deadline, THE System SHALL add the task to the weekly tracker
2. WHEN a student creates a task, THE System SHALL validate that the task description is not empty and the deadline is a valid future date
3. WHEN a task is added, THE System SHALL associate the task with the specified course and week based on the deadline
4. WHEN a student views a week, THE System SHALL display all tasks for that week organized by course
5. WHEN a task deadline passes, THE System SHALL mark the task as overdue if not completed

### Requirement 3

**User Story:** As a student, I want to mark tasks as complete, so that I can track my progress throughout the week.

#### Acceptance Criteria

1. WHEN a student marks a task as complete, THE System SHALL update the task status to completed
2. WHEN a task is marked complete, THE System SHALL record the completion timestamp
3. WHEN a student views completed tasks, THE System SHALL visually distinguish them from incomplete tasks
4. WHEN a student marks a completed task as incomplete, THE System SHALL restore the task to its active state
5. WHEN calculating weekly progress, THE System SHALL compute the percentage of completed tasks for each course

### Requirement 4

**User Story:** As a student, I want to view my weekly schedule, so that I can see all my tasks and deadlines at a glance.

#### Acceptance Criteria

1. WHEN a student selects a week, THE System SHALL display all tasks scheduled for that week
2. WHEN displaying the weekly view, THE System SHALL organize tasks by day and course
3. WHEN a student navigates between weeks, THE System SHALL update the display to show the selected week's tasks
4. WHEN displaying tasks, THE System SHALL show the task description, course name, department, and deadline
5. WHEN the current week is displayed, THE System SHALL highlight today's date

### Requirement 5

**User Story:** As a student, I want to edit and delete tasks, so that I can keep my tracker accurate when plans change.

#### Acceptance Criteria

1. WHEN a student modifies a task description or deadline, THE System SHALL update the task with the new information
2. WHEN a student deletes a task, THE System SHALL remove the task from the weekly tracker
3. WHEN a task is edited, THE System SHALL validate the new information using the same rules as task creation
4. WHEN a task deadline is changed, THE System SHALL move the task to the appropriate week
5. WHEN a student attempts to edit a non-existent task, THE System SHALL handle the error gracefully

### Requirement 6

**User Story:** As a student, I want to see statistics about my weekly progress, so that I can understand my productivity patterns.

#### Acceptance Criteria

1. WHEN a student views weekly statistics, THE System SHALL display the total number of tasks for the week
2. WHEN displaying statistics, THE System SHALL show the number of completed tasks and the completion percentage
3. WHEN calculating statistics, THE System SHALL break down task counts by course and department
4. WHEN a week ends, THE System SHALL preserve historical statistics for that week
5. WHEN displaying overdue tasks, THE System SHALL count and highlight tasks that passed their deadline without completion

### Requirement 7

**User Story:** As a student, I want to manage my course list, so that I can update my tracker when I add or drop courses.

#### Acceptance Criteria

1. WHEN a student edits a course name or department, THE System SHALL update the course information
2. WHEN a student deletes a course, THE System SHALL remove the course and prompt for confirmation
3. WHEN a course with associated tasks is deleted, THE System SHALL either delete all associated tasks or reassign them based on student preference
4. WHEN a student views the course list, THE System SHALL display all active courses with their department and task count
5. WHEN course information is updated, THE System SHALL reflect changes in all weekly views

### Requirement 8

**User Story:** As a student, I want my tracker data to persist, so that I don't lose my information when I close the application.

#### Acceptance Criteria

1. WHEN a student adds or modifies data, THE System SHALL save changes to persistent storage immediately
2. WHEN the application starts, THE System SHALL load all saved courses, tasks, and settings
3. WHEN data is saved, THE System SHALL validate data integrity before writing to storage
4. WHEN storage operations fail, THE System SHALL notify the student and attempt recovery
5. WHEN data is loaded, THE System SHALL handle corrupted or invalid data gracefully without crashing
