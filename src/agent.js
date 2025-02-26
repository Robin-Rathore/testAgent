// Add at the top of agent.ts
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { Annotation, StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import {
  SystemMessage,
  ToolMessage
} from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
dotenv.config();

const llm = new ChatGoogleGenerativeAI({
    model: "gemini-1.5-pro",
    temperature: 0,
    maxRetries: 2,
  });

// Define our state annotation for portfolio management
const PortfolioStateAnnotation = Annotation.Root({
  request: Annotation,
  response: Annotation,
  status: Annotation,
  feedback: Annotation,
  projectDetails: Annotation,
});

// Creating schemas for structured outputs
const projectInfoSchema = z.object({
  name: z.string().describe("Name of the project"),
  description: z.string().describe("Brief description of the project"),
  technologies: z.array(z.string()).describe("Technologies used in the project"),
  teamMembers: z.array(z.string()).describe("Team members who worked on the project"),
  completionDate: z.string().describe("When the project was completed"),
  githubLink: z.string().optional().describe("Link to the project repository")
});

// Restricted email schema with fixed recipient
const emailSchema = z.object({
    to: z.string().describe("Email recipient (always defaulted to rathorerobin03@gmail.com)"),
    subject: z.string().describe("Email subject"),
    body: z.string().describe("Email body content"),
    priority: z.enum(["high", "normal", "low"]).describe("Email priority")
});

// Add a flag to track if an email has been sent in this session
let emailSentInCurrentSession = false;

const sendEmail = tool(
  async ({ to, subject, body, priority = "normal" }) => {
    // Force the recipient to always be rathorerobin03@gmail.com for security
    const secureRecipient = "rathorerobin03@gmail.com";
    
    // Check if email was already sent in this session
    if (emailSentInCurrentSession && subject.includes("Revised")) {
      return "Skipping redundant email. An email has already been sent in this session.";
    }
    
    // Check if recipient is trying to be set to something other than the secure recipient
    if (to !== secureRecipient) {
      return `Security constraint: Emails can only be sent to ${secureRecipient}. Redirecting email to authorized recipient.`;
    }
    
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
      }
    });

    try {
      await transporter.sendMail({
        from: "robinsingh248142@gmail.com",
        to: secureRecipient, // Always use the secure recipient
        subject,
        html: body,
        priority: priority === "high" ? "high" : priority === "low" ? "low" : "normal"
      });
      
      // Set the flag to true after sending
      emailSentInCurrentSession = true;
      
      return `Email successfully sent to ${secureRecipient}`;
    } catch (error) {
      return `Failed to send email: ${error.message}`;
    }
  },
  {
    name: "sendEmail",
    description: "Send an email with project proposal or information (restricted to sending only to Robin's email)",
    schema: emailSchema
  }
);

function resetEmailFlag() {
    emailSentInCurrentSession = false;
}

const getProjectInfo = tool(
  async ({ projectName }) => {
    // In a real implementation, this would query a database or API
    const projects = {
      "Website Redesign": {
        name: "Website Redesign",
        description: "Complete overhaul of company website with modern design principles",
        technologies: ["React", "Next.js", "Tailwind CSS", "Node.js"],
        teamMembers: ["Alex", "Jamie", "Taylor"],
        completionDate: "2024-09-15",
        githubLink: "https://github.com/robinrathore/website-redesign"
      },
      "Mobile App": {
        name: "Mobile App",
        description: "Cross-platform mobile application for customer engagement",
        technologies: ["React Native", "Firebase", "Redux"],
        teamMembers: ["Morgan", "Casey", "Riley"],
        completionDate: "2024-08-20",
        githubLink: "https://github.com/robinrathore/mobile-app"
      },
      "Data Dashboard": {
        name: "Data Dashboard",
        description: "Interactive dashboard for visualizing company analytics",
        technologies: ["D3.js", "Express", "MongoDB", "AWS"],
        teamMembers: ["Jordan", "Quinn", "Dakota"],
        completionDate: "2024-07-10",
        githubLink: "https://github.com/robinrathore/data-dashboard"
      },
      "E-commerce Platform": {
        name: "E-commerce Platform",
        description: "Scalable e-commerce solution with advanced product filtering and secure payment processing",
        technologies: ["Next.js", "Stripe", "MongoDB", "Redis"],
        teamMembers: ["Alex", "Morgan", "Jamie"],
        completionDate: "2024-06-25",
        githubLink: "https://github.com/robinrathore/ecommerce-platform"
      },
      "CRM System": {
        name: "CRM System",
        description: "Custom CRM solution for small to medium businesses with analytics dashboard",
        technologies: ["React", "Express", "PostgreSQL", "GraphQL"],
        teamMembers: ["Taylor", "Casey", "Jordan"],
        completionDate: "2024-05-18",
        githubLink: "https://github.com/robinrathore/crm-system"
      }
    };

    if (projectName in projects) {
      return JSON.stringify(projects[projectName]);
    } else {
      return JSON.stringify({ 
        error: "Project not found", 
        availableProjects: Object.keys(projects) 
      });
    }
  },
  {
    name: "getProjectInfo",
    description: "Retrieve detailed information about a specific project from Robin's portfolio",
    schema: z.object({
      projectName: z.string().describe("Name of the project to retrieve information about")
    })
  }
);

