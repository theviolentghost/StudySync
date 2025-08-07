import os
import logging
from dotenv import load_dotenv
from langchain_ollama import ChatOllama
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate
from tools import all_tools

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)

# Initialize LLM
llm = ChatOllama(model="gpt-oss:20b", reasoning=False, temperature=0.2, streaming=True)

# Tool-calling prompt
prompt = ChatPromptTemplate.from_messages([
    ("system", 
     "You are an AI assistant with access to external tools. "
     "If a user asks for information you cannot answer from your own knowledge (like current weather, news, or anything up-to-date), "
     "you MUST use the available tools to answer. "
     "Never say you cannot access the internet or suggest the user check a website—use the web_search tool instead. "
     "Available tools:\n"
     "- get_time: Get the current date and time.\n"
     "- duckduckgo_search: Search the web for up-to-date information. Usage: duckduckgo_search(query: str) -> str\n"
     "When you use a tool, always use the tool's result in your final answer. "
     "Do not just repeat the tool output—explain, summarize, or combine it as needed. "
     "Always explain your reasoning and keep responses clear and concise."
    ),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}")
])

# Create agent and executor
agent = create_tool_calling_agent(llm=llm, tools=all_tools, prompt=prompt)
executor = AgentExecutor(
    agent=agent,
    tools=all_tools,
    verbose=False,
    max_iterations=3,        # Prevent infinite loops
    handle_parsing_errors=True  # Graceful fallback
)

def main():
    """Basic interaction loop for testing the agent with tools."""
    print("🤖 LangChain Agent with Ollama Ready!")
    print("Ask me something that requires checking the time, or type 'quit' to exit.\n")
    
    while True:
        try:
            user_input = input("You: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'q']:
                print("👋 Goodbye!")
                break
            
            if not user_input:
                continue
            
            print("🤖 Processing...")
            response = executor.invoke({"input": user_input})
            content = response["output"]
            
            print(f"Agent: {content}\n")
            
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except Exception as e:
            logging.error(f"❌ Error: {e}")
            print(f"❌ An error occurred: {e}\n")

if __name__ == "__main__":
    main()