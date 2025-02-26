# Portfolio Assistant

A sophisticated LangGraph-powered AI assistant designed to showcase Robin Rathore's development team and services. This assistant uses LangChain, Google's Gemini model, and a state-based workflow to handle portfolio queries, generate project proposals, and communicate with potential clients.

## Overview

This project implements an AI portfolio assistant with the following capabilities:
- Share information about team projects and members
- Generate professional project proposals
- Provide details about services offered
- Send emails with project information
- Maintain proper security constraints

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Core Components](#core-components)
- [Tools](#tools)
- [Workflows](#workflows)
- [Security](#security)
- [Usage Examples](#usage-examples)
- [Contributing](#contributing)

## Features

- **Project Information**: Access details about team projects, including technologies used and team composition
- **Team Member Profiles**: Get information about individual team members and their skills
- **Service Information**: Explore the services offered by Robin's development team
- **Project Proposals**: Generate professional proposals based on client requirements
- **Secure Email Communication**: Send emails directly to Robin with proper security measures
- **State-based Workflow**: Advanced LangGraph implementation for controlled conversations

## Prerequisites

- Node.js (v16.x or higher)
- npm or yarn
- Google Gemini API key
- Gmail account for sending emails

## Installation

1. Clone the repository:
```bash
git clone https://github.com/robinrathore/portfolio-assistant.git
cd portfolio-assistant
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the project root (see Environment Variables section)

4. Run the application:
```bash
npm start
```

## Environment Variables

Create a `.env` file with the following variables:

```
# Google Gemini API
GOOGLE_API_KEY=your_google_api_key_here

# Email configuration
EMAIL=your_gmail_address
PASSWORD=your_app_specific_password
```

**Note**: For Gmail, you'll need to use an App Password instead of your regular password. See [Google's documentation](https://support.google.com/accounts/answer/185833) for instructions.

## Project Structure

The main functionality is implemented in `agent.ts`, which contains:

- LLM configuration
- Tool definitions
- State annotations
- Graph workflows
- Helper functions

## Core Components

### LLM Configuration

The assistant uses Google's Gemini 1.5 Pro model:

```javascript
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-pro",
  temperature: 0,
  maxRetries: 2,
});
```

### State Annotations

A custom state annotation for managing portfolio workflows:

```javascript
const PortfolioStateAnnotation = Annotation.Root({
  request: Annotation,
  response: Annotation,
  status: Annotation,
  feedback: Annotation,
  projectDetails: Annotation,
});
```

### Schemas

Zod schemas define structured data for:
- Project information
- Email content
- Project proposals

## Tools

### 1. `sendEmail`

Sends emails with project information to a fixed recipient for security.

**Features:**
- Restricted to a single recipient (`rathorerobin03@gmail.com`)
- Prevents duplicate emails in a session
- Supports priority levels

**Usage:**
```javascript
await sendEmail({
  to: "rathorerobin03@gmail.com",
  subject: "Project Proposal",
  body: "<h1>Project Proposal</h1><p>Details here...</p>",
  priority: "normal"
});
```

### 2. `getProjectInfo`

Retrieves detailed information about specific projects.

**Projects available:**
- Website Redesign
- Mobile App
- Data Dashboard
- E-commerce Platform
- CRM System

**Usage:**
```javascript
await getProjectInfo({ projectName: "Website Redesign" });
```

### 3. `getTeamMemberInfo`

Provides information about team members, their skills, and projects.

**Team members available:**
- Robin (Lead)
- Alex, Jamie, Morgan, Taylor, Casey, Jordan (Team members)

**Usage:**
```javascript
await getTeamMemberInfo({ memberName: "Robin" });
```

### 4. `generateProjectProposal`

Creates a tailored project proposal based on client requirements.

**Customization options:**
- Client name
- Project type
- Requirements
- Budget
- Timeline

**Usage:**
```javascript
await generateProjectProposal({
  clientName: "TechCorp",
  projectType: "Web Application",
  requirements: "E-commerce platform with payment processing",
  budget: "$10,000-$15,000",
  timeline: "3 months"
});
```

### 5. `introduceTeam`

Provides a comprehensive introduction to Robin's development team.

**Detail levels:**
- brief: Basic team information
- detailed: Complete team profile with testimonials

**Usage:**
```javascript
await introduceTeam({ detail: "detailed" });
```

### 6. `getTeamServices`

Retrieves information about services offered by the team.

**Services covered:**
- Web Development
- Mobile Development
- UI/UX Design
- Custom Software Development
- E-commerce Solutions

**Usage:**
```javascript
await getTeamServices({});
```

## Workflows

### Main Portfolio Assistant Workflow

The primary workflow manages the conversation flow:

1. Process user input with the LLM
2. Execute requested tools
3. Generate appropriate responses

```javascript
const portfolioAssistant = new StateGraph(MessagesAnnotation)
  .addNode("llmNode", llmNode)
  .addNode("toolExecutionNode", toolExecutionNode)
  .addEdge("__start__", "llmNode")
  .addConditionalEdges(...)
  .compile();
```

### Proposal Workflow

A specialized workflow for generating high-quality proposals:

1. Generate initial proposal
2. Review and provide feedback
3. Revise if necessary or approve

```javascript
const proposalWorkflow = new StateGraph(PortfolioStateAnnotation)
  .addNode("generateProposal", ...)
  .addNode("reviewProposal", ...)
  .addConditionalEdges(...)
  .compile();
```

## Security

The assistant implements several security measures:

1. **Restricted Email**: Can only send to a single hardcoded address
2. **Topic Constraints**: Only discusses Robin's team and services
3. **Duplicate Prevention**: Avoids sending multiple emails for the same request
4. **Input Validation**: Uses Zod schemas to validate all inputs

## Helper Functions

Several helper functions support proposal generation:

- `generateApproach`: Creates a tailored approach based on project type
- `allocateTeam`: Assigns appropriate team members
- `generateTimeline`: Builds a realistic project timeline
- `generateBudget`: Allocates budget percentages

## Usage Examples

### Basic Query

```javascript
const response = await runPortfolioAssistant(
  "Tell me about your mobile app development services"
);
console.log(response);
```

### Project Proposal

```javascript
const response = await runPortfolioAssistant(
  "I need a proposal for an e-commerce website with a budget of $15,000"
);
console.log(response);
```

### Team Information

```javascript
const response = await runPortfolioAssistant(
  "Who is on your development team?"
);
console.log(response);
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -m 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

Robin Rathore - rathorerobin03@gmail.com
Portfolio: https://robinrathore.dev
LinkedIn: https://linkedin.com/in/robinrathore