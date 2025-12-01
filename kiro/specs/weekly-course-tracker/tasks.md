# Implementation Plan

**Current Status:** Project structure, development environment, test generators, and validation utilities are complete. Ready to implement core domain models.

- [x] 1. Set up project structure and development environment
  - Initialize TypeScript project with tsconfig.json
  - Install dependencies: TypeScript, fast-check for property-based testing, and a test framework (Jest or Vitest)
  - Create directory structure: src/models, src/services, src/storage, src/utils, src/ui
  - Set up build and test scripts in package.json
  - _Requirements: All_

- [x] 2. Implement test infrastructure
  - [x] 2.1 Implement fast-check generators
    - Create arbitraryCourse() generator in src/utils/testGenerators.ts
    - Create arbitraryTask() generator with realistic deadlines
    - Create arbitraryWeekNumber() generator (1-53)
    - Create arbitraryWhitespaceString() generator
    - Create arbitraryPastDate() and arbitraryFutureDate() generators
    - _Requirements: All (testing infrastructure)_

- [x] 3. Implement core domain models and types





  - [x] 3.1 Create type definitions and interfaces











    - Define TypeScript interfaces for Course, Task, WeekView, WeeklyStatistics, DepartmentStats, and CourseStats in src/models/types.ts
    - Define Result type for error handling in src/models/types.ts
    - Define error types: ValidationError, StorageError, NotFoundError in src/models/errors.ts
    - _Requirements: 1.1, 1.3, 2.1, 2.3, 6.1, 6.2, 6.3_
  
  - [x] 3.2 Implement validation utilities
    - Create validation functions for non-empty strings (trimming whitespace) in src/utils/validation.ts
    - Create validation functions for valid dates and future dates in src/utils/validation.ts
    - Create UUID generation utility in src/utils/uuid.ts
    - _Requirements: 1.2, 2.2_

  - [x] 3.3 Write property test for validation utilities


    - **Property 2: Empty course name rejection**
    - **Validates: Requirements 1.2**

  - [x] 3.4 Write property test for task validation


    - **Property 6: Task validation**
    - **Validates: Requirements 2.2**




- [x] 4. Implement week calculation utilities







-
-

  - [x] 4.1 Create ISO 8601 week calculation functions

















    - Implement getWeekNumber(date: Date): { weekNumber: number, year: number } in src/utils/weekCalculations.ts
    - Implement getWeekBounds(weekNumber: number, year: number): { startDate: Date, endDate: Date } in src/utils/weekCalculations.ts
    - Implement isDateInWeek(date: Date, weekNumber: number, year: number): boolean in src/utils/weekCalculations.ts
    --_Requirements: 2.3, 2.4, 4.1, 4.2, 5.4_

  - [x] 4.2 Write unit tests for week calculation edge cases








  - [ ] 4.2 Write unit tests for week calculation edge cases





    - Test week boundaries (Monday/Sunday transitions)
    - Test year boundaries (week 52/53 to week 1)
    - Test first Thursday rule for week 1
    - _Requirements: 2.3, 4.1_






-

- [x] 5. Implement StorageService






-

  - [x] 5.1 Create StorageService with localStorage adapter















    - Implement save, load, delete, and clear methods in src/storage/StorageService.ts
    - Handle serialization/deserialization of dates (ISO 8601)
    - Implement error handling for storage quota and corrupted data





    --_Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
-

  - [x] 5.2 Write property test for storage round-trip













    - **Property 22: Storage round-trip**
    --**Validates: Requirements 8.1, 8.2**

  - [x] 5.3 Write property test for storage validation
















    - **Property 23: Storage validation**
    --**Validates: Requirements 8.3**
 

  - [x] 5.4 Write property test for corrupted data handling
















    - **Property 24: Corrupted data handling**

    - **Validates: Requirements 8.5**



- [x] 6. Implement CourseService







 

  - [x] 6.1 Create CourseService with CRUD operations











    - Implement createCourse with validation and duplicate checking in src/services/CourseService.ts
    - Implement getCourse, getAllCourses, getCoursesByDepartment
    - Implement updateCourse and deleteCourse
    - Implement courseExists helper method
    - Integrate with StorageService for persistence

    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 7.2, 7.4, 7.5_
  - [x] 6.2 Write property test for course creation







    - **Property 1: Course creation with valid data**
    - **Validates: Requirements 1.1, 1.3**
  - [x] 6.3 Write property test for course grouping by department






    - **Property 3: Course grouping by department**
    --**Validates: Requirements 1.4**


  - [x] 6.4 Write property test for duplicate course prevention




    - **Property 4: Duplicate course prevention**
    --**Validates: Requirements 1.5**

  - [x] 6.5 Write property test for course update persistence





    - **Property 18: Course update persistence**
    --**Validates: Requirements 7.1, 7.5**

  - [x] 6.6 Write property test for course deletion





    - **Property 19: Course deletion**
    --**Validates: Requirements 7.2**

  - [x] 6.7 Write property test for course list with task counts





    - **Property 21: Course list with task counts**
    - **Validates: Requirements 7.4**
- [x] 7. Implement TaskService