const getTeamMemberInfo = tool(
  async ({ memberName }) => {
    // In a real implementation, this would query a database or API
    const teamMembers = {
      "Alex": {
        name: "Alex Johnson",
        role: "Senior Frontend Developer",
        skills: ["React", "Next.js", "JavaScript", "CSS", "UI/UX"],
        contact: "alex@robinteam.com",
        projects: ["Website Redesign", "E-commerce Platform", "Data Dashboard"],
        portfolio: "https://alexjohnson.dev"
      },
      "Jamie": {
        name: "Jamie Smith",
        role: "Backend Developer",
        skills: ["Node.js", "Python", "MongoDB", "AWS", "Docker"],
        contact: "jamie@robinteam.com",
        projects: ["Website Redesign", "E-commerce Platform", "API Services"],
        portfolio: "https://jamiesmith.tech"
      },
      "Morgan": {
        name: "Morgan Williams",
        role: "Mobile Developer",
        skills: ["React Native", "Swift", "Kotlin", "Firebase"],
        contact: "morgan@robinteam.com",
        projects: ["Mobile App", "E-commerce Platform", "Customer Portal"],
        portfolio: "https://morganwilliams.io"
      },
      "Taylor": {
        name: "Taylor Davis",
        role: "Full Stack Developer",
        skills: ["JavaScript", "TypeScript", "React", "Node.js", "MongoDB"],
        contact: "taylor@robinteam.com",
        projects: ["Website Redesign", "CRM System"],
        portfolio: "https://taylordavis.dev"
      },
      "Casey": {
        name: "Casey Brown",
        role: "DevOps Engineer",
        skills: ["AWS", "Docker", "Kubernetes", "CI/CD", "Python"],
        contact: "casey@robinteam.com",
        projects: ["Mobile App", "CRM System"],
        portfolio: "https://caseybrown.cloud"
      },
      "Jordan": {
        name: "Jordan Lee",
        role: "UI/UX Designer",
        skills: ["Figma", "Adobe XD", "Sketch", "User Research", "Prototyping"],
        contact: "jordan@robinteam.com",
        projects: ["Data Dashboard", "CRM System"],
        portfolio: "https://jordanlee.design"
      },
      "Robin": {
        name: "Robin Rathore",
        role: "Lead Developer & Founder",
        skills: ["Full Stack Development", "Project Management", "Architecture", "Client Relations"],
        contact: "rathorerobin03@gmail.com",
        projects: ["Website Redesign", "Mobile App", "Data Dashboard", "E-commerce Platform", "CRM System"],
        portfolio: "https://robinrathore.dev",
        linkedin: "https://linkedin.com/in/robinrathore"
      }
    };

    if (memberName in teamMembers) {
      return JSON.stringify(teamMembers[memberName]);
    } else {
      return JSON.stringify({ 
        error: "Team member not found", 
        availableMembers: Object.keys(teamMembers) 
      });
    }
  },
  {
    name: "getTeamMemberInfo",
    description: "Retrieve information about a specific team member from Robin's team",
    schema: z.object({
      memberName: z.string().describe("Name of the team member to retrieve information about")
    })
  }
);

