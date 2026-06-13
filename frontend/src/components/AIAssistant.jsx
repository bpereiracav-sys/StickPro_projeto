import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { aiApi } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '../components/ui/sheet';
import { toast } from 'sonner';
import {
  Send,
  Loader2,
  Bot,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { getInitials } from '../lib/utils';

const normalizeLanguage = (language) => {
  const value = (language || 'pt').toLowerCase();

  if (value.startsWith('en')) return 'en';
  if (value.startsWith('es')) return 'es';
  if (value.startsWith('fr')) return 'fr';
  if (value.startsWith('it')) return 'it';

  return 'pt';
};

const getCurrentLanguage = () => {
  return normalizeLanguage(
    localStorage.getItem('language') ||
    localStorage.getItem('i18nextLng') ||
    'pt'
  );
};

const getWelcomeMessage = (language, firstName) => {
  const name = firstName ? ` ${firstName}` : '';

  const messages = {
    pt: `Olá${name}! 👋

Sou o Assistente StickPro, estou aqui para te ajudar com:

• **Dúvidas sobre a app** - Como usar funcionalidades e resolver problemas
• **Hóquei em Patins** - Regras, táticas, equipamento e organização

O que posso ajudar-te hoje?`,

    en: `Hello${name}! 👋

I am the StickPro Assistant, here to help you with:

• **App questions** - How to use features and solve problems
• **Roller Hockey** - Rules, tactics, equipment and club organization

How can I help you today?`,

    es: `Hola${name}! 👋

Soy el Asistente StickPro, estoy aquí para ayudarte con:

• **Dudas sobre la app** - Cómo usar funcionalidades y resolver problemas
• **Hockey sobre patines** - Reglas, tácticas, equipamiento y organización

¿En qué puedo ayudarte hoy?`,

    fr: `Bonjour${name} ! 👋

Je suis l’Assistant StickPro, ici pour vous aider avec :

• **Questions sur l’application** - Utilisation des fonctionnalités et résolution de problèmes
• **Rink hockey** - Règles, tactique, équipement et organisation

Comment puis-je vous aider aujourd’hui ?`,

    it: `Ciao${name}! 👋

Sono l’Assistente StickPro, qui per aiutarti con:

• **Domande sull’app** - Come usare le funzionalità e risolvere problemi
• **Hockey su pista** - Regole, tattiche, attrezzatura e organizzazione

Come posso aiutarti oggi?`,
  };

  return messages[language] || messages.pt;
};

const getClearMessage = (language) => {
  const messages = {
    pt: 'Chat limpo! Como posso ajudar?',
    en: 'Chat cleared! How can I help?',
    es: '¡Chat borrado! ¿Cómo puedo ayudarte?',
    fr: 'Conversation effacée ! Comment puis-je vous aider ?',
    it: 'Chat cancellata! Come posso aiutarti?',
  };

  return messages[language] || messages.pt;
};

const getErrorMessage = (language) => {
  const messages = {
    pt: 'Desculpa, ocorreu um erro. Por favor, tenta novamente.',
    en: 'Sorry, an error occurred. Please try again.',
    es: 'Lo siento, ha ocurrido un error. Inténtalo de nuevo.',
    fr: 'Désolé, une erreur est survenue. Veuillez réessayer.',
    it: 'Mi dispiace, si è verificato un errore. Riprova.',
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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

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

      const errorMessage =
        error.response?.data?.detail || getErrorMessage(language);

      toast.error(errorMessage);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: getErrorMessage(language),
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = async () => {
    const language = getCurrentLanguage();

    if (sessionId) {
      try {
        await aiApi.clearHistory(sessionId);
      } catch (error) {
        console.error('Error clearing history:', error);
      }
    }

    setMessages([]);
    setSessionId(null);

    setTimeout(() => {
      setMessages([
        {
          role: 'assistant',
          content: getClearMessage(language),
          timestamp: new Date(),
        },
      ]);
    }, 100);
  };

  const formatMessage = (content) => {
    return content
      .split('\n')
      .map((line, i) => {
        const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        if (formattedLine.startsWith('• ') || formattedLine.startsWith('- ')) {
          return `<li key="${i}">${formattedLine.substring(2)}</li>`;
        }

        return formattedLine;
      })
      .join('<br />');
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
          size="icon"
          data-testid="ai-assistant-trigger"
        >
          <Sparkles className="w-6 h-6" />
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:w-[420px] flex flex-col p-0">
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

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onClick={clearChat}
            title="Limpar conversa"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea ref={scrollRef} className="flex-1 p-4">
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
                  <div className="flex items-center gap-1">
                    <span
                      className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

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
      </SheetContent>
    </Sheet>
  );
}

export default AIAssistant;
