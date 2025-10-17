"""
Example Python application with LLM calls for testing llm-inspector
"""

import openai
from anthropic import Anthropic
import requests

# OpenAI example
def generate_text():
    client = openai.OpenAI(api_key="sk-xxx")
    
    completion = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "user", "content": "Hello, how are you?"}
        ]
    )
    
    return completion.choices[0].message.content


# Anthropic example
def claude_chat():
    client = Anthropic(api_key="sk-ant-xxx")
    
    message = client.messages.create(
        model="claude-3-opus-20240229",
        max_tokens=1024,
        messages=[
            {"role": "user", "content": "Tell me a joke"}
        ]
    )
    
    return message.content


# Direct API call example
def direct_api_call():
    response = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        },
        json={
            "model": "gpt-3.5-turbo",
            "messages": [{"role": "user", "content": "Hello!"}]
        }
    )
    
    return response.json()


# LangChain example
from langchain.chat_models import ChatOpenAI
from langchain.schema import HumanMessage

def langchain_example():
    chat = ChatOpenAI(model="gpt-4")
    messages = [HumanMessage(content="Translate this to French: Hello")]
    response = chat(messages)
    return response.content