const generateProjectProposal = tool(
  async ({ clientName, projectType, requirements, budget, timeline }) => {
    // This would generate a tailored project proposal
    const proposal = `
# Project Proposal for ${clientName}

## Project Overview
Type: ${projectType}
Timeline: ${timeline}
Budget Range: ${budget}

## Project Requirements
${requirements}

## Proposed Solution
Based on your requirements, our team proposes the following approach:
${generateApproach(projectType, requirements)}

## Team Allocation
${allocateTeam(projectType)}

## Timeline Breakdown
${generateTimeline(timeline, projectType)}

## Budget Allocation
${generateBudget(budget, projectType)}

## About Our Team
Robin's team specializes in delivering high-quality software solutions with a focus on performance, usability, and maintainability. Our portfolio includes projects for clients across various industries, and we pride ourselves on our collaborative approach.

## Portfolio Highlights
- Website Redesign: Complete overhaul with React and Next.js
- Mobile App: Cross-platform solution with React Native
- E-commerce Platform: Scalable solution with secure payment processing
- Data Dashboard: Interactive analytics visualization
- CRM System: Custom solution with advanced reporting

## Contact Information
Robin Rathore
Email: rathorerobin03@gmail.com
Portfolio: https://robinrathore.dev
LinkedIn: https://linkedin.com/in/robinrathore

## Next Steps
1. Review this proposal
2. Schedule a follow-up meeting
3. Finalize requirements and scope
4. Sign contract and begin work
    `;
    
    return proposal;
  },
  {
    name: "generateProjectProposal",
    description: "Generate a project proposal for a potential client based on Robin's team capabilities",
    schema: z.object({
      clientName: z.string().describe("Name of the client"),
      projectType: z.string().describe("Type of project (e.g., web app, mobile app, redesign)"),
      requirements: z.string().describe("Project requirements and goals"),
      budget: z.string().describe("Budget range for the project"),
      timeline: z.string().describe("Expected timeline for completion")
    })
  }
);

// Add this new tool to specifically introduce the team
const introduceTeam = tool(
    async ({ detail = "brief" }) => {
      const teamIntro = {
        "name": "Robin Rathore's Development Team",
        "founded": "2022",
        "specialties": ["Web Development", "Mobile Applications", "UI/UX Design", "E-commerce Solutions", "Custom Software"],
        "members": [
          {
            "name": "Robin Rathore",
            "role": "Lead Developer & Founder",
            "bio": "Robin leads the team with over 8 years of full-stack development experience, specializing in scalable web applications and team coordination."
          },
          {
            "name": "Alex Johnson",
            "role": "Senior Frontend Developer",
            "bio": "Alex brings 6 years of expertise in creating responsive, accessible interfaces with React and Next.js."
          },
          {
            "name": "Jamie Smith",
            "role": "Backend Developer",
            "bio": "Jamie specializes in building robust APIs and database architecture with 5 years of experience in Node.js and Python."
          },
          {
            "name": "Morgan Williams",
            "role": "Mobile Developer",
            "bio": "Morgan crafts seamless mobile experiences across platforms with deep knowledge of React Native and native development."
          },
          {
            "name": "Taylor Davis",
            "role": "Full Stack Developer",
            "bio": "Taylor excels at bridging frontend and backend, with particular expertise in TypeScript and modern frameworks."
          },
          {
            "name": "Casey Brown",
            "role": "DevOps Engineer",
            "bio": "Casey ensures smooth deployment and infrastructure management with expertise in AWS, Docker, and CI/CD pipelines."
          },
          {
            "name": "Jordan Lee",
            "role": "UI/UX Designer",
            "bio": "Jordan translates user needs into intuitive interfaces with a background in user research and visual design."
          }
        ],
        "recentProjects": ["E-commerce Platform", "CRM System", "Mobile App", "Website Redesign", "Data Dashboard"],
        "clientTestimonials": [
          {
            "client": "TechNova Inc.",
            "quote": "Robin's team delivered our e-commerce platform ahead of schedule and exceeded our expectations in terms of performance and user experience."
          },
          {
            "client": "GrowthMetrics",
            "quote": "The data dashboard Robin's team built has transformed how we analyze our business metrics. Their attention to detail was impressive."
          }
        ],
        "contact": {
          "email": "rathorerobin03@gmail.com",
          "portfolio": "https://robinrathore.dev",
          "linkedin": "https://linkedin.com/in/robinrathore"
        }
      };
      
      return JSON.stringify(detail === "detailed" ? teamIntro : {
        name: teamIntro.name,
        founded: teamIntro.founded,
        specialties: teamIntro.specialties,
        members: teamIntro.members.map(m => ({name: m.name, role: m.role})),
        contact: teamIntro.contact
      });
    },
    {
      name: "introduceTeam",
      description: "Get a comprehensive introduction to Robin's development team",
      schema: z.object({
        detail: z.enum(["brief", "detailed"]).optional().describe("Level of detail to provide about the team")
      })
    }
  );
  

