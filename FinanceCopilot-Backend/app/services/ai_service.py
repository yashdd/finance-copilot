from typing import Optional, List, Dict, Any, Union
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage, ToolMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain.memory import ConversationBufferWindowMemory
from langchain_core.callbacks import Callbacks, BaseCallbackHandler
from langchain_core.runnables import RunnablePassthrough, RunnableConfig
from langchain_core.language_models import BaseChatModel
from langchain_core.outputs import ChatResult
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


def _validate_and_fix_tool_messages(messages: List[BaseMessage]) -> List[BaseMessage]:
    """
    Validate and fix ToolMessage instances before sending to Gemini.
    
    STRICT RULES:
    1. Every ToolMessage MUST have a non-empty name
    2. If name cannot be inferred, REMOVE the ToolMessage (don't send to Gemini)
    3. Log all removals for debugging
    
    This prevents "function_response.name: Name cannot be empty" errors.
    """
    formatted_messages = []
    removed_count = 0
    
    for i, msg in enumerate(messages):
        if isinstance(msg, ToolMessage):
            # Check if ToolMessage has a valid name
            has_valid_name = hasattr(msg, 'name') and msg.name is not None and msg.name != ""
            
            if not has_valid_name:
                # Try to infer tool name from previous AIMessage
                tool_name = None
                for prev_msg in reversed(formatted_messages):
                    if isinstance(prev_msg, AIMessage) and hasattr(prev_msg, 'tool_calls') and prev_msg.tool_calls:
                        # Get the tool name from the most recent tool call
                        tool_name = prev_msg.tool_calls[0].get('name', None)
                        if tool_name:
                            break
                
                if tool_name:
                    # Successfully inferred name
                    msg.name = tool_name
                    formatted_messages.append(msg)
                    print(f"[GEMINI_FILTER] Fixed ToolMessage at index {i} by inferring name: {tool_name}", flush=True)
                else:
                    # Cannot infer name - REMOVE this message to prevent Gemini error
                    removed_count += 1
                    print(f"[GEMINI_FILTER] REMOVED ToolMessage at index {i} - no valid name and cannot infer", flush=True)
                    print(f"[GEMINI_FILTER] Message content preview: {str(msg)[:200]}", flush=True)
                    # Skip adding this message
                    continue
            else:
                # Name is valid, keep the message
                formatted_messages.append(msg)
        else:
            # Not a ToolMessage, keep as-is
            formatted_messages.append(msg)
    
    if removed_count > 0:
        print(f"[GEMINI_FILTER] Removed {removed_count} invalid ToolMessage(s) from batch", flush=True)
    
    return formatted_messages



class ValidatingLLM:
    """Wraps ChatGoogleGenerativeAI to validate and fix messages before sending."""
    
    def __init__(self, llm: ChatGoogleGenerativeAI):
        self._llm = llm
    
    def _filter_messages(self, messages):
        """Filter messages if it's a list of BaseMessage"""
        if isinstance(messages, list) and len(messages) > 0 and isinstance(messages[0], BaseMessage):
            return _validate_and_fix_tool_messages(messages)
        return messages
    
    def invoke(self, messages, **kwargs):
        """Validate messages and invoke LLM"""
        filtered = self._filter_messages(messages)
        return self._llm.invoke(filtered, **kwargs)
    
    def stream(self, messages, **kwargs):
        """Validate messages and stream from LLM"""
        filtered = self._filter_messages(messages)
        return self._llm.stream(filtered, **kwargs)
    
    def bind_tools(self, tools, **kwargs):
        """Bind tools directly to underlying LLM"""
        return self._llm.bind_tools(tools, **kwargs)
    
    def __getattr__(self, name):
        """Forward other attributes to underlying LLM"""
        return getattr(self._llm, name)

