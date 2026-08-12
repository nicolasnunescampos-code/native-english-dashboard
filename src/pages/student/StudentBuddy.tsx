import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Bot, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

const StudentBuddy = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("student_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }

    if (data) {
      setMessages(data as ChatMessage[]);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !user) return;

    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: inputValue.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Format messages for OpenAI API
      const apiMessages = [...messages, newMessage].map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Call our Supabase Edge Function
      const { data, error } = await supabase.functions.invoke("chat-buddy", {
        body: { messages: apiMessages },
      });

      if (error) throw error;

      if (data && data.content) {
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.content,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message to Native Buddy.",
        variant: "destructive",
      });
      // Remove the optimistic user message if failed
      setMessages((prev) => prev.filter((msg) => msg.id !== newMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 h-[calc(100vh-80px)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Bot className="w-8 h-8 text-indigo-600" />
          Native Buddy
        </h1>
        <p className="text-gray-500 mt-2">
          Practice your English, ask grammar questions, and get real-time feedback from your AI English tutor!
        </p>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 border shadow-lg overflow-hidden bg-white/50 dark:bg-black/20 backdrop-blur-sm">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 space-y-4">
              <Bot className="w-16 h-16 text-indigo-200" />
              <p>Say hello to start chatting in English!</p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl p-4 flex gap-3 ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-tr-sm"
                    : "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-tl-sm"
                }`}
              >
                {msg.role === "assistant" && <Bot className="w-5 h-5 shrink-0 mt-0.5" />}
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                {msg.role === "user" && <User className="w-5 h-5 shrink-0 mt-0.5 text-indigo-200" />}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm p-4 flex gap-2 items-center">
                <Bot className="w-5 h-5 text-gray-500" />
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>
        <div className="p-4 bg-gray-50 dark:bg-slate-900 border-t">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex gap-2"
          >
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message in English..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default StudentBuddy;