// The problematic tool is here - let's fix it by adding a proper schema

const getTeamServices = tool(
    async ({ dummy = "" }) => {
      const services = {
        "Web Development": {
          description: "Custom responsive websites and web applications",
          technologies: ["React", "Next.js", "Node.js", "Express", "MongoDB", "PostgreSQL"],
          sampleProjects: ["Website Redesign", "E-commerce Platform", "Data Dashboard"],
          process: ["Discovery", "Design", "Development", "Testing", "Deployment", "Maintenance"],
          turnaroundTime: "4-12 weeks depending on scope"
        },
        "Mobile Development": {
          description: "Native and cross-platform mobile applications",
          technologies: ["React Native", "Swift", "Kotlin", "Firebase"],
          sampleProjects: ["Mobile App", "Customer Portal"],
          process: ["Requirements gathering", "Wireframing", "Development", "Testing", "Store submission", "Updates"],
          turnaroundTime: "6-16 weeks depending on complexity"
        },
        "UI/UX Design": {
          description: "User-centered design for digital products",
          deliverables: ["Wireframes", "Prototypes", "Design systems", "User flows", "Visual designs"],
          sampleProjects: ["Website Redesign", "Mobile App", "Data Dashboard"],
          process: ["Research", "Wireframing", "Prototyping", "Visual design", "Usability testing"],
          turnaroundTime: "2-6 weeks depending on scope"
        },
        "Custom Software Development": {
          description: "Tailored software solutions for specific business needs",
          technologies: ["Various based on requirements"],
          sampleProjects: ["CRM System", "Data Dashboard"],
          process: ["Analysis", "Architecture", "Development", "Testing", "Deployment", "Support"],
          turnaroundTime: "8-20 weeks depending on complexity"
        },
        "E-commerce Solutions": {
          description: "Online stores and marketplaces with payment processing",
          technologies: ["Next.js", "Stripe", "PayPal", "MongoDB", "Redis"],
          sampleProjects: ["E-commerce Platform"],
          features: ["Product catalog", "Shopping cart", "Secure checkout", "Order management", "Analytics"],
          turnaroundTime: "6-14 weeks depending on features"
        }
      };
      
      return JSON.stringify(services);
    },
    {
      name: "getTeamServices",
      description: "Get information about services offered by Robin's team",
      schema: z.object({
        dummy: z.string().optional().describe("Optional parameter - not used")
      })
    }
  );

// Helper functions for proposal generation
function generateApproach(projectType, requirements) {
  // This would be more sophisticated in a real implementation
  if (projectType.toLowerCase().includes("web")) {
    return "Our team will develop a responsive web application using React and Next.js, with a focus on performance and user experience. We'll implement continuous integration for quality assurance and deliver a solution that meets your specific business needs while ensuring scalability for future growth.";
  } else if (projectType.toLowerCase().includes("mobile")) {
    return "We propose developing a cross-platform mobile application using React Native to reduce development time while maintaining native-like performance. Firebase will be used for backend services, and we'll ensure the app works flawlessly across both iOS and Android platforms with a consistent user experience.";
  } else if (projectType.toLowerCase().includes("ecommerce") || projectType.toLowerCase().includes("e-commerce")) {
    return "For your e-commerce needs, we'll build a scalable platform using Next.js with server-side rendering for optimal performance and SEO. We'll integrate secure payment processing via Stripe, implement inventory management, and ensure the platform offers an intuitive shopping experience for your customers.";
  } else if (projectType.toLowerCase().includes("crm") || projectType.toLowerCase().includes("dashboard")) {
    return "We'll develop a custom data-driven solution that provides actionable insights through interactive visualizations. Using modern JavaScript frameworks and robust backend technologies, we'll create a system that aggregates data from multiple sources and presents it in an intuitive interface tailored to your business workflows.";
  } else {
    return "Based on your specific needs, we'll implement a custom solution leveraging our team's expertise in modern development practices and technologies. Our approach will focus on delivering a high-quality, maintainable solution that addresses your unique business requirements while providing a seamless user experience.";
  }
}

