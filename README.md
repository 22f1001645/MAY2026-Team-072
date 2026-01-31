# EKATVA Portfolio Website

EKATVA (एकत्व = Oneness) is IITM BS's first regional fest movement, connecting 34,000+ geographically dispersed students across India. This website is a cinematic, scroll-driven portfolio that transforms digital connection into tangible community through visceral storytelling.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Testing**: Jest + React Testing Library

## Getting Started

1. **Install Dependencies**

   ```bash
   npm install

   or

   bun install
   # This will automatically set up Husky pre-commit hooks
   ```

2. **Run Development Server**

   ```bash
   npm run dev

   or

   bun run dev
   ```

3. **Build for Production**

   ```bash
   npm run build

   or

   bun run build
   ```

## Project Structure

- `app/`: Next.js App Router pages and layouts
- `components/`: UI components and page sections
- `lib/`: Utility functions and animation variants
- `types/`: TypeScript type definitions
- `__tests__/`: Unit tests

## Key Features (Sprint 1)

- **Hero Arrival**: Cinematic video background with logo reveal and scroll animations.
- **Origin Story**: Memory Wall photo collage and statistical impact section.
- **Design System**: Comprehensive scalable token system (colors, typography, spacing).

## Testing

Run unit tests with:

```bash
npm test

or

bun test
```

## Contributing

Please follow this step-by-step workflow to contribute to the project:

### 1. Create a Branch

Always create a new branch for your work. Do not push directly to `main` or `develop`.

```bash
# Update your local repository
git checkout develop
git pull origin develop

# Create a new branch (use 'feature/' or 'fix/' prefix)
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

Write your code, following the project's coding standards.

### 3. Run Checks Manually

Before committing, it's good practice to run checks locally to ensure everything is fine.

```bash
# Run linting and formatting on staged files
npx lint-staged

or

bun run lint-staged

# Run full project linting
npm run lint

or

bun run lint

# Run unit tests
npm test

or

bun test
```

### 4. Commit Your Changes

We use `husky` to automatically run checks before you commit. If checks fail, the commit will be blocked until issues are resolved.
Follow the conventional commit format:

- `feat:` for new features
- `fix:` for bug fixes
- `style:` for styling changes
- `test:` for test additions/modifications

```bash
git add .
git commit -m "feat: add amazing new feature"
```

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then, go to GitHub and create a Pull Request targeting the `develop` branch.

## License

Private property of EKATVA Team.
