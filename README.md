# NovaAgent ⚡

**AI Energy Planner for Solar & Battery Systems**

NovaAgent helps solar professionals analyze power bills, design solar + battery systems, and generate NEC-compliant plans automatically.

## Features

- 📊 **Bill Analysis**: Analyze power usage patterns and costs
- ⚡ **System Sizing**: Calculate optimal solar and battery capacity
- 📋 **Bill of Materials**: Generate detailed equipment lists with pricing
- ✅ **NEC Compliance**: Automated code compliance checks
- 📄 **PDF Reports**: Professional branded energy plans
- 🎨 **Modern UI**: Clean, intuitive interface with shadcn/ui

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/mrmoe28/nova-agent.git
cd nova-agent

# Install dependencies
npm install

# Set up database
npx prisma migrate dev

# Start development server
npm run dev
```

Visit **http://localhost:3000** (or the port shown in console)

## Usage

### Creating a New Project

1. Click **"Start a New Energy Plan"** on the homepage
2. Enter client information
3. Use **"Demo Data"** to simulate bill upload
4. Configure backup duration and critical loads
5. Review generated BOM and pricing
6. Generate PDF report

### Managing Projects

- View all projects at `/projects`
- Continue incomplete projects
- Download PDF reports for completed projects

## Project Structure

```
novaagent/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   ├── wizard/            # Multi-step wizard
│   │   └── projects/          # Projects list
│   ├── components/            # React components
│   │   └── ui/               # shadcn/ui components
│   ├── lib/                  # Utilities
│   │   ├── prisma.ts         # Database client
│   │   ├── pdf-generator.ts  # PDF creation
│   │   └── utils.ts          # Helper functions
│   └── types/                # TypeScript definitions
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── dev.db               # SQLite database
└── public/                   # Static assets
```

## API Endpoints

- `POST /api/projects` - Create project
- `GET /api/projects` - List projects
- `GET /api/projects/[id]` - Get project details
- `POST /api/analyze` - Analyze power usage
- `POST /api/size` - Calculate system sizing
- `POST /api/bom` - Generate BOM
- `POST /api/plan` - Create installation plan
- `POST /api/pdf` - Generate PDF report

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui
- **Database**: SQLite + Prisma ORM
- **PDF**: pdfkit
- **Forms**: react-hook-form + zod

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Prisma commands
npx prisma studio      # Database GUI
npx prisma generate    # Generate client
npx prisma migrate dev # Run migrations
```

## Contributor Guide

New to NovaAgent? Start with [AGENTS.md](AGENTS.md) for project structure, coding conventions, and workflow guidelines.

## Branding

- **Colors**: Deep Navy (#0A0F1C), Electric Cyan (#22D3EE)
- **Logo**: Lightning bolt symbol
- **Tagline**: "AI Energy Planner for Solar & Battery Systems"

## Features in Detail

### System Sizing Algorithm

Calculates:
- Solar array size based on daily usage (with 120% safety factor)
- Battery capacity for specified backup duration
- Inverter capacity for peak demand + critical loads
- Estimated system cost

### NEC Compliance Checks

Automated validation for:
- NEC 690.8 - Circuit Sizing and Protection
- NEC 690.12 - Rapid Shutdown Requirements
- NEC 690.13 - Photovoltaic System Disconnecting Means
- NEC 705.12 - Point of Connection
- NEC 706 - Energy Storage Systems

### PDF Report Contents

- Client information
- Usage analysis and recommendations
- Complete system specifications
- Detailed bill of materials
- NEC compliance checklist
- Installation steps and timeline
- Labor hour estimates

## Demo Mode

The application includes a demo mode that:
- Generates realistic power usage data (850-1150 kWh/month)
- Simulates bill analysis
- Provides sample equipment and pricing
- Allows full workflow testing without actual files

## Roadmap

- [ ] Real file upload with OCR
- [ ] User authentication
- [ ] Real-time equipment pricing APIs
- [ ] Email PDF delivery
- [ ] Analytics dashboard
- [ ] Mobile app
- [ ] Multi-language support

## Database Schema

The application uses 6 main models:
- **Project**: Client and project metadata
- **Bill**: Uploaded power bills
- **Analysis**: Usage analysis results
- **System**: Solar/battery design
- **BOMItem**: Equipment line items
- **Plan**: Installation plan and NEC checks

---

**NovaAgent** - Powering the future of solar energy planning ⚡