function allocateTeam(projectType) {
  if (projectType.toLowerCase().includes("web")) {
    return "- Alex (Senior Frontend Developer)\n- Jamie (Backend Developer)\n- Jordan (UI/UX Designer)\n- Casey (DevOps Engineer)\n- Robin (Project Lead)";
  } else if (projectType.toLowerCase().includes("mobile")) {
    return "- Morgan (Mobile Developer)\n- Jamie (Backend Developer)\n- Jordan (UI/UX Designer)\n- Casey (DevOps Engineer)\n- Robin (Project Lead)";
  } else if (projectType.toLowerCase().includes("ecommerce") || projectType.toLowerCase().includes("e-commerce")) {
    return "- Alex (Senior Frontend Developer)\n- Jamie (Backend Developer)\n- Morgan (Integration Specialist)\n- Casey (DevOps Engineer)\n- Robin (Project Lead)";
  } else if (projectType.toLowerCase().includes("crm") || projectType.toLowerCase().includes("dashboard")) {
    return "- Taylor (Full Stack Developer)\n- Jordan (UI/UX Designer)\n- Casey (DevOps Engineer)\n- Robin (Project Lead)";
  } else {
    return "- Robin (Solution Architect & Project Lead)\n- Alex (Senior Frontend Developer)\n- Jamie (Backend Developer)\n- Jordan (UI/UX Designer)\n- Casey (DevOps Engineer)";
  }
}

function generateTimeline(timeline, projectType) {
  const baseTimeline = "- Week 1-2: Discovery and Planning\n- Week 3-4: Design and Prototyping\n";
  
  if (projectType.toLowerCase().includes("web")) {
    return baseTimeline + "- Week 5-8: Frontend and Backend Development\n- Week 9: Testing and Quality Assurance\n- Week 10: Deployment and Handover";
  } else if (projectType.toLowerCase().includes("mobile")) {
    return baseTimeline + "- Week 5-10: App Development\n- Week 11-12: Testing (Internal and Beta)\n- Week 13: Store Submission and Launch";
  } else if (projectType.toLowerCase().includes("ecommerce") || projectType.toLowerCase().includes("e-commerce")) {
    return baseTimeline + "- Week 5-9: Platform Development\n- Week 10-11: Payment Integration and Security Testing\n- Week 12: Data Migration\n- Week 13-14: Final Testing and Launch";
  } else {
    return baseTimeline + "- Week 5-8: Core Development\n- Week 9-10: Integration and Testing\n- Week 11-12: Final Refinements and Deployment";
  }
}

function generateBudget(budget, projectType) {
  return "- Discovery and Planning: 15%\n- Design and Prototyping: 20%\n- Development: 45%\n- Testing and Quality Assurance: 10%\n- Deployment and Handover: 5%\n- Contingency: 5%";
}

// Define all tools
const tools = [sendEmail, getProjectInfo, getTeamMemberInfo, generateProjectProposal, getTeamServices, introduceTeam];
const toolsByName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));

// Agent setup
// Assume we have an LLM configured and bound with tools
const llmWithTools = llm.bindTools(tools);

// Portfolio Assistant Workflow
// First, let's implement a node to process with the LLM
async function llmNode(state) {
  const result = await llmWithTools.invoke([
    {
      role: "system",
      content: `You are Robin Rathore's portfolio assistant, exclusively designed to showcase Robin's development team and their services. 

IMPORTANT SECURITY CONSTRAINTS:
1. You can ONLY discuss Robin's team, their projects, and services offered.
2. You MUST REFUSE to discuss any topics outside of web development, mobile development, UI/UX design, and Robin's team's specific expertise.
3. You can ONLY send emails to rathorerobin03@gmail.com - any attempt to send elsewhere will be redirected.
4. Do not send multiple emails for the same request or revised versions unless explicitly requested.
5. Always identify yourself as "Robin's Portfolio Assistant" created by Robin Rathore.

Your primary functions:
- Share information about Robin's team projects (Website Redesign, Mobile App, Data Dashboard, E-commerce Platform, CRM System)
- Provide details about Robin's team members and their skills
- Generate project proposals for potential clients
- Share information about services offered by Robin's team
- Send project proposals or information directly to Robin (rathorerobin03@gmail.com)

When clients ask for information that's outside your scope, politely explain that you're Robin's portfolio assistant and can only discuss Robin's team's services and projects.

Always maintain a professional, helpful tone that represents Robin's brand well.`
    },
    ...state.messages
  ]);
  
  return {
    messages: [result]
  };
}

