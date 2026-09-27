# DevFlow Pro

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.0-black.svg)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.3-cyan.svg)](https://tailwindcss.com/)

A comprehensive developer productivity platform that extends DevFlow Lite with 7 powerful features to streamline your development workflow.

## Features

- **Code Snippet Manager**: Save, organize, and search code snippets with syntax highlighting and markdown support
- **Bug Tracker**: Track bugs with severity levels, statistics charts, and real-time notifications
- **Sprint Kanban Board**: Drag-and-drop task management with velocity tracking
- **Team Mood Tracker**: Daily mood check-ins with trends and analytics
- **Documentation Finder**: Search and bookmark technical documentation
- **CI/CD Monitor**: Real-time build status tracking with notifications
- **Knowledge Base**: Create and organize technical articles with markdown support

## Tech Stack

- **Frontend**: Next.js 16, React 18, TypeScript
- **Styling**: Tailwind CSS with dark mode
- **Charts**: Recharts
- **Icons**: Lucide React
- **Drag & Drop**: @hello-pangea/dnd
- **Markdown**: Marked
- **Dates**: date-fns
- **Audio**: Web Audio API

## Quick Start

1. Clone the repository
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Data Persistence

All data is stored in localStorage and persists between sessions. The app includes:

- Auto-save functionality (debounced 500ms)
- Export/import data as JSON
- Reset data option

## Keyboard Shortcuts

- `Cmd/Ctrl + K`: Open command palette
- `Cmd/Ctrl + N`: Create new item
- `Esc`: Close modals/dialogs

## License

MIT License - see [LICENSE](LICENSE) file for details.