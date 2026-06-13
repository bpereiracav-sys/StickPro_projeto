import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { aiApi } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { toast } from 'sonner';
import { Send, Loader2, Bot, Trash2, Sparkles, X } from 'lucide-react';
import { getInitials } from '../lib/utils';

const normalizeLanguage = (language) => {
  const value = (language || 'pt').toLowerCase();
  if (value.startsWith('en')) return 'en';
  if (value.startsWith('es')) return 'es';
  if (value.startsWith('fr')) return 'fr';
  if (value.startsWith('it')) return 'it';
  return 'pt';
};

const getCurrentLanguage = () =>
  normalizeLanguage(
    localStorage.getItem('language') ||
      localStorage.getItem('i18nextLng') ||
      'pt'
  );

const getWelcomeMessage = (language, firstName) => {
  const name = firstName ? ` ${firstName}` : '';

  const messages = {
    pt: `Olá${name}! 👋

Sou o Assistente StickPro. Posso ajudar-te com dúvidas sobre a app, gestão do clube e hóquei em patins.

O que posso ajudar-te hoje?`,
    en: `Hello${name}! 👋

I am the StickPro Assistant. I can help you with the app, club management and roller hockey.

How can I help you today?`,
    es: `Hola${name}! 👋

Soy el Asistente StickPro. Puedo ayudarte con la app, la gestión del club y el hockey sobre patines.

¿En qué puedo ayudarte hoy?`,
    fr: `Bonjour${name} ! 👋

Je suis l’Assistant StickPro. Je peux vous aider avec l’application, la gestion du club et le rink hockey.

Comment puis-je vous aider ?`,
    it: `Ciao${name}! 👋

Sono l’Assistente StickPro. Posso aiutarti con l’app, la gestione del club e l’hockey su pista.

Come posso aiutarti oggi?`,
  };

  return messages[language] || messages.pt;
};

export function AIAssistant() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      const language = getCurrentLanguage();
      const firstName = user?.name?.split(' ')[0] || '';

      setMessages([
        {
          role: 'assistant',
          content: getWelcomeMessage(language, firstName),
          timestamp: new Date(),
        },
      ]);
    }
  }, [open, user, messages.length]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const language = getCurrentLanguage();

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await aiApi.chat(
        userMessage.content,
        sessionId,
        language
      );

      if (response.data.session_id) {
        setSessionId(response.data.session_id);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.data.response,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error('AI Chat error:', error);
      toast.error(error.response?.data?.detail || 'Erro ao comunicar com o assistente');

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Desculpa, ocorreu um erro. Por favor, tenta novamente.',
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    if (sessionId) {
      try {
        await aiApi.clearHistory(sessionId);
      } catch (error) {
        console.error('Error clearing history:', error);
      }
    }

    setMessages([]);
    setSessionId(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessage = (content) =>
    content
      .split('\n')
      .map((line) => line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'))
      .join('<br />');
console.log('AI Assistant open:', open);
  
  return (
    <>
<Button
onClick={() => setOpen((prev) => !prev)}
  className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
  style={{ zIndex: 99999 }}
  size="icon"
  data-testid="ai-assistant-trigger"
>
        <Sparkles className="w-6 h-6" />
      </Button>

      {open && (
        <div
  className="fixed bottom-24 right-6 w-[420px] max-w-[calc(100vw-32px)] h-[620px] max-h-[calc(100vh-140px)] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
  style={{ zIndex: 99999 }}
>
          <div className="p-4 border-b border-border flex items-center justify-between bg-primary text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>

              <div>
                <h3 className="font-heading text-lg">Assistente StickPro</h3>
                <p className="text-xs text-primary-foreground/70">
                  Ajuda sobre a app e hóquei
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                onClick={clearChat}
                title="Limpar conversa"
              >
                <Trash2 className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => setOpen(false)}
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 ${
                    msg.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  ) : (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                        {getInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={`rounded-2xl px-4 py-2 max-w-[85%] ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : msg.isError
                        ? 'bg-destructive/10 text-destructive rounded-tl-sm'
                        : 'bg-muted rounded-tl-sm'
                    }`}
                  >
                    <div
                      className="text-sm whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                    />
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>

                  <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-border bg-background">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escreve a tua mensagem..."
                disabled={loading}
                className="flex-1"
                data-testid="ai-chat-input"
              />

              <Button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                size="icon"
                data-testid="ai-chat-send"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-2 text-center">
              Powered by AI • As respostas podem conter erros
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default AIAssistant;
