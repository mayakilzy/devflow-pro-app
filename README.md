# DevFlow Pro

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

A comprehensive developer productivity platform that brings together all the tools you need in one place. DevFlow Pro extends DevFlow Lite with 7 powerful features designed to streamline your development workflow.

## Features

- **Code Snippet Manager**: Save, organize, and search your code snippets with syntax highlighting and markdown support.
- **Bug Tracker**: Track bugs with severity levels, categories, and visualize statistics with charts.
- **Sprint Kanban Board**: Drag-and-drop interface for agile sprint planning with velocity tracking.
- **Team Mood Tracker**: Monitor team morale with daily check-ins and mood trend analysis.
- **Documentation Finder**: Search and bookmark library/API documentation with simulated toolkit integration.
- **CI/CD Monitor**: Track build statuses across projects with real-time updates and alerts.
- **Knowledge Base**: Create and organize knowledge articles with markdown support and text search.

## Tech Stack

- **Frontend**: Next.js 16, React 18, TypeScript
- **Styling**: Tailwind CSS 3 with dark mode
- **Charts**: Recharts
- **Drag & Drop**: @hello-pangea/dnd
- **Markdown**: marked
- **Icons**: Lucide React
- **Dates**: date-fns
- **Audio**: Web Audio API

## Quick Start

1. Clone the repository
bash
git clone https://github.com/yourusername/devflow-pro-app.git
cd devflow-pro-app


2. Install dependencies
bash
npm install


3. Run the development server
bash
npm run dev


4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Architecture

DevFlow Pro follows a single-file architecture pattern where all components, utilities, and state management are contained within `src/app/page.tsx`. This approach ensures simplicity and maintainability while providing a complete development experience.

- **State Management**: React's useState with localStorage persistence
- **Command Palette**: Global keyboard shortcuts (Cmd/Ctrl+K)
- **Toast Notifications**: Custom notification system with sound alerts
- **Dark Mode**: System-aware theme switching

## Data Persistence

All data is stored in localStorage under the "devflow-pro" key with auto-save functionality. You can export/import your data via the Settings screen.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Charts powered by [Recharts](https://recharts.org/)
- Icons from [Lucide](https://lucide.dev/)

---

Made with ❤️ by the DevFlow Team