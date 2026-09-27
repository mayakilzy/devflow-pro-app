# DevFlow Pro

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-black?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)

A comprehensive developer productivity platform that brings together all the tools you need in one place. DevFlow Pro extends DevFlow Lite with additional features for enhanced team collaboration and productivity.

## Features

- **Code Snippet Manager**: Save, organize, and search your code snippets with syntax highlighting
- **Bug Tracker**: Track and visualize bugs with severity levels and statistics
- **Sprint Kanban Board**: Drag-and-drop interface for agile sprint planning
- **Team Mood Tracker**: Monitor team morale with daily check-ins and mood trends
- **Documentation Finder**: Search and bookmark technical documentation
- **CI/CD Monitor**: Track build statuses and deployment progress
- **Knowledge Base**: Create and organize technical documentation
- **Dashboard**: Overview of all modules with quick stats and recent activity

## Tech Stack

- **Frontend**: Next.js 16, React 18, TypeScript
- **Styling**: Tailwind CSS with dark mode
- **Charts**: Recharts
- **Drag & Drop**: @hello-pangea/dnd
- **Markdown**: marked
- **Icons**: Lucide React
- **Dates**: date-fns

## Quick Start

1. Clone the repository
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Architecture

DevFlow Pro follows a single-file architecture pattern where all components, utilities, and state management are contained within `src/app/page.tsx`. This approach simplifies the codebase and makes it easier to understand and maintain.

All data is persisted in localStorage and automatically saved on changes. The app uses React 19's lazy useState pattern for efficient data loading.

## Keyboard Shortcuts

- `Cmd/Ctrl + K`: Open command palette
- `Cmd/Ctrl + N`: Create new item (context-dependent)
- `Esc`: Close modals and dialogs

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.