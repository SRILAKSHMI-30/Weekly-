# Services Layer

This directory contains the business logic services for the Weekly Course Tracker application.

## Services

### TrackerService

The main application coordinator that provides a unified API for all operations. It initializes and manages all other services.

**Key Features:**
- Coordinates CourseService, TaskService, and StatisticsService
- Provides unified API for UI layer
- Handles cross-service operations (e.g., course deletion with tasks)
- Manages application initialization and data loading

**Usage:**
```typescript
import { TrackerService } from './services/TrackerService.js';

const trackerService = new TrackerService();
trackerService.initialize();

// Create a course
const result = trackerService.createCourse('CS101', 'Computer Science');

// Create a task
if (result.success) {
  trackerService.createTask(result.value.id, 'Assignment 1', new Date('2024-12-31'));
}
```

### TrackerServiceAdapter

Adapts the synchronous TrackerService to the async interface expected by UI components. This adapter wraps TrackerService methods in Promises for compatibility with the UI layer.

**Usage:**
```typescript
import { TrackerServiceAdapter } from './services/TrackerServiceAdapter.js';

const service = new TrackerServiceAdapter();
await service.initialize();

// All methods return Promises
const result = await service.createCourse('CS101', 'Computer Science');
```

### CourseService

Manages CRUD operations for courses with validation and duplicate checking.

**Features:**
- Create, read, update, delete courses
- Validate course names and departments
- Prevent duplicate courses
- Group courses by department
- Handle cascade deletion with tasks

### TaskService

Manages CRUD operations for tasks with validation and week association.

**Features:**
- Create, read, update, delete tasks
- Validate task descriptions and deadlines
- Associate tasks with courses and weeks
- Mark tasks as complete/incomplete
- Track overdue tasks

### StatisticsService

Provides progress tracking and statistics calculation.

**Features:**
- Calculate weekly statistics
- Track course progress
- Track department progress
- Count completed vs total tasks
- Calculate completion percentages

### StorageService

Provides persistent storage using localStorage with date serialization.

**Features:**
- Save/load data to localStorage
- Handle date serialization/deserialization
- Error handling for storage quota and corrupted data
- Graceful recovery from storage failures

## Architecture

```
TrackerService (Main Coordinator)
├── CourseService (Course Management)
│   └── StorageService (Persistence)
├── TaskService (Task Management)
│   └── StorageService (Persistence)
└── StatisticsService (Statistics & Progress)
    ├── CourseService (Course Data)
    └── TaskService (Task Data)
```

## Error Handling

All services use the `Result<T, E>` type for operations that can fail:

```typescript
type Result<T, E> = 
  | { success: true; value: T }
  | { success: false; error: E };
```

This allows for explicit error handling without exceptions:

```typescript
const result = trackerService.createCourse('CS101', 'Computer Science');
if (result.success) {
  console.log('Course created:', result.value);
} else {
  console.error('Error:', result.error.message);
}
```

## Testing

All services have comprehensive test coverage including:
- Unit tests for individual methods
- Property-based tests for correctness properties
- Integration tests for cross-service operations

Run tests with:
```bash
npm test
```
