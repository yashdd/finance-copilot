from typing import Optional, List, Dict, Any, Union
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage, ToolMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain.memory import ConversationBufferWindowMemory, ConversationSummaryBufferMemory
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


class GeminiLLMWrapper(BaseChatModel):
    """
    Wrapper for ChatGoogleGenerativeAI that ensures all messages are valid before sending to Gemini.
    
    This prevents "function_response.name: Name cannot be empty" errors by:
    1. Validating all ToolMessage objects have names
    2. Removing invalid ToolMessage objects that can't be fixed
    3. Logging all modifications for debugging
    """
    
    _llm: ChatGoogleGenerativeAI
    
    def __init__(self, llm: ChatGoogleGenerativeAI):
        super().__init__()
        self._llm = llm
    
    def _generate(self, messages: List[BaseMessage], stop: Optional[List[str]] = None, run_manager: Optional[Any] = None, **kwargs) -> ChatResult:
        """Override _generate to filter messages before sending to Gemini"""
        filtered_messages = _validate_and_fix_tool_messages(messages)
        return self._llm._generate(filtered_messages, stop=stop, run_manager=run_manager, **kwargs)
    
    @property
    def _llm_type(self) -> str:
        """Return the type of language model."""
        return "gemini_wrapper"
    
    def bind_tools(self, tools: List[Any], **kwargs):
        """Forward bind_tools to the underlying LLM - return directly without re-wrapping"""
        # Do NOT wrap the result again - return the bound LLM directly
        return self._llm.bind_tools(tools, **kwargs)
    
    def __getattr__(self, name):
        """Forward all other attributes to the underlying LLM"""
        return getattr(self._llm, name)