- [ ] 7. Implement TaskService

  - [x] 7.1 Create TaskService with CRUD operations


    - Implement createTask with validation in src/services/TaskService.ts
    - Implement getTask, getAllTasks, getTasksByCourse, getTasksForWeek
    - Implement updateTask and deleteTask
    - Implement markComplete and markIncomplete
    - Implement getOverdueTasks
    - Integrate with StorageService for persistence
    - Use week calculation utilities for task organization
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.4, 4.1, 5.1, 5.2, 5.4, 5.5_
  - [x] 7.2 Write property test for task creation and week association







    - **Property 5: Task creation and week association**
    - **Validates: Requirements 2.1, 2.3**
  - [x] 7.3 Write property test for week view filtering







    - **Property 7: Week view filtering**
    - **Validates: Requirements 2.4, 4.1**
  - [x] 7.4 Write property test for overdue task detection





    - **Property 8: Overdue task detection**
    - **Validates: Requirements 2.5**
  - [x] 7.5 Write property test for task completion state change




    - **Property 9: Task completion state change**
    - **Validates: Requirements 3.1, 3.2**
  - [x] 7.6 Write property test for completion round-trip




    - **Property 10: Completion round-trip**
    - **Validates: Requirements 3.4**
  - [x] 7.7 Write property test for task update persistence




    - **Property 13: Task update persistence**
    - **Validates: Requirements 5.1**
  - [x] 7.8 Write property test for task deletion




    - **Property 14: Task deletion**
    - **Validates: Requirements 5.2**
  - [x] 7.9 Write property test for deadline change triggers week reassignment




    - **Property 15: Deadline change triggers week reassignment**
    - **Validates: Requirements 5.4**
  - [x] 7.10 Write property test for non-existent task error handling




    - **Property 16: Non-existent task error handling**
    - **Validates: Requirements 5.5**
-

- [x] 8. Implement cascade deletion logic for courses with tasks



  - [x] 8.1 Add cascade deletion or reassignment strategy to CourseService


    - Implement deleteCourseWithTasks method that prompts for strategy
    - Support cascade delete (remove all associated tasks)
    - Support reassignment (move tasks to another course)
    - Update deleteCourse to check for associated tasks
    - _Requirements: 7.2, 7.3_
  - [x] 8.2 Write property test for cascade deletion or reassignment








    - **Property 20: Cascade deletion or reassignment**
    - **Validates: Requirements 7.3**
-

- [x] 9. Implement StatisticsService



  - [x] 9.1 Create StatisticsService for progress tracking


    - Implement getWeeklyStatistics with task counting and percentage calculation in src/services/StatisticsService.ts
    - Implement getCourseProgress for individual course statistics
    - Implement getDepartmentProgress for department-level statistics
    - Calculate completion percentages, overdue counts, and breakdowns
    - _Requirements: 3.5, 6.1, 6.2, 6.3, 6.4, 6.5_
  - [x] 9.2 Write property test for weekly progress calculation




    - **Property 11: Weekly progress calculation**
    --**Validates: Requirements 3.5, 6.2**

  - [x] 9.3 Write property test for weekly statistics accuracy





    - **Property 17: Weekly statistics accuracy**
    - **Validates: Requirements 6.1, 6.3, 6.5**
-

- [x] 10. Implement TrackerService as main application coordinator



  - [x] 10.1 Create TrackerService to coordinate all services


    - Initialize and manage CourseService, TaskService, and StatisticsService in src/services/TrackerService.ts
    - Provide unified API for UI layer
    - Handle cross-service operations (e.g., course deletion with tasks)
    - Implement application initialization and data loading
    - _Requirements: All_
  - [x] 10.2 Write integration tests for TrackerService





    - Test complete workflows: create course → add tasks → mark complete → view statistics
    - Test error scenarios across service boundaries
    - _Requirements: All_
-

- [x] 11. Checkpoint - Ensure all core services and tests pass




  - Ensure all tests pass, ask the user if questions arise
  - _Requirements: All_

- [x] 12. Implement UI components




  - [x] 12.1 Create WeeklyView component


    - Display tasks organized by day and course for selected week in src/ui/WeeklyView.ts
    - Highlight current day when viewing current week
    - Show task description, course name, department, and deadline
    - Support navigation between weeks
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [x] 12.2 Write property test for task display completeness











    - **Property 12: Task display completeness**
    - **Validates: Requirements 4.4**
  - [x] 12.3 Create CourseManagement component


    - Display all courses grouped by department in src/ui/CourseManagement.ts
    - Support adding new courses with validation
    - Support editing course name and department
    - Support deleting courses with confirmation
    - Show task count for each course
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x] 12.4 Create TaskManagement component


    - Support adding new tasks with course selection and deadline in src/ui/TaskManagement.ts
    - Support editing task description and deadline
    - Support deleting tasks
    - Support marking tasks as complete/incomplete
    - Visually distinguish completed tasks from incomplete tasks
    - _Requirements: 2.1, 2.2, 3.1, 3.3, 3.4, 5.1, 5.2, 5.3, 5.4_
  - [x] 12.5 Create Statistics component


    - Display weekly statistics: total tasks, completed tasks, completion percentage in src/ui/Statistics.ts
    - Show overdue task count and highlight overdue tasks
    - Display breakdowns by course and department
    - _Requirements: 6.1, 6.2, 6.3, 6.5_
  - [x] 12.6 Create main application shell


    - Set up routing or tab navigation between views in src/ui/App.ts
    - Initialize TrackerService on application start
    - Handle loading states and errors
    - Implement responsive layout
    - _Requirements: All_
-

- [x] 13. Final checkpoint - Ensure all tests pass









  - Ensure all tests pass, ask the user if questions arise
  - _Requirements: All_
