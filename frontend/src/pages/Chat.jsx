import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { messagesApi, teamsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { ScrollArea } from '../components/ui/scroll-area';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { Send, MessageSquare, Users } from 'lucide-react';
import { getInitials, formatTime } from '../lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function Chat() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    fetchTeams();
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      fetchMessages();
      // Poll for new messages every 5 seconds
      pollIntervalRef.current = setInterval(fetchMessages, 5000);
      return () => clearInterval(pollIntervalRef.current);
    }
  }, [selectedTeam]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchTeams = async () => {
    try {
      const response = await teamsApi.getAll();
      setTeams(response.data);
      if (response.data.length > 0) {
        setSelectedTeam(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast.error('Erro ao carregar equipas');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedTeam) return;
    try {
      const response = await messagesApi.getByTeam(selectedTeam.id, 100);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTeam) return;

    setSending(true);
    try {
      await messagesApi.send({
        team_id: selectedTeam.id,
        content: newMessage.trim()
      });
      setNewMessage('');
      fetchMessages();
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageDate = (date) => {
    const d = new Date(date);
    if (isToday(d)) return 'Hoje';
    if (isYesterday(d)) return 'Ontem';
    return format(d, "d 'de' MMMM", { locale: pt });
  };

  const groupMessagesByDate = (msgs) => {
    const groups = {};
    msgs.forEach(msg => {
      const dateKey = formatMessageDate(msg.created_at);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(msg);
    });
    return groups;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
          <Skeleton className="h-full" />
          <Skeleton className="h-full lg:col-span-3" />
        </div>
      </div>
    );
  }

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="space-y-6" data-testid="chat-page">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl lg:text-4xl text-foreground tracking-wide">MENSAGENS</h1>
        <p className="text-muted-foreground mt-1">Comunique com a sua equipa</p>
      </div>

      {teams.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-300px)]">
            {/* Teams List */}
            <Card className="border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-lg tracking-wide">EQUIPAS</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="space-y-1">
                  {teams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => setSelectedTeam(team)}
                      className={`w-full flex items-center gap-3 p-3 rounded-sm transition-colors text-left ${
                        selectedTeam?.id === team.id 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted'
                      }`}
                      data-testid={`team-chat-${team.id}`}
                    >
                      <div className={`w-10 h-10 rounded-sm flex items-center justify-center ${
                        selectedTeam?.id === team.id ? 'bg-white/20' : 'bg-primary/10'
                      }`}>
                        <Users className={`w-5 h-5 ${selectedTeam?.id === team.id ? 'text-white' : 'text-primary'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{team.name}</p>
                        <p className={`text-xs truncate ${selectedTeam?.id === team.id ? 'text-white/70' : 'text-muted-foreground'}`}>
                          {team.category}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Chat Area */}
            <Card className="border border-border lg:col-span-3 flex flex-col">
              {selectedTeam ? (
                <>
                  <CardHeader className="border-b border-border py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-sm flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="font-heading text-xl tracking-wide">
                          {selectedTeam.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">{selectedTeam.category}</p>
                      </div>
                    </div>
                  </CardHeader>

                  <ScrollArea className="flex-1 p-4">
                    {messages.length > 0 ? (
                      <div className="space-y-6">
                        {Object.entries(groupedMessages).map(([date, msgs]) => (
                          <div key={date}>
                            <div className="flex items-center gap-4 my-4">
                              <div className="flex-1 h-px bg-border" />
                              <span className="text-xs text-muted-foreground font-medium">{date}</span>
                              <div className="flex-1 h-px bg-border" />
                            </div>
                            <div className="space-y-3">
                              {msgs.map(msg => {
                                const isOwn = msg.sender_id === user?.id;
                                return (
                                  <div 
                                    key={msg.id}
                                    className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
                                    data-testid={`message-${msg.id}`}
                                  >
                                    {!isOwn && (
                                      <Avatar className="w-8 h-8">
                                        <AvatarFallback className="text-xs bg-muted">
                                          {getInitials(msg.sender_name)}
                                        </AvatarFallback>
                                      </Avatar>
                                    )}
                                    <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                                      {!isOwn && (
                                        <p className="text-xs text-muted-foreground mb-1 ml-1">
                                          {msg.sender_name}
                                        </p>
                                      )}
                                      <div className={`px-4 py-2 ${isOwn ? 'chat-bubble-sent' : 'chat-bubble-received'}`}>
                                        <p className="text-sm">{msg.content}</p>
                                      </div>
                                      <p className={`text-xs text-muted-foreground mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                                        {formatTime(msg.created_at)}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    ) : (
                      <div className="empty-state h-full flex items-center justify-center">
                        <div className="text-center">
                          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-muted-foreground">Sem mensagens ainda</p>
                          <p className="text-sm text-muted-foreground">Seja o primeiro a enviar!</p>
                        </div>
                      </div>
                    )}
                  </ScrollArea>

                  <div className="p-4 border-t border-border">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input
                        placeholder="Escreva uma mensagem..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1"
                        disabled={sending}
                        data-testid="message-input"
                      />
                      <Button 
                        type="submit" 
                        disabled={sending || !newMessage.trim()}
                        data-testid="send-message-btn"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Selecione uma equipa para começar</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        ) : (
          <div className="empty-state py-16">
            <MessageSquare className="empty-state-icon" />
            <h3 className="font-heading text-2xl text-foreground tracking-wide mb-2">
              SEM EQUIPAS
            </h3>
            <p className="text-muted-foreground">
              Precisa de pertencer a uma equipa para usar o chat
            </p>
          </div>
        )}
    </div>
  );
}