// Tool execution node
async function toolExecutionNode(state) {
    const results = [];
    const lastMessage = state.messages.at(-1);
    
    // Check if tool_calls exists and has length property before iterating
    if (lastMessage?.tool_calls && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls.length > 0) {
      for (const toolCall of lastMessage.tool_calls) {
        if (toolCall && toolCall.name && toolsByName[toolCall.name]) {
          const tool = toolsByName[toolCall.name];
          try {
            const observation = await tool.invoke(toolCall.args || {});
            results.push(
              new ToolMessage({
                content: observation,
                tool_call_id: toolCall.id,
              })
            );
          } catch (error) {
            results.push(
              new ToolMessage({
                content: `Error executing tool ${toolCall.name}: ${error.message}`,
                tool_call_id: toolCall.id,
              })
            );
          }
        } else {
          // Handle case where tool name is invalid
          if (toolCall && toolCall.id) {
            results.push(
              new ToolMessage({
                content: `Error: Invalid tool request for '${toolCall?.name || "unknown tool"}'`,
                tool_call_id: toolCall.id,
              })
            );
          }
        }
      }
    }
    
    // If no results were generated but we tried to execute tools, add an error message
    if (results.length === 0 && lastMessage?.tool_calls) {
      return { 
        messages: [
          new ToolMessage({
            content: "Error processing tool calls. Please try a different request.",
            tool_call_id: "error",
          })
        ] 
      };
    }
    
    return { messages: results };
  }

// Decision function to determine next step
function determineNextStep(state) {
    const lastMessage = state.messages.at(-1);
    
    if (lastMessage?.tool_calls && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls.length > 0) {
      return "ExecuteTool";
    }
    
    return "__end__";
  }
  

// Build the portfolio assistant workflow
const portfolioAssistant = new StateGraph(MessagesAnnotation)
  .addNode("llmNode", llmNode)
  .addNode("toolExecutionNode", toolExecutionNode)
  .addEdge("__start__", "llmNode")
  .addConditionalEdges(
    "llmNode",
    determineNextStep,
    {
      "ExecuteTool": "toolExecutionNode",
      "__end__": "__end__"
    }
  )
  .addEdge("toolExecutionNode", "llmNode")
  .compile();

// Example usage
async function runPortfolioAssistant(userMessage) {
    resetEmailFlag(); // Reset the flag for new conversations
    const result = await portfolioAssistant.invoke({
      messages: [
        {
          role: "user",
          content: userMessage
        }
      ]
    });
    
    return result.messages;
}

// Export the main functionality
export {
  portfolioAssistant,
  runPortfolioAssistant,
  tools,
  PortfolioStateAnnotation
};

// Create a more specialized workflow for project proposals
const proposalWorkflow = new StateGraph(PortfolioStateAnnotation)
  .addNode("generateProposal", async (state) => {
    const proposal = await llmWithTools.invoke([
      {
        role: "system",
        content: "You are Robin Rathore's proposal generator. Create detailed project proposals that highlight the strengths of Robin's team. Only generate proposals for web development, mobile development, UI/UX design, e-commerce, and custom software development services."
      },
      {
        role: "user",
        content: `Generate a detailed project proposal for ${state.request}`
      }
    ]);
    return { response: proposal.content };
  })
  .addNode("reviewProposal", async (state) => {
    const review = await llm.invoke([
      {
        role: "system",
        content: "You are a proposal reviewer for Robin Rathore's team. Ensure proposals are comprehensive, professional, and accurately represent Robin's team capabilities."
      },
      {
        role: "user",
        content: `Review this proposal and provide feedback: ${state.response}`
      }
    ]);
    return { feedback: review.content };
  })
  .addConditionalEdges(
    "reviewProposal",
    (state) => {
      // Check if the feedback contains any critical issues
      if (state.feedback.toLowerCase().includes("revise") || 
          state.feedback.toLowerCase().includes("improve")) {
        return "Revise";
      } else {
        return "Approve";
      }
    },
    {
      "Revise": "generateProposal",
      "Approve": "__end__"
    }
  )
  .addEdge("__start__", "generateProposal")
  .addEdge("generateProposal", "reviewProposal")
  .compile();

// Export additional components
export {
  proposalWorkflow
};