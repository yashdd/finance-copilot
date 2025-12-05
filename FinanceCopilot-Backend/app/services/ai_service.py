from typing import Optional, List, Dict
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain.memory import ConversationBufferWindowMemory, ConversationSummaryBufferMemory
from langchain_core.callbacks import Callbacks
from ..config import settings

# Fix Pydantic model rebuild issue - import dependencies first
try:
    # Import required types for model rebuild
    from langchain_core.caches import BaseCache
    # Rebuild model to resolve forward references
    ChatGoogleGenerativeAI.model_rebuild()
except Exception as e:
    # If rebuild fails, continue anyway - might work without it
    pass


class AIService:
    def __init__(self):
        self.llm = None
        self.model_name = None
        self.tools = []
        self.agent_executor = None
        
        if settings.gemini_api_key:
            # First, try to detect available models and use the best one
            available_model = self._get_available_model()
            if available_model:
                try:
                    self.llm = ChatGoogleGenerativeAI(
                        model=available_model,
                        google_api_key=settings.gemini_api_key,
                        temperature=0.7,
                        top_p=0.8,
                        top_k=40,
                    )
                    self.model_name = available_model
                    print(f"LangChain initialized with {available_model}")
                except Exception as e:
                    print(f"Warning: Could not initialize LangChain with {available_model}: {e}")
                    import traceback
                    traceback.print_exc()
                    self.llm = None
            else:
                # Fallback: try common model names
                models_to_try = [
                    "gemini-pro",
                    "gemini-1.5-pro",
                    "gemini-1.5-flash",
                ]
                
                for model_name in models_to_try:
                    try:
                        self.llm = ChatGoogleGenerativeAI(
                            model=model_name,
                            google_api_key=settings.gemini_api_key,
                            temperature=0.7,
                            top_p=0.8,
                            top_k=40,
                        )
                        self.model_name = model_name
                        print(f"LangChain initialized with {model_name}")
                        break
                    except Exception as e:
                        print(f"Failed to initialize {model_name}: {e}")
                        continue
                
                if not self.llm:
                    print("Warning: Could not initialize any Gemini model")
        else:
            print("Warning: GEMINI_API_KEY not found in environment variables")
    
    def _get_available_model(self) -> Optional[str]:
        """Try to find an available Gemini model by listing available models"""
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.gemini_api_key)
            
            # List available models
            models = genai.list_models()
            
            # Filter for text generation models that support generateContent
            available_models = []
            for model in models:
                if 'generateContent' in model.supported_generation_methods:
                    model_name = model.name.replace('models/', '')
                    available_models.append(model_name)
            
            if not available_models:
                return None
            
            # Prioritize flash models (faster, good for real-time chat)
            # Then pro models (better for content generation)
            preferred_order = [
                'gemini-1.5-flash',  # User preference
                'gemini-1.5-flash-exp',
                'gemini-2.0-flash-exp',
                'gemini-2.0-flash',
                'gemini-2.5-flash-preview-03-25',
                'gemini-1.5-pro',
                'gemini-2.5-pro-preview-03-25',
                'gemini-pro',
            ]
            
            # Try preferred models first
            for preferred in preferred_order:
                if preferred in available_models:
                    print(f"Found preferred model: {preferred}")
                    return preferred
            
            # If no preferred model found, return first available
            print(f"Available models: {available_models}")
            print(f"Using first available: {available_models[0]}")
            return available_models[0]
        except Exception as e:
            print(f"Could not list available models: {e}")
            return None
        else:
            print("Warning: GEMINI_API_KEY not found in environment variables")
    
    def set_tools(self, tools: List):
        """Set tools for the agent"""
        self.tools = tools
        if self.llm and self.tools:
            try:
                # Bind tools to LLM
                self.llm_with_tools = self.llm.bind_tools(self.tools)
                
                # Create agent with tool calling
                prompt = ChatPromptTemplate.from_messages([
                    ("system", """You are FinanceCopilot, a knowledgeable financial assistant.
- Use the provided tools to fetch real-time data when needed
- Always use tools to get current stock prices, metrics, and news
- Reference specific numbers and metrics when available
- Maintain conversation continuity
- Be conversational and helpful, not robotic
- IMPORTANT: Do NOT use markdown formatting. Write in plain text only.

When a user asks about a stock:
1. First search for the symbol if needed (search_stock_symbols)
2. Get current quote (get_stock_quote)
3. Get metrics if asked about fundamentals (get_stock_metrics)
4. Get news if asked about recent events (get_stock_news)
5. Use watchlist tool if user asks about their watchlist (get_watchlist)

Always fetch real-time data - don't make up prices or metrics."""),
                    MessagesPlaceholder(variable_name="chat_history"),
                    ("human", "{input}"),
                    MessagesPlaceholder(variable_name="agent_scratchpad"),
                ])
                
                agent = create_tool_calling_agent(self.llm_with_tools, self.tools, prompt)
                self.agent_executor = AgentExecutor(
                    agent=agent,
                    tools=self.tools,
                    verbose=True,
                    handle_parsing_errors=True,
                    max_iterations=5
                )
                print(f"Agent executor created with {len(self.tools)} tools")
            except Exception as e:
                print(f"Warning: Could not create agent executor: {e}")
                import traceback
                traceback.print_exc()
                self.agent_executor = None
    
    def _invoke_llm(self, messages: List, system_instruction: str = "") -> str:
        """Invoke LangChain LLM with messages"""
        if not self.llm:
            return "AI features require Gemini API key. Please configure it in environment variables."
        
        try:
            # Prepare messages for LangChain
            langchain_messages = []
            
            # Add system message if provided
            if system_instruction:
                langchain_messages.append(SystemMessage(content=system_instruction))
            
            # Add conversation messages
            for msg in messages:
                if isinstance(msg, dict):
                    if msg.get('role') == 'user':
                        langchain_messages.append(HumanMessage(content=msg.get('content', '')))
                    elif msg.get('role') == 'assistant':
                        langchain_messages.append(AIMessage(content=msg.get('content', '')))
                elif isinstance(msg, str):
                    langchain_messages.append(HumanMessage(content=msg))
            
            # Invoke LLM
            response = self.llm.invoke(langchain_messages)
            return response.content if hasattr(response, 'content') else str(response)
        except Exception as e:
            error_msg = str(e)
            print(f"Error invoking LLM: {error_msg}")
            return f"Error generating response: {error_msg}"
    
    def _generate_text(self, prompt: str, system_instruction: str = "") -> str:
        """Generate text using LangChain (backward compatibility)"""
        messages = [{"role": "user", "content": prompt}]
        return self._invoke_llm(messages, system_instruction)
    
    def generate_insight(self, symbol: str, quote_data: dict, metrics_data: dict = None, news_items: list = None, price_trend: str = "") -> dict:
        """Generate comprehensive AI-powered financial insight for a stock"""
        if not self.llm:
            return {
                "summary": f"{symbol} shows current price of ${quote_data.get('current_price', 0):.2f} with {quote_data.get('change_percent', 0):.2f}% change.",
                "key_points": [
                    f"Price: ${quote_data.get('current_price', 0):.2f}",
                    f"Change: {quote_data.get('change_percent', 0):.2f}%"
                ]
            }
        
        system_instruction = """You are a financial analyst. Provide concise, punchy insights - just 4-5 cool key points. Be brief, data-driven, and insightful."""
        
        # Build concise data context
        price_info = f"Price: ${quote_data.get('current_price', 0):.2f} ({quote_data.get('change_percent', 0):+.2f}%), Volume: {quote_data.get('volume', 0):,}"
        
        metrics_info = ""
        if metrics_data:
            key_metrics = []
            if metrics_data.get('pe_ratio'):
                key_metrics.append(f"P/E: {metrics_data.get('pe_ratio'):.2f}")
            if metrics_data.get('market_cap'):
                market_cap_str = f"${metrics_data.get('market_cap', 0):,.0f}"
                key_metrics.append(f"Market Cap: {market_cap_str}")
            if metrics_data.get('revenue_growth'):
                key_metrics.append(f"Revenue Growth: {metrics_data.get('revenue_growth', 0)*100:.1f}%")
            if key_metrics:
                metrics_info = ", ".join(key_metrics)
        
        news_info = ""
        if news_items and len(news_items) > 0:
            # Just mention if there's significant news
            top_news = news_items[0].get('title', '')
            if top_news:
                news_info = f"Recent news: {top_news[:100]}"
        
        prompt = f"""Generate exactly 4-5 concise, insightful bullet points about {symbol} stock.

Data:
- {price_info}
{f"- {metrics_info}" if metrics_info else ""}
{f"- {news_info}" if news_info else ""}
{f"- Trend: {price_trend}" if price_trend else ""}

Format as bullet points (• or -). Each point should be:
- One sentence max
- Data-driven and specific
- Insightful, not just stating facts
- Focus on what matters to investors

Example format:
• Stock is up 5% today on strong volume, indicating bullish momentum
• P/E ratio of 25 suggests growth expectations are high
• Recent product launch news could drive further gains
• Trading above key resistance level, technical breakout confirmed

Generate 4-5 points now:"""

        response_text = self._generate_text(prompt, system_instruction)
        
        # Extract bullet points from response
        key_points = []
        for line in response_text.split('\n'):
            line = line.strip()
            if line and (line.startswith('•') or line.startswith('-') or line.startswith('*') or line[0].isdigit()):
                # Remove bullet markers and numbers
                point = line.lstrip('•-*0123456789.) ').strip()
                if point and len(point) > 10:  # Filter out very short lines
                    key_points.append(point)
        
        # If no bullet points found, try to split by sentences and take first 4-5
        if not key_points:
            sentences = [s.strip() for s in response_text.replace('\n', ' ').split('.') if s.strip()]
            key_points = sentences[:5]
        
        # Fallback: create simple points from data
        if not key_points:
            key_points = [
                f"Trading at ${quote_data.get('current_price', 0):.2f} ({quote_data.get('change_percent', 0):+.2f}% today)",
                f"Volume: {quote_data.get('volume', 0):,} shares"
            ]
            if metrics_data and metrics_data.get('pe_ratio'):
                key_points.append(f"P/E Ratio: {metrics_data.get('pe_ratio'):.2f}")
            if quote_data.get('change_percent', 0) > 0:
                key_points.append("Showing positive momentum")
            else:
                key_points.append("Facing downward pressure")
        
        # Create a brief summary from key points
        summary = f"{symbol} insights: " + ". ".join(key_points[:2]) + "."
        
        return {
            "summary": summary,
            "key_points": key_points[:5]  # Limit to 5 key points
        }
    
    def analyze_company(self, symbol: str, metrics: dict, company_name: str = "") -> str:
        """Generate AI analysis of company fundamentals"""
        if not self.llm:
            return f"{symbol} fundamentals analysis: P/E ratio {metrics.get('pe_ratio', 'N/A')}, Market Cap ${metrics.get('market_cap', 0):,.0f}."
        
        system_instruction = "You are a financial analyst providing fundamental analysis."
        
        prompt = f"""Analyze the financial health of {company_name or symbol} based on these metrics:

- P/E Ratio: {metrics.get('pe_ratio', 'N/A')}
- EPS: {metrics.get('eps', 'N/A')}
- Market Cap: ${metrics.get('market_cap', 0):,.0f}
- Dividend Yield: {metrics.get('dividend_yield', 'N/A')}
- Profit Margin: {metrics.get('profit_margin', 'N/A')}
- Revenue Growth: {metrics.get('revenue_growth', 'N/A')}
- Price to Book: {metrics.get('price_to_book', 'N/A')}
- Debt to Equity: {metrics.get('debt_to_equity', 'N/A')}

Provide a 3-4 sentence analysis comparing these metrics to industry standards and assessing overall company health."""
        
        return self._generate_text(prompt, system_instruction)
    
    def summarize_conversation(self, messages: list) -> str:
        """Summarize conversation history for context"""
        if not self.llm or not messages:
            return ""
        
        # Format messages for summarization
        conversation_text = ""
        for msg in messages[-20:]:  # Last 20 messages
            role = "User" if msg.get('role') == 'user' else "Assistant"
            content = msg.get('content', '')
            conversation_text += f"{role}: {content}\n\n"
        
        system_instruction = "You are a conversation summarizer. Create a concise summary of the key topics, questions, and context discussed."
        
        prompt = f"""Summarize this conversation in 2-3 sentences, focusing on:
- Main topics discussed
- Key stocks or companies mentioned
- User's interests or questions
- Important context or preferences

Conversation:
{conversation_text}

Summary:"""
        
        try:
            summary = self._generate_text(prompt, system_instruction)
            return summary.strip()
        except Exception as e:
            print(f"Error summarizing conversation: {e}")
            return ""
    
    def chat_response_with_tools(self, user_message: str, memory: ConversationSummaryBufferMemory, watchlist_context: str = "") -> str:
        """Generate chatbot response using LangChain agent with tool calling and memory"""
        if not self.agent_executor:
            # Fallback to regular chat if agent not initialized
            return self.chat_response(user_message, context={}, conversation_history=[])
        
        try:
            # Build input with watchlist context if available
            input_text = user_message
            if watchlist_context:
                input_text = f"User's watchlist: {watchlist_context}\n\n{user_message}"
            
            # Invoke agent with memory
            # ConversationSummaryBufferMemory automatically manages the buffer and summary
            response = self.agent_executor.invoke({
                "input": input_text,
                "chat_history": memory.chat_memory.messages
            })
            
            # Update memory with user message and response
            # The memory will automatically summarize old messages if token limit is exceeded
            memory.chat_memory.add_user_message(user_message)
            memory.chat_memory.add_ai_message(response.get("output", ""))
            
            # The summary is automatically updated by ConversationSummaryBufferMemory
            # when the conversation exceeds max_token_limit
            
            return response.get("output", "I apologize, but I couldn't generate a response.")
        except Exception as e:
            error_msg = str(e)
            print(f"Error in chat_response_with_tools: {error_msg}")
            # Fallback to regular chat
            return self.chat_response(user_message, context={}, conversation_history=[])
    
    def chat_response(self, user_message: str, context: dict = None, conversation_history: list = None) -> str:
        """Generate chatbot response using LangChain with enhanced RAG context (fallback method)"""
        if not self.llm:
            return "AI features require Gemini API key. Please configure it in environment variables."
        
        # Build system message with context
        context_parts = []
        
        if context:
            watchlist = context.get('watchlist', [])
            detected_symbols = context.get('detected_symbols', [])
            symbol_data = context.get('symbol_data', {})
            conversation_summary = context.get('conversation_summary', None)
            
            # Add conversation summary if available
            if conversation_summary:
                context_parts.append(f"Previous Conversation Summary: {conversation_summary}")
            
            if watchlist:
                context_parts.append(f"User's Watchlist: {', '.join(watchlist)}")
            
            if detected_symbols:
                context_parts.append(f"Stocks mentioned in question: {', '.join(detected_symbols)}")
            
            # Add detailed data for detected symbols
            if symbol_data:
                for symbol, data in symbol_data.items():
                    symbol_info = [f"{symbol}:"]
                    
                    if 'quote' in data:
                        quote = data['quote']
                        symbol_info.append(f"Current Price: ${quote.get('current_price', 'N/A'):.2f}")
                        symbol_info.append(f"Change: {quote.get('change_percent', 0):.2f}%")
                    
                    if 'metrics' in data:
                        metrics = data['metrics']
                        if metrics.get('pe_ratio'):
                            symbol_info.append(f"P/E Ratio: {metrics['pe_ratio']:.2f}")
                        if metrics.get('market_cap'):
                            symbol_info.append(f"Market Cap: ${metrics['market_cap']:,.0f}")
                    
                    if 'health_score' in data:
                        symbol_info.append(f"Health Score: {data['health_score']:.1%}")
                    
                    if 'ai_summary' in data:
                        symbol_info.append(f"Analysis: {data['ai_summary']}")
                    
                    context_parts.append(" ".join(symbol_info))
        
        # Build system instruction
        system_content = """You are FinanceCopilot, a knowledgeable financial assistant. 
- Use the provided context data to give accurate, data-driven answers
- Reference specific numbers and metrics when available
- Maintain conversation continuity by referencing previous discussions when relevant
- Be conversational and helpful, not robotic
- IMPORTANT: Do NOT use markdown formatting (no **bold**, *italic*, or other markdown syntax). Write in plain text only."""
        
        if context_parts:
            system_content += "\n\nContext:\n" + "\n".join(f"- {part}" for part in context_parts)
        
        # Prepare messages for LangChain
        messages = []
        messages.append(SystemMessage(content=system_content))
        
        # Add conversation history (last 5 messages for context)
        if conversation_history:
            for msg in conversation_history[-5:]:
                role = msg.get('role', '')
                content = msg.get('content', '')
                if role == 'user':
                    messages.append(HumanMessage(content=content))
                elif role == 'assistant':
                    messages.append(AIMessage(content=content))
        
        # Add current user message
        messages.append(HumanMessage(content=user_message))
        
        # Invoke LangChain
        try:
            response = self.llm.invoke(messages)
            return response.content if hasattr(response, 'content') else str(response)
        except Exception as e:
            error_msg = str(e)
            print(f"Error in chat_response: {error_msg}")
            return f"Error generating response: {error_msg}"
