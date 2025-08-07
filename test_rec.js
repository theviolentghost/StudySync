import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { pull } from "langchain/hub";
import { AgentExecutor, createReactAgent } from "langchain/agents";

const llm = new ChatOllama({
  baseUrl: "http://localhost:11434",
  model: "llama3.2", // or your actual model name
  temperature: 0,
});

const calculatorSchema = z.object({
  operation: z
    .enum(["add", "subtract", "multiply", "divide"])
    .describe("The type of operation to execute."),
  number1: z.number().describe("The first number to operate on."),
  number2: z.number().describe("The second number to operate on."),
});

const calculatorTool = new DynamicStructuredTool({
  name: "calculator",
  description: "Can perform mathematical operations.",
  schema: calculatorSchema,
  func: async ({ operation, number1, number2 }) => {
    if (operation === "add") return `${number1 + number2}`;
    if (operation === "subtract") return `${number1 - number2}`;
    if (operation === "multiply") return `${number1 * number2}`;
    if (operation === "divide") return `${number1 / number2}`;
    throw new Error("Invalid operation.");
  },
});

const tools = [calculatorTool];

// Pull the default ReAct prompt
const prompt = await pull("hwchase17/react");

// Create the ReAct agent
const agent = await createReactAgent({
  llm,
  tools,
  prompt,
});

// Wrap in executor
const executor = new AgentExecutor({
  agent,
  tools,
  verbose: true,
});

// Run the agent with the query
const result = await executor.invoke({
  input: "What is 3 * 12? Use the 'calculator' tool to compute it.",
});

console.log("Agent response:", result.output);
