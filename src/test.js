import { runPortfolioAssistant } from "./agent.js"; 
import dotenv from "dotenv";

dotenv.config();

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async function runTest() {
    try {
      console.log("Testing Portfolio Assistant...\n");
      
      console.log("Hi:");
      await delay(5000);  // Delay 5 seconds
      const projectResponse = await runPortfolioAssistant("Hi");
      console.log(JSON.stringify(projectResponse, null, 2));
  
      console.log("\n-------------------\n");
      
      console.log("Getting information about team member Alex:");
      await delay(5000);  // Delay 5 seconds
      const teamResponse = await runPortfolioAssistant("What are Alex's skills and projects?");
      console.log(JSON.stringify(teamResponse, null, 2));
  
      console.log("\n-------------------\n");
      
      console.log("Generating a project proposal:");
      await delay(5000);  // Delay 5 seconds
      const proposalResponse = await runPortfolioAssistant(
        "Create a proposal for ABC Company for a new e-commerce website with a budget of $50,000 and a timeline of 3 months."
      );
      console.log(JSON.stringify(proposalResponse, null, 2));
  
    } catch (error) {
      console.error("Error running test:", error);
    }
  }
  
  
runTest();