class AIService:
    def __init__(self):
        self.llm = None
        self.model_name = None
        self.tools = []
        self.agent_executor = None
        self.last_error: Optional[str] = None
        
        if settings.gemini_api_key:
            # First, try to detect available models and use the best one
            available_model = self._get_available_model()
            if available_model:
                try:
                    base_llm = ChatGoogleGenerativeAI(
                        model=available_model,
                        google_api_key=settings.gemini_api_key,
                        temperature=0.7,
                        top_p=0.8,
                        top_k=40,
                    )
                    # Using direct ChatGoogleGenerativeAI
                    self.llm = ValidatingLLM(base_llm)
                    self.model_name = available_model
                    print(f"LangChain initialized with {available_model} ")
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
                        base_llm = ChatGoogleGenerativeAI(
                            model=model_name,
                            google_api_key=settings.gemini_api_key,
                            temperature=0.7,
                            top_p=0.8,
                            top_k=40,
                        )
                        # Using direct ChatGoogleGenerativeAI
                        self.llm = ValidatingLLM(base_llm)
                        self.model_name = model_name
                        print(f"LangChain initialized with {model_name} ")
                        break
                    except Exception as e:
                        print(f"Failed to initialize {model_name}: {e}")
                        continue
                
                if not self.llm:
                    print("Warning: Could not initialize any Gemini model")
        else:
            print("Warning: GEMINI_API_KEY not found in environment variables")

    def _try_init_llm(self, model_name: str) -> bool:
        """Try to initialize Gemini LLM with the given model name."""
        try:
            base_llm = ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=settings.gemini_api_key,
                temperature=0.7,
                top_p=0.8,
                top_k=40,
            )
            print(f"[AI_SERVICE] Creating ValidatingLLM wrapper...", flush=True)
            self.llm = ValidatingLLM(base_llm)
            print(f"[AI_SERVICE] ValidatingLLM created: {self.llm}", flush=True)
            print(f"[AI_SERVICE] ValidatingLLM._llm: {getattr(self.llm, '_llm', 'NOT SET')}", flush=True)
            self.model_name = model_name
            print(f"[AI_SERVICE] LangChain initialized with {model_name}")
            self.last_error = None
            return True
        except Exception as e:
            import traceback
            print(f"[AI_SERVICE] Failed to initialize {model_name}: {e}", flush=True)
            print(f"[AI_SERVICE] Traceback: {traceback.format_exc()}", flush=True)
            self.last_error = str(e)
            return False

    def _ensure_llm_initialized(self) -> bool:
        """Ensure LLM is initialized; attempt re-init with preferred models if needed."""
        if self.llm:
            return True
        if not settings.gemini_api_key:
            print("[AI_SERVICE] GEMINI_API_KEY missing; cannot initialize LLM")
            self.last_error = "GEMINI_API_KEY missing"
            return False

        preferred_models = [
            "gemini-1.5-flash-latest",
            "gemini-1.5-pro-latest",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-pro",
        ]

        available_model = self._get_available_model()
        if available_model and self._try_init_llm(available_model):
            return True

        for candidate in preferred_models:
            if self._try_init_llm(candidate):
                return True

        print("[AI_SERVICE] Unable to initialize any Gemini model")
        if not self.last_error:
            self.last_error = "Unable to initialize any Gemini model"
        return False
    
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
    
    def set_tools(self, tools: List) -> bool:
        """Set tools for the agent. Returns True on success."""
        print(f"[AI_SERVICE] set_tools called with {len(tools)} tools", flush=True)
        if not self._ensure_llm_initialized():
            print(f"[AI_SERVICE] LLM not initialized; aborting set_tools", flush=True)
            return False
        print(f"[AI_SERVICE] LLM available: {self.llm is not None}", flush=True)
        
        self.tools = tools
        if self.tools:
            try:
                print(f"[AI_SERVICE] Binding tools to LLM...", flush=True)
                # Bind tools to LLM
                self.llm_with_tools = self.llm.bind_tools(self.tools)
                print(f"[AI_SERVICE] Tools bound successfully", flush=True)
                
                # Create agent with tool calling
                prompt = ChatPromptTemplate.from_messages([
                    ("system", """You are FinanceCopilot, an intelligent and proactive financial assistant with autonomous capabilities.

CORE PRINCIPLES:
- Always use tools to fetch REAL-TIME data - never make up prices, metrics, or data
- Be proactive: If user asks about a stock, automatically fetch quote, metrics, and recent news
- Plan multi-step tasks: Break down complex requests into sequential tool calls
- Reference specific numbers and metrics when available
- Maintain conversation continuity and context
- Be conversational and helpful, not robotic
- You may share non-personalized, data-backed ideas (e.g., recent top movers or strong profitability) with a brief "not investment advice" disclaimer. Avoid refusing; provide balanced pros/cons and suggest verifying details.
- IMPORTANT: Do NOT use markdown formatting. Write in plain text only.

CRITICAL TOOL USAGE RULES:
WARNING: NEVER respond with tool outputs unless you explicitly called that tool
WARNING: NEVER fabricate function_response messages
WARNING: ONLY return function responses after YOU called the function
WARNING: If you want to call a tool, use proper tool_calls - don't fake responses

TOOL USAGE STRATEGY:
When a user asks about a stock:
1. If symbol is unclear, search for it (search_stock_symbols)
2. Always get current quote (get_stock_quote) - this is essential
3. Get metrics for fundamental analysis (get_stock_metrics)
4. Get recent news for context (get_stock_news)
5. Use historical data (get_stock_candles) for trend analysis

WATCHLIST MANAGEMENT:
- Use get_watchlist to see user's current stocks
- If user says "add [symbol]", "add [symbol] to watchlist", or similar commands, IMMEDIATELY use add_to_watchlist tool
- Examples: "add aapl", "add AAPL", "add apple", "add TSLA to watchlist" → Call add_to_watchlist
- If user says "remove [symbol]" or "delete [symbol]", use remove_from_watchlist tool
- If user mentions a stock they're interested in, proactively offer to add it to watchlist
- Always confirm when you successfully add or remove a stock

COMPARISON & ANALYSIS:
- Use compare_stocks to compare two stocks side-by-side
- Analyze trends using historical candles data
- Provide insights based on real data, not assumptions

AUTONOMOUS BEHAVIOR:
- If user asks "what's in my watchlist?", automatically call get_watchlist
- If user mentions a stock they're interested in, offer to add it to watchlist
- If comparing stocks, use compare_stocks tool
- Always verify data with tools before making claims

ERROR HANDLING:
- If a tool fails, try alternative approaches
- If symbol not found, suggest using search_stock_symbols
- Be transparent about errors and limitations

Remember: You have access to real-time financial data. Use it extensively to provide accurate, data-driven insights."""),
                    MessagesPlaceholder(variable_name="chat_history"),
                    ("human", "{input}"),
                    MessagesPlaceholder(variable_name="agent_scratchpad"),
                ])
                
                print(f"[AI_SERVICE] Creating tool calling agent...", flush=True)
                agent = create_tool_calling_agent(self.llm_with_tools, self.tools, prompt)
                print(f"[AI_SERVICE] Agent created successfully", flush=True)
                
                self.agent_executor = AgentExecutor(
                    agent=agent,
                    tools=self.tools,
                    verbose=True,
                    handle_parsing_errors=True,
                    max_iterations=8,  # Increased for multi-step reasoning
                    max_execution_time=30,  # 30 second timeout
                    return_intermediate_steps=False
                )
                print(f"[AI_SERVICE] Agent executor created with {len(self.tools)} tools", flush=True)
                self.last_error = None
                return True
            except Exception as e:
                import traceback
                error_trace = traceback.format_exc()
                print(f"[AI_SERVICE] Error creating agent executor: {e}", flush=True)
                print(f"[AI_SERVICE] Traceback:\n{error_trace}", flush=True)
                self.agent_executor = None
                self.last_error = str(e)
                return False
        else:
            print(f"[AI_SERVICE] No tools provided", flush=True)
            self.last_error = "No tools provided"
            return False
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
        
        system_instruction = """You are a financial analyst. Provide concise, punchy insights - just 5 cool key points. Be brief, data-driven, and insightful."""
        
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
        
        prompt = f"""Generate exactly 5 concise, insightful bullet points about {symbol} stock.

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
• Strong earnings growth trajectory supports current valuation

Generate exactly 5 points now:"""

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
        
        # Track which metrics are missing to steer the model away from refusing to answer
        missing_fields = [k for k, v in metrics.items() if v in (None, "N/A", "")]
        system_instruction = (
            "You are a financial analyst providing concise, decision-ready fundamental analysis. "
            "Even if some metrics are missing, give a best-effort, data-informed view using available metrics, typical industry ranges, and risk flags. "
            "Never say analysis is impossible; acknowledge gaps briefly and suggest what to check next. Limit to 4-6 sentences and end with two short action items."
        )
        
        missing_note = ""
        if missing_fields:
            missing_note = f"Some metrics are missing: {', '.join(missing_fields)}. Use typical benchmarks to fill gaps and still provide an assessment."
        
        prompt = f"""Analyze the financial health of {company_name or symbol} based on these metrics:

- P/E Ratio: {metrics.get('pe_ratio', 'N/A')}
- EPS: {metrics.get('eps', 'N/A')}
- Market Cap: ${metrics.get('market_cap', 0):,.0f}
- Dividend Yield: {metrics.get('dividend_yield', 'N/A')}
- Profit Margin: {metrics.get('profit_margin', 'N/A')}
- Revenue Growth: {metrics.get('revenue_growth', 'N/A')}
- Price to Book: {metrics.get('price_to_book', 'N/A')}
- Debt to Equity: {metrics.get('debt_to_equity', 'N/A')}

{missing_note}
Provide a concise assessment covering valuation, profitability, growth momentum, balance sheet leverage, and key risks. End with two short action recommendations (e.g., metrics to monitor, peers to compare, or data to gather)."""
        
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
    
    def chat_response_with_tools(self, user_message: str, memory, watchlist_context: str = "") -> str:
        """Generate chatbot response using LangChain agent with tool calling and memory"""
        print(f"[AI_SERVICE] chat_response_with_tools called", flush=True)
        print(f"[AI_SERVICE] Agent executor exists: {self.agent_executor is not None}", flush=True)
        print(f"[AI_SERVICE] LLM exists: {self.llm is not None}", flush=True)
        
        if not self.agent_executor:
            print(f"[AI_SERVICE] Agent executor not initialized, falling back to regular chat", flush=True)
            # Fallback to regular chat if agent not initialized
            return self.chat_response(user_message, context={}, conversation_history=[])
        
        try:
            # Build input with watchlist context if available
            input_text = user_message
            if watchlist_context:
                input_text = f"User's watchlist: {watchlist_context}\n\n{user_message}"
            
            print(f"[AI_SERVICE] Invoking agent executor...", flush=True)
            # The GeminiLLMWrapper will automatically validate and fix messages
            # No need to manually format here
            response = self.agent_executor.invoke({
                "input": input_text,
                "chat_history": memory.chat_memory.messages
            })
            
            print(f"[AI_SERVICE] Agent response received", flush=True)
            output = response.get("output", "I apologize, but I couldn't generate a response.")
            print(f"[AI_SERVICE] Output length: {len(output)}", flush=True)
            
            # Update memory with user message and response
            memory.chat_memory.add_user_message(user_message)
            memory.chat_memory.add_ai_message(output)
            
            return output
        except Exception as e:
            import traceback
            error_msg = str(e)
            error_trace = traceback.format_exc()
            print(f"[AI_SERVICE] Error in chat_response_with_tools: {error_msg}", flush=True)
            print(f"[AI_SERVICE] Traceback:\n{error_trace}", flush=True)
            
            # Check for quota/rate limit errors
            if "429" in error_msg or "quota" in error_msg.lower() or "exceeded" in error_msg.lower():
                return "I apologize, but I've reached my API quota limit. Please check your Gemini API billing plan or try again later. For now, you can still use the watchlist and stock data features."
            
            # Fallback to regular chat
            print(f"[AI_SERVICE] Falling back to regular chat...", flush=True)
            try:
                return self.chat_response(user_message, context={}, conversation_history=[])
            except Exception as fallback_error:
                fallback_msg = str(fallback_error)
                if "429" in fallback_msg or "quota" in fallback_msg.lower() or "exceeded" in fallback_msg.lower():
                    return "I apologize, but I've reached my API quota limit. Please check your Gemini API billing plan or try again later."
                return f"I encountered an error: {fallback_msg}. Please try again later."
    
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
    - Offer non-personalized, data-backed ideas (e.g., notable gainers, profitability leaders) when asked; include a short "not investment advice" disclaimer and balanced risks.
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
            print(f"[AI_SERVICE] Error in chat_response: {error_msg}", flush=True)
            
            # Check for quota/rate limit errors
            if "429" in error_msg or "quota" in error_msg.lower() or "exceeded" in error_msg.lower():
                return "I apologize, but I've reached my API quota limit. Please check your Gemini API billing plan or try again later. You can still use watchlist and stock data features."
            
            return f"Error generating response: {error_msg}"







